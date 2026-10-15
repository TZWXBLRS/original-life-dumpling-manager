import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ProductsClient } from "./ProductsClient";
import { CartLink } from "@/components/CartLink";
import { UserMenu } from "@/components/UserMenu";

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
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-stone-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl">🥟</span>
            <span className="font-bold text-base text-primary-700">原味生活</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/" className="text-stone-600 hover:text-primary-600">
              🏠
            </Link>
            <CartLink showLabel={false} />
            <UserMenu />
          </nav>
        </div>
      </header>

      {/* 页面头图条 */}
      <div className="bg-gradient-to-r from-primary-50 to-accent-50 border-b border-stone-100">
        <div className="max-w-6xl mx-auto px-4 py-5">
          <h1 className="text-xl font-bold text-stone-800 flex items-center gap-2">
            全部口味
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-primary-700 bg-white/70 border border-primary-200 rounded-full px-2 py-0.5">
              ✨ 自动最优优惠
            </span>
          </h1>
          <p className="text-stone-500 text-xs mt-1">
            🌱 纯素饺子 · 选好口味加入购物车，系统自动帮您凑单省钱
          </p>
        </div>
      </div>

      <main className="flex-1 max-w-6xl mx-auto px-3 py-5 w-full">
        <ProductsClient products={products} />
      </main>
    </div>
  );
}
