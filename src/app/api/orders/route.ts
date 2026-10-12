import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";
import {
  calculatePrice,
  type CartItem,
} from "@/lib/pricing";
import {
  checkOrderFrozenStatus,
  getNextDeliveryWindow,
} from "@/lib/frozen-check";
import { queryDeliveryETA } from "@/lib/delivery";
import { availableStock, INVENTORY_LOG_TYPE } from "@/lib/inventory";
import { cleanupExpiredOrders, PENDING_PAYMENT_TIMEOUT_MS } from "@/lib/order-cleanup";

/**
 * 创建订单 API
 * POST /api/orders
 * body: {
 *   items: CartItem[],
 *   deliveryType: 'PICKUP' | 'DELIVERY' | 'EXPRESS',
 *   address?: { province, city, district, detail, name, phone },
 *   pickupSlot?: string,        // 自取时段
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
    const { items, deliveryType, address, pickupSlot, customerAckRisk, note } =
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

    // ============== 库存校验 & 定价计算 ==============
    // 先清理超时未支付订单，释放被占用的锁定库存（惰性清理）
    await cleanupExpiredOrders();

    const productIds = items.map((i) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, stock: true, lockedStock: true, lastFrozenAt: true, name: true, unitPrice: true, category: true },
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
      // 可售库存 = 实际库存 - 锁定库存
      const avail = availableStock(p.stock, p.lockedStock);
      if (avail < it.quantity) {
        return NextResponse.json(
          {
            error: `「${it.productName}」库存不足，只剩 ${avail} 盒（你选了 ${it.quantity} 盒）`,
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

    // 每日销量上限校验：未取消订单（含待支付锁定）都占用当日额度
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayOrders = await prisma.order.aggregate({
      where: {
        createdAt: { gte: todayStart },
        status: { not: "CANCELLED" },
      },
      _sum: { totalBoxes: true },
    });
    const dailyLimit = Number(
      (await prisma.systemConfig.findUnique({ where: { key: "DAILY_LIMIT" } }))
        ?.value ?? "100"
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

    // 计算定价：泡沫箱单价/容量从 SystemConfig 读取，缺省/0 由 pricing.ts 统一兜底
    const foamBoxPriceCfg = Number(
      (await prisma.systemConfig.findUnique({ where: { key: "FOAM_BOX_PRICE" } }))
        ?.value ?? "0"
    );
    const foamBoxCapCfg = Number(
      (await prisma.systemConfig.findUnique({ where: { key: "FOAM_BOX_CAPACITY" } }))
        ?.value ?? "0"
    );
    const pricing = calculatePrice(
      items as CartItem[],
      deliveryType as "PICKUP" | "DELIVERY" | "EXPRESS",
      {
        unitPrice: foamBoxPriceCfg,
        capacity: foamBoxCapCfg,
      }
    );

    // ============== 快递冷冻与时效校验 ==============
    let plannedShipDate: Date | null = null;
    let frozenConfirmRequired = false;
    let deliveryETA: Date | null = null;

    if (deliveryType === "DELIVERY") {
      // 冷冻时间检查
      const frozenInfos = products.map((p) => ({
        productId: p.id,
        productName: p.name,
        lastFrozenAt: p.lastFrozenAt,
      }));
      const frozenCheck = checkOrderFrozenStatus(frozenInfos);
      if (frozenCheck.items.some((i) => i.status === "NO_RECORD")) {
        return NextResponse.json(
          { error: "部分商品未入库，请稍后重试或联系门店" },
          { status: 400 }
        );
      }
      frozenConfirmRequired = frozenCheck.needsConfirmation;

      // 发货时间：取下一个快递窗口的开始时间
      plannedShipDate = getNextDeliveryWindow().start;

      // 快递时效风险
      const eta = queryDeliveryETA({
        province: address!.province,
        city: address!.city,
        shipDate: plannedShipDate,
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
      // 1. 锁定库存（不下单即扣，待支付仅占用 lockedStock）
      for (const it of items) {
        const p = productMap.get(it.productId)!;
        // 乐观锁：可售不足则回滚
        const updated = await tx.product.updateMany({
          where: {
            id: it.productId,
            // stock - lockedStock >= quantity 等价于 lockedStock <= stock - quantity
            lockedStock: { lte: p.stock - it.quantity },
          },
          data: { lockedStock: { increment: it.quantity } },
        });
        if (updated.count === 0) {
          throw new Error(`「${it.productName}」库存不足，请刷新重试`);
        }

        // 2. 写库存变动日志（锁定，不动实际库存）
        await tx.inventoryLog.create({
          data: {
            productId: it.productId,
            type: INVENTORY_LOG_TYPE.ORDER_LOCK,
            quantity: it.quantity,
            beforeStock: p.stock,
            afterStock: p.stock, // 锁定不影响实际库存
            remark: "顾客下单锁定库存",
            operatorId: session!.user!.id,
          },
        });
      }

      // 3. 创建订单（设置待支付超时时间）
      const expiresAt = new Date(Date.now() + PENDING_PAYMENT_TIMEOUT_MS);
      const order = await tx.order.create({
        data: {
          orderNo,
          userId: session!.user!.id,
          deliveryType,
          status: "PENDING_PAYMENT", // 待支付
          expiresAt,
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
          pickupCode: deliveryType === "PICKUP" ? pickupCode : null,
          // 快递发货相关
          plannedShipDate,
          frozenConfirmRequired,
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

    return NextResponse.json({
      ok: true,
      orderId: result.order.id,
      orderNo: result.order.orderNo,
      totalAmount: result.order.totalAmount,
      pickupCode: result.order.pickupCode,
      // 支付链接占位（后续接入真实支付）
      payUrl: "/checkout/pay?orderId=" + result.order.id,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "下单失败，请稍后重试" },
      { status: 500 }
    );
  }
}
