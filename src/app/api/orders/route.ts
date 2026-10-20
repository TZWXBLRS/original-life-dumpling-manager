import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";
import {
  calculatePrice,
  type CartItem,
} from "@/lib/pricing";
import { queryDeliveryETA } from "@/lib/delivery";
import { beijingDayStart, beijingDayKey } from "@/lib/time";
import { notifyNewOrder } from "@/lib/notify";

/**
 * 创建订单 API
 * POST /api/orders
 * body: {
 *   items: CartItem[],
 *   deliveryType: 'PICKUP' | 'DELIVERY' | 'EXPRESS',
 *   deliveryDate: 'YYYY-MM-DD', // 自取日期 / 发货日期（三种配送方式都必填）
 *   address?: { province, city, district, detail, name, phone },
 *   pickupSlot?: string,        // 自取时段（仅 PICKUP）
 *   customerAckRisk?: boolean,  // 顾客是否确认快递超时风险
 *   note?: string,              // 订单备注
 * }
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  try {
    const body = await req.json();

    // 基本参数校验
    const schema = z.object({
      items: z.array(
        z.object({
          productId: z.string().min(1),
          productName: z.string().min(1),
          category: z.enum(["CLASSIC", "SPECIALTY"]),
          quantity: z.number().int().min(1),
          unitPrice: z.number().int().min(1),
        })
      ),
      deliveryType: z.enum(["PICKUP", "DELIVERY", "EXPRESS"]),
      deliveryDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "日期格式不正确"),
      address: z
        .object({
          province: z.string().min(1),
          city: z.string().min(1),
          district: z.string().min(1),
          detail: z.string().min(1),
          name: z.string().min(1),
          phone: z.string().min(1),
        })
        .optional(),
      pickupSlot: z.string().optional(),
      customerAckRisk: z.boolean().default(false),
      note: z.string().max(500).optional(),
    });
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "参数错误：" + parsed.error.issues[0].message },
        { status: 400 }
      );
    }
    const { items, deliveryType, deliveryDate, address, pickupSlot, customerAckRisk, note } =
      parsed.data;

    if (items.length === 0) {
      return NextResponse.json({ error: "购物车为空" }, { status: 400 });
    }

    // 配送地址校验
    if ((deliveryType === "DELIVERY" || deliveryType === "EXPRESS") && !address) {
      return NextResponse.json(
        { error: "快递/闪送请填写收货地址" },
        { status: 400 }
      );
    }
    if (deliveryType === "PICKUP" && !pickupSlot) {
      return NextResponse.json(
        { error: "自取请选择自取时段" },
        { status: 400 }
      );
    }

    // 履约日期不能早于今天（按北京时间自然日比较）
    const todayBeijing = beijingDayKey(new Date());
    if (deliveryDate < todayBeijing) {
      return NextResponse.json(
        { error: "不能选择过去的日期，请重新选择" },
        { status: 400 }
      );
    }

    // ============== 库存校验 & 定价计算 ==============
    const productIds = items.map((i) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, stock: true, name: true, unitPrice: true, category: true },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));
    for (const it of items) {
      const p = productMap.get(it.productId);
      if (!p) {
        return NextResponse.json(
          { error: `商品不存在：${it.productName}` },
          { status: 400 }
        );
      }
      if (p.stock < it.quantity) {
        return NextResponse.json(
          {
            error: `「${it.productName}」库存不足，只剩 ${p.stock} 盒（你选了 ${it.quantity} 盒）`,
          },
          { status: 400 }
        );
      }
      // 防止顾客提交的单价和库存类别和后台不一致
      if (p.unitPrice !== it.unitPrice || p.category !== it.category) {
        return NextResponse.json(
          { error: "商品信息已变更，请刷新购物车重试" },
          { status: 400 }
        );
      }
    }

    // 每日销量上限校验（「今日」按北京时间自然日，Cloudflare 运行时本地时区为 UTC）
    const todayStart = beijingDayStart();
    const todayOrders = await prisma.order.aggregate({
      where: {
        createdAt: { gte: todayStart },
        status: { not: "CANCELLED" },
      },
      _sum: { totalBoxes: true },
    });
    const dailyLimit = Number(
      (await prisma.systemConfig.findUnique({ where: { key: "DAILY_LIMIT" } }))
        ?.value ?? "700"
    );
    const todaySold = todayOrders._sum.totalBoxes ?? 0;
    const totalBoxes = items.reduce((s, i) => s + i.quantity, 0);
    if (todaySold + totalBoxes > dailyLimit) {
      return NextResponse.json(
        {
          error: `今日已售出 ${todaySold} 盒，只剩 ${Math.max(
            0,
            dailyLimit - todaySold
          )} 盒额度，请减少数量或明日再来`,
        },
        { status: 400 }
      );
    }

    // 计算定价（和前台展示一致）
    const pricing = calculatePrice(
      items as CartItem[],
      deliveryType as "PICKUP" | "DELIVERY" | "EXPRESS"
    );

    // ============== 快递时效校验 ==============
    // plannedShipDate：快递/闪送用顾客选择的发货日期（当天 18:00 发货窗口）；
    // 自取用顾客选择的自取日期 + 时段起点作为 pickupTime。
    let plannedShipDate: Date | null = null;
    let deliveryETA: Date | null = null;
    let pickupTime: Date | null = null;

    if (deliveryType === "PICKUP") {
      // 自取：把「日期 + 时段起点」组合成精确的自取时间
      const slotStart = (pickupSlot || "09:30-11:30").split("-")[0]; // "09:30"
      pickupTime = new Date(`${deliveryDate}T${slotStart}:00+08:00`);
    } else {
      // 快递 / 闪送：发货日期当天的发货窗口（18:00）
      plannedShipDate = new Date(`${deliveryDate}T18:00:00+08:00`);
    }

    if (deliveryType === "DELIVERY") {
      // 快递时效风险（按顾客选择的发货日期计算）
      const eta = queryDeliveryETA({
        province: address!.province,
        city: address!.city,
        shipDate: plannedShipDate!,
      });
      if (!eta.supported) {
        return NextResponse.json(
          { error: "该地区暂不支持快递配送，请选自取或闪送" },
          { status: 400 }
        );
      }
      if (eta.recommendCancel && !customerAckRisk) {
        return NextResponse.json(
          {
            error:
              "快递预计" +
              eta.deliveryDays +
              "天送达（在途" +
              eta.nightsInTransit +
              "晚），存在变质风险。请勾选风险确认后再下单或改用自取/闪送",
          },
          { status: 400 }
        );
      }
      deliveryETA = eta.estimatedArrival;
    }

    // ============== 事务写入：创建订单 + 扣库存 + 写日志 ==============
    const orderNo = "DMP" + Date.now() + Math.floor(Math.random() * 1000);

    // 自取订单生成6位取货码
    const pickupCode =
      deliveryType === "PICKUP"
        ? String(Math.floor(100000 + Math.random() * 900000))
        : null;

    const result = await prisma.$transaction(async (tx) => {
      // 1. 扣减库存
      for (const it of items) {
        const beforeStock = productMap.get(it.productId)!.stock;
        const updated = await tx.product.updateMany({
          where: {
            id: it.productId,
            stock: { gte: it.quantity },
          },
          data: { stock: { decrement: it.quantity } },
        });
        if (updated.count === 0) {
          throw new Error(`「${it.productName}」库存不足，请刷新重试`);
        }

        // 2. 写库存变动日志
        await tx.inventoryLog.create({
          data: {
            productId: it.productId,
            type: "DECREASE",
            quantity: -it.quantity,
            beforeStock,
            afterStock: beforeStock - it.quantity,
            remark: "顾客下单",
            operatorId: session!.user!.id,
          },
        });
      }

      // 3. 创建订单
      const order = await tx.order.create({
        data: {
          orderNo,
          userId: session!.user!.id,
          deliveryType,
          status: "PENDING_PAYMENT", // 待支付
          totalAmount: pricing.totalAmount,
          goodsAmount: pricing.totalAmount - pricing.foamBoxAmount,
          totalBoxes,
          classicBoxes: pricing.classicBoxes,
          specialtyBoxes: pricing.specialtyBoxes,
          foamBoxCount: pricing.foamBoxCount,
          foamBoxAmount: pricing.foamBoxAmount,
          pricingBreakdown: JSON.stringify(pricing.breakdown),
          // 地址
          receiverName: address?.name ?? null,
          receiverPhone: address?.phone ?? null,
          receiverProvince: address?.province ?? null,
          receiverCity: address?.city ?? null,
          receiverDistrict: address?.district ?? null,
          receiverAddress: address?.detail ?? null,
          // 自取
          pickupSlot: pickupSlot ?? null,
          pickupTime,
          pickupCode: deliveryType === "PICKUP" ? pickupCode : null,
          // 快递发货相关
          plannedShipDate,
          deliveryETA,
          customerAckRisk,
          note: note ?? null,
        },
      });

      // 4. 写订单明细
      const orderItems = items.map((it) => ({
        orderId: order.id,
        productId: it.productId,
        productName: it.productName,
        category: it.category,
        unitPrice: it.unitPrice,
        quantity: it.quantity,
        subtotal: it.unitPrice * it.quantity,
      }));
      await tx.orderItem.createMany({ data: orderItems });

      return { order, orderItems };
    });

    // 异步推送新订单通知到企业微信群（fire-and-forget，不阻塞下单响应）
    notifyNewOrder({
      orderNo: result.order.orderNo,
      deliveryType,
      deliveryDate,
      pickupSlot: result.order.pickupSlot,
      totalBoxes: result.order.totalBoxes,
      totalAmount: result.order.totalAmount,
      receiverName: result.order.receiverName,
      receiverPhone: result.order.receiverPhone,
      receiverAddress: result.order.receiverAddress
        ? [
            result.order.receiverProvince,
            result.order.receiverCity,
            result.order.receiverDistrict,
            result.order.receiverAddress,
          ]
            .filter(Boolean)
            .join(" ")
        : null,
      note: result.order.note,
      items: result.orderItems.map((it) => ({
        name: it.productName,
        quantity: it.quantity,
        category: it.category,
      })),
    });

    return NextResponse.json({
      ok: true,
      orderId: result.order.id,
      orderNo: result.order.orderNo,
      totalAmount: result.order.totalAmount,
      pickupCode: result.order.pickupCode,
      // 支付链接占位（后续接入真实支付）
      payUrl: "/orders?paid=1",
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "下单失败，请稍后重试" },
      { status: 500 }
    );
  }
}
