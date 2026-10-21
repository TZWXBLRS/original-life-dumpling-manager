import { prisma } from "@/lib/prisma";
import { ProductsClient } from "./ProductsClient";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

// 强制 SSR：构建时没有 Turso 环境变量，Prisma 无法连接
export const dynamic = "force-dynamic";

/**
 * 顾客端 - 商品列表页
 * Server Component：从数据库读取真实商品数据，传给客户端子组件
 */
export default async function ProductsPage() {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      category: true,
      unitPrice: true,
      stock: true,
      description: true,
    },
  });

  return (
    <div className="flex min-h-screen flex-col bg-rice-50">
      <SiteHeader />

      {/* 页面头图条 */}
      <div className="border-b border-rice-300/70 bg-gradient-to-r from-primary-50 via-rice-50 to-wheat-50">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <div className="text-[11px] tracking-[0.4em] text-primary-600">
            OUR DUMPLINGS · 今日现包
          </div>
          <h1 className="mt-2 flex flex-wrap items-center gap-2 font-serif-cn text-2xl text-primary-900">
            八味素饺，一箸之和
            <span className="inline-flex items-center gap-1 rounded-full border border-primary-200 bg-rice-50/80 px-2.5 py-0.5 text-[11px] font-medium tracking-normal text-primary-700">
              自动最优优惠
            </span>
          </h1>
          <p className="mt-1 text-stone-500 text-xs">
            纯素配方 · 选好口味加入购物车，系统自动帮您凑单省钱
          </p>
        </div>
      </div>

      <main className="mx-auto w-full max-w-6xl flex-1 px-3 py-6">
        <ProductsClient products={products} />
      </main>

      <SiteFooter />
    </div>
  );
}
