import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";

/**
 * 后台库存变更 API
 * POST /api/admin/inventory
 * body: { productId, changeType: 'IN'|'OUT'|'SET', changeAmount, reason }
 *   IN  入库：库存 + changeAmount
 *   OUT 出库：库存 - changeAmount
 *   SET 直接设定：库存 = changeAmount（用于盘点 / 批量设置为固定值）
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
      changeType: z.enum(["IN", "OUT", "SET"]),
      changeAmount: z.number().int().min(0),
      reason: z.string().optional(),
    });
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "参数错误" }, { status: 400 });
    }
    const { productId, changeType, changeAmount, reason } = parsed.data;
    if (changeType !== "SET" && changeAmount < 1) {
      return NextResponse.json({ error: "数量必须大于 0" }, { status: 400 });
    }

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
        };
      } else if (changeType === "OUT") {
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
      } else {
        // SET：直接设定库存为绝对值
        const beforeStock = product.stock;
        const updated = await tx.product.update({
          where: { id: productId },
          data: { stock: changeAmount },
        });
        await tx.inventoryLog.create({
          data: {
            productId,
            type: "ADJUST",
            quantity: changeAmount - beforeStock,
            beforeStock,
            afterStock: updated.stock,
            remark: reason || `直接设定为 ${changeAmount} 盒`,
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
