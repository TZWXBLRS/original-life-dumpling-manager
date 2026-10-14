import { prisma } from "@/lib/prisma";
import { ProductsClient, type ProductListItem } from "./ProductsClient";

/**
 * 顾客端页面 - 商品列表（服务端组件）
 * 从数据库读取上架商品（含实时库存），交给客户端组件渲染
 */
export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const products = await prisma.product.findMany({
    where: { isActive: true },
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

  const items: ProductListItem[] = products.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category as ProductListItem["category"],
    unitPrice: p.unitPrice,
    stock: p.stock,
    description: p.description ?? "",
  }));

  return <ProductsClient products={items} />;
}
