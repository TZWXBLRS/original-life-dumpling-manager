import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";

// 合法的订单状态流转
const VALID_STATUSES = [
  "PENDING_PAYMENT",
  "PAID",
  "PREPARING",
  "READY",
  "READY_FOR_PICKUP",
  "SHIPPED",
  "COMPLETED",
  "CANCELLED",
] as const;

type OrderStatus = (typeof VALID_STATUSES)[number];

// 状态流转规则：从当前状态可以转到哪些状态
const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ["PAID", "CANCELLED"],
  PAID: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY", "READY_FOR_PICKUP", "CANCELLED"],
  READY: ["SHIPPED", "COMPLETED", "CANCELLED"],
  READY_FOR_PICKUP: ["COMPLETED", "CANCELLED"],
  SHIPPED: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};

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

    // 不同角色允许的操作：Key 为 Action，Value 为允许执行的角色列表
    const roleActions: Record<StatusAction, string[]> = {
      PAY: ["CUSTOMER", "ADMIN"], // 顾客或管理员可标记支付
      START_PREPARE: ["ADMIN", "KITCHEN"],
      MARK_READY: ["ADMIN", "KITCHEN"],
      SHIP: ["ADMIN"],
      COMPLETE: ["ADMIN", "KITCHEN"],
      CANCEL: ["CUSTOMER", "ADMIN"], // 顾客待支付可取消；管理员随时可取消
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

    // 4. 快递发货时：冷冻确认检查
    if (action === "SHIP" && order.deliveryType === "DELIVERY") {
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
      // 6. 取消订单：返还库存
      if (nextStatus === "CANCELLED" && order.status !== "PENDING_PAYMENT") {
        // 已扣库存的订单，需要把库存加回去
        for (const item of order.items) {
          const product = await tx.product.findUnique({
            where: { id: item.productId },
            select: { stock: true },
          });
          if (product) {
            const beforeStock = product.stock;
            await tx.product.update({
              where: { id: item.productId },
              data: { stock: { increment: item.quantity } },
            });
            await tx.inventoryLog.create({
              data: {
                productId: item.productId,
                type: "ORDER_RELEASE",
                quantity: item.quantity,
                beforeStock,
                afterStock: beforeStock + item.quantity,
                remark: `订单取消释放库存`,
                operatorId: session!.user!.id,
                orderId: order.id,
              },
            });
          }
        }
      }

      // 7. 更新订单状态
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
