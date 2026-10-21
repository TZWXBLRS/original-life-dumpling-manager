import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";

/**
 * DELETE /api/admin/orders
 * 删除指定手机号顾客名下的「全部」订单（连带订单明细与关联库存日志）。
 * 仅管理员可用，用于清理演示/测试数据。
 *
 * body: { phone: string; restoreStock?: boolean }
 *   - restoreStock=true 时，把订单占用的库存加回商品，默认 false（仅删记录）
 */
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parsed = z
      .object({
        phone: z.string().regex(/^1[3-9]\d{9}$/),
        restoreStock: z.boolean().optional(),
      })
      .safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "参数错误，请提供合法的顾客手机号" },
        { status: 400 }
      );
    }
    const { phone, restoreStock } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { phone },
      select: { id: true },
    });
    if (!user) {
      return NextResponse.json({ error: "未找到该手机号的顾客" }, { status: 404 });
    }

    const orders = await prisma.order.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        items: { select: { productId: true, quantity: true } },
      },
    });
    const orderIds = orders.map((o) => o.id);

    if (orderIds.length === 0) {
      return NextResponse.json({ ok: true, deletedOrders: 0, restoredBoxes: 0 });
    }

    const result = await prisma.$transaction(async (tx) => {
      let restoredBoxes = 0;
      if (restoreStock) {
        for (const o of orders) {
          for (const it of o.items) {
            await tx.product.update({
              where: { id: it.productId },
              data: { stock: { increment: it.quantity } },
            });
            restoredBoxes += it.quantity;
          }
        }
      }
      // InventoryLog 的 orderId 外键无级联，需先删除关联日志
      await tx.inventoryLog.deleteMany({ where: { orderId: { in: orderIds } } });
      // OrderItem 随 Order 级联删除
      await tx.order.deleteMany({ where: { id: { in: orderIds } } });
      return { restoredBoxes };
    });

    return NextResponse.json({
      ok: true,
      deletedOrders: orderIds.length,
      restoredBoxes: result.restoredBoxes,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "删除失败，请稍后重试" },
      { status: 500 }
    );
  }
}
