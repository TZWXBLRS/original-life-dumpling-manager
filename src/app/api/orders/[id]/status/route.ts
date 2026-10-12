import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { INVENTORY_LOG_TYPE, ORDER_STATUS } from "@/lib/inventory";
import { isInDeliveryWindow } from "@/lib/frozen-check";

// 合法的订单状态（与 schema 注释一致）
const VALID_STATUSES = [
  ORDER_STATUS.PENDING_PAYMENT,
  ORDER_STATUS.PAID,
  ORDER_STATUS.PREPARING,
  ORDER_STATUS.READY,
  ORDER_STATUS.READY_FOR_PICKUP,
  ORDER_STATUS.SHIPPED,
  ORDER_STATUS.COMPLETED,
  ORDER_STATUS.CANCELLED,
] as const;

type OrderStatus = (typeof VALID_STATUSES)[number];

// 说明：状态流转合法性由下方 ACTION_TO_STATUS 唯一约束（旧 STATUS_TRANSITIONS
// 表与实际逻辑不一致且从未被引用，已移除，避免误导）。

export type StatusAction =
  | "PAY" // 支付（顾客）
  | "START_PREPARE" // 开始备餐（后厨/管理员）
  | "MARK_READY" // 标记备好（后厨/管理员）
  | "SHIP" // 发货（管理员）
  | "COMPLETE" // 标记完成（管理员/自取）
  | "CANCEL"; // 取消订单（顾客待支付时 / 管理员）

const ACTION_TO_STATUS: Record<
  StatusAction,
  Partial<Record<OrderStatus, OrderStatus>>
> = {
  PAY: { PENDING_PAYMENT: "PAID" },
  START_PREPARE: { PAID: "PREPARING" },
  MARK_READY: {
    PREPARING: "READY",
    PAID: "READY",
  },
  SHIP: { READY: "SHIPPED", PREPARING: "SHIPPED", PAID: "SHIPPED" },
  COMPLETE: {
    READY: "COMPLETED",
    READY_FOR_PICKUP: "COMPLETED",
    SHIPPED: "COMPLETED",
    PREPARING: "COMPLETED",
  },
  CANCEL: {
    PENDING_PAYMENT: "CANCELLED",
    PAID: "CANCELLED",
    PREPARING: "CANCELLED",
  },
};

