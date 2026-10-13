import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

/**
 * 后台商品列表 API（库存管理）
 * GET /api/admin/products
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN" && session.user.role !== "KITCHEN") {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  const products = await prisma.product.findMany({
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      name: true,
      category: true,
      unitPrice: true,
      stock: true,
      description: true,
    },
  });

  return NextResponse.json({
    products,
  });
}
