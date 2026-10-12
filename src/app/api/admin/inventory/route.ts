import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";

/**
 * 后台库存入库 / 出库 API
 * POST /api/admin/inventory
 * body: { productId, changeType: 'IN'|'OUT', changeAmount, reason }
 *
 * 入库时同步更新 Product.lastFrozenAt = NOW()
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN" && session.user.role !== "KITCHEN") {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const schema = z.object({
      productId: z.string().min(1),
      changeType: z.enum(["IN", "OUT"]),
      changeAmount: z.number().int().min(1),
      reason: z.string().optional(),
    });
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "参数错误" }, { status: 400 });
    }
    const { productId, changeType, changeAmount, reason } = parsed.data;

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return NextResponse.json({ error: "商品不存在" }, { status: 404 });
    }

    const result = await prisma.$transaction(async (tx) => {
      if (changeType === "IN") {
        const beforeStock = product.stock;
        const updated = await tx.product.update({
          where: { id: productId },
          data: {
            stock: { increment: changeAmount },
            lastFrozenAt: new Date(), // 入库即重置冷冻开始时间
          },
        });
        await tx.inventoryLog.create({
          data: {
            productId,
            type: "INCREASE",
            quantity: changeAmount,
            beforeStock,
            afterStock: updated.stock,
            remark: reason || "入库",
            operatorId: session.user.id,
          },
        });
        return {
          product: updated.name,
          newStock: updated.stock,
          lastFrozenAt: updated.lastFrozenAt,
        };
      } else {
        // 出库：先判断库存够不够
        const beforeStock = product.stock;
        if (beforeStock < changeAmount) {
          throw new Error(
            `「${product.name}」当前库存只有 ${beforeStock} 盒，无法出库 ${changeAmount} 盒`
          );
        }
        const updated = await tx.product.update({
          where: { id: productId, stock: { gte: changeAmount } },
          data: { stock: { decrement: changeAmount } },
        });
        await tx.inventoryLog.create({
          data: {
            productId,
            type: "DECREASE",
            quantity: -changeAmount,
            beforeStock,
            afterStock: updated.stock,
            remark: reason || "出库",
            operatorId: session.user.id,
          },
        });
        return { product: updated.name, newStock: updated.stock };
      }
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "操作失败" },
      { status: 500 }
    );
  }
}