/**
 * 修改订单状态 API
 * PATCH /api/orders/[id]/status
 * body: {
 *   action: 'PAY' | 'START_PREPARE' | 'MARK_READY' | 'SHIP' | 'COMPLETE' | 'CANCEL',
 *   cancelReason?: string,  // 取消原因
 *   frozenConfirm?: boolean, // 冷冻确认（快递发货时）
 * }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const schema = z.object({
      action: z.enum([
        "PAY",
        "START_PREPARE",
        "MARK_READY",
        "SHIP",
        "COMPLETE",
        "CANCEL",
      ]),
      cancelReason: z.string().max(200).optional(),
      frozenConfirm: z.boolean().optional(),
      paymentMethod: z.string().optional(),
    });
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "参数错误：" + parsed.error.issues[0].message },
        { status: 400 }
      );
    }
    const { action, cancelReason, frozenConfirm, paymentMethod } = parsed.data;

    // 1. 查订单
    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: { items: { select: { productId: true, quantity: true } } },
    });
    if (!order) {
      return NextResponse.json({ error: "订单不存在" }, { status: 404 });
    }

    // 2. 权限校验
    const isAdmin = session.user.role === "ADMIN";
    const isKitchen = session.user.role === "KITCHEN";
    const isStaff = isAdmin || isKitchen;
    const isOwner = order.userId === session.user.id;

    // 不同角色允许的操作：Key 为 Action，Value 为允许执行的角色列表。
    // 注意：CANCEL 列出 CUSTOMER 仅表示顾客"可发起取消"，但顾客仅限
    // 待支付状态（见下方「顾客取消订单：仅限待支付状态」校验）；其余状态取消需 ADMIN。
    const roleActions: Record<StatusAction, string[]> = {
      PAY: ["CUSTOMER", "ADMIN"], // 顾客或管理员可标记支付
      START_PREPARE: ["ADMIN", "KITCHEN"],
      MARK_READY: ["ADMIN", "KITCHEN"],
      SHIP: ["ADMIN"],
      COMPLETE: ["ADMIN", "KITCHEN"],
      CANCEL: ["CUSTOMER", "ADMIN"],
    };

    const allowedRoles = roleActions[action];
    const userRoleForCheck = isAdmin
      ? "ADMIN"
      : isKitchen
        ? "KITCHEN"
        : "CUSTOMER";
    if (!allowedRoles.includes(userRoleForCheck)) {
      return NextResponse.json({ error: "无权限执行此操作" }, { status: 403 });
    }

    // 顾客只能操作自己的订单
    if (!isStaff && !isOwner) {
      return NextResponse.json({ error: "无权限操作此订单" }, { status: 403 });
    }

    // 顾客取消订单：仅限待支付状态
    if (!isStaff && action === "CANCEL" && order.status !== "PENDING_PAYMENT") {
      return NextResponse.json(
        { error: "仅待支付订单可自行取消，请联系门店" },
        { status: 400 }
      );
    }

    // 3. 检查状态流转是否合法
    const currentStatus = order.status as OrderStatus;
    const nextStatus = ACTION_TO_STATUS[action][currentStatus];
    if (!nextStatus) {
      return NextResponse.json(
        { error: `当前状态「${currentStatus}」不允许执行「${action}」` },
        { status: 400 }
      );
    }

    // 4. 快递发货时：时间窗口 + 冷冻确认检查
    if (action === "SHIP" && order.deliveryType === "DELIVERY") {
      // 发货时间窗口校验（PRD 4.4：每天 18:00 - 20:00）
      if (!isInDeliveryWindow()) {
        return NextResponse.json(
          {
            error: "快递发货时间仅限每天 18:00 - 20:00，请在发货窗口内操作",
          },
          { status: 400 }
        );
      }
      if (order.frozenConfirmRequired && !frozenConfirm) {
        return NextResponse.json(
          {
            error:
              "此订单冷冻时间未满8小时，请前台确认饺子冷冻情况后，勾选冷冻确认再发货",
            needFrozenConfirm: true,
          },
          { status: 400 }
        );
      }
    }

    // 5. 执行状态变更（事务处理）
    const now = new Date();
    const updateData: any = {
      status: nextStatus,
    };

    // 各状态对应时间戳
    switch (nextStatus) {
      case "PAID":
        updateData.paidAt = now;
        updateData.paymentMethod = paymentMethod || "MANUAL";
        updateData.expiresAt = null; // 已支付，清除待支付超时
        break;
      case "PREPARING":
        updateData.preparingAt = now;
        break;
      case "READY":
      case "READY_FOR_PICKUP":
        updateData.readyAt = now;
        break;
      case "SHIPPED":
        updateData.shippedAt = now;
        if (order.frozenConfirmRequired) {
          updateData.frozenConfirmedAt = now;
          updateData.frozenConfirmedBy = session.user.id;
        }
        break;
      case "COMPLETED":
        updateData.completedAt = now;
        break;
      case "CANCELLED":
        updateData.cancelledAt = now;
        updateData.cancelReason = cancelReason || "用户取消";
        break;
    }

    const result = await prisma.$transaction(async (tx) => {
      // 6. 支付成功：锁定库存转为实际扣减（lockedStock 释放 + stock 扣减）
      if (nextStatus === "PAID" && order.status === "PENDING_PAYMENT") {
        for (const item of order.items) {
          const product = await tx.product.findUnique({
            where: { id: item.productId },
            select: { stock: true, lockedStock: true },
          });
          if (!product) continue;
          // 扣减实际库存、释放等量锁定库存
          const newStock = product.stock - item.quantity;
          const newLocked = Math.max(0, product.lockedStock - item.quantity);
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: newStock, lockedStock: newLocked },
          });
          await tx.inventoryLog.create({
            data: {
              productId: item.productId,
              type: INVENTORY_LOG_TYPE.ORDER_DEDUCT,
              quantity: item.quantity,
              beforeStock: product.stock,
              afterStock: newStock,
              remark: "订单支付，扣减实际库存",
              operatorId: session!.user!.id,
              orderId: order.id,
            },
          });
        }
      }

      // 7. 取消订单：按原状态释放库存
      if (nextStatus === "CANCELLED") {
        for (const item of order.items) {
          const product = await tx.product.findUnique({
            where: { id: item.productId },
            select: { stock: true, lockedStock: true },
          });
          if (!product) continue;
          if (order.status === "PENDING_PAYMENT") {
            // 待支付：只锁定未扣减，释放锁定库存
            const newLocked = Math.max(0, product.lockedStock - item.quantity);
            await tx.product.update({
              where: { id: item.productId },
              data: { lockedStock: newLocked },
            });
            await tx.inventoryLog.create({
              data: {
                productId: item.productId,
                type: INVENTORY_LOG_TYPE.ORDER_RELEASE,
                quantity: item.quantity,
                beforeStock: product.stock,
                afterStock: product.stock, // 释放锁定不影响实际库存
                remark: "待支付订单取消，释放锁定库存",
                operatorId: session!.user!.id,
                orderId: order.id,
              },
            });
          } else {
            // 已支付/备餐等：实际库存已扣减，需归还实际库存
            const newStock = product.stock + item.quantity;
            await tx.product.update({
              where: { id: item.productId },
              data: { stock: newStock },
            });
            await tx.inventoryLog.create({
              data: {
                productId: item.productId,
                type: INVENTORY_LOG_TYPE.ORDER_RELEASE,
                quantity: item.quantity,
                beforeStock: product.stock,
                afterStock: newStock,
                remark: "已支付订单取消，归还实际库存",
                operatorId: session!.user!.id,
                orderId: order.id,
              },
            });
          }
        }
      }

      // 8. 更新订单状态
      const updated = await tx.order.update({
        where: { id: order.id },
        data: updateData,
        select: {
          id: true,
          orderNo: true,
          status: true,
          paidAt: true,
          preparingAt: true,
          readyAt: true,
          shippedAt: true,
          completedAt: true,
          cancelledAt: true,
          cancelReason: true,
        },
      });

      return updated;
    });

    return NextResponse.json({
      ok: true,
      order: result,
      message: statusChangedMessage(action, nextStatus),
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "操作失败，请稍后重试" },
      { status: 500 }
    );
  }
}

function statusChangedMessage(action: StatusAction, status: string): string {
  const map: Record<string, string> = {
    PAY: "订单支付成功",
    START_PREPARE: "已进入备餐状态",
    MARK_READY: "已标记为备好",
    SHIP: "已发货",
    COMPLETE: status === "COMPLETED" ? "订单已完成" : "订单已标记完成",
    CANCEL: "订单已取消",
  };
  return map[action] || "状态已更新";
}
