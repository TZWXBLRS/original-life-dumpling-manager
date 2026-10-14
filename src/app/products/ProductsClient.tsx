"use client";

import { useState } from "react";
import Link from "next/link";
import { ShoppingCart, Plus, Home, Sparkles, CheckCircle2 } from "lucide-react";
import { useCart } from "@/components/CartProvider";
import type { CartItem, ProductCategory } from "@/lib/pricing";

/**
 * 顾客端商品列表 - 交互部分（客户端组件）
 * 商品数据由服务端 page.tsx 从数据库读取后以 props 传入
 */

export interface ProductListItem {
  id: string;
  name: string;
  category: ProductCategory;
  unitPrice: number;
  stock: number;
  description: string;
}

// 口味 → emoji 映射，替代大图
const emojiMap: Record<string, string> = {
  三鲜饺子: "🥬",
  荠菜饺子: "🌿",
  酸菜饺子: "🥗",
  茴香饺子: "🌱",
  芹菜饺子: "🥬",
  玉米饺子: "🌽",
  黑松露饺子: "🍄",
  菌菇饺子: "🍄",
};

export function ProductsClient({ products }: { products: ProductListItem[] }) {
  const { addToCart, showComboHint } = useCart();

  // 售罄沉底：stock=0 的商品排到列表末尾，其余保持原顺序
  const sortedProducts = [...products].sort((a, b) => {
    if (a.stock === 0 && b.stock !== 0) return 1;
    if (a.stock !== 0 && b.stock === 0) return -1;
    return 0;
  });

  const classicProducts = sortedProducts.filter((p) => p.category === "CLASSIC");
  const specialtyProducts = sortedProducts.filter((p) => p.category === "SPECIALTY");

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
              <Home className="w-4 h-4 inline" />
            </Link>
            <Link href="/cart" className="text-stone-600 hover:text-primary-600">
              <ShoppingCart className="w-4 h-4 inline" />
            </Link>
          </nav>
        </div>
      </header>

      {/* 页面头图条 */}
      <div className="bg-gradient-to-r from-primary-50 to-accent-50 border-b border-stone-100">
        <div className="max-w-6xl mx-auto px-4 py-5">
          <h1 className="text-xl font-bold text-stone-800 flex items-center gap-2">
            全部口味
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-primary-700 bg-white/70 border border-primary-200 rounded-full px-2 py-0.5">
              <Sparkles className="w-3 h-3" /> 自动最优优惠
            </span>
          </h1>
          <p className="text-stone-500 text-xs mt-1">
            🌱 纯素饺子 · 选好口味加入购物车，系统自动帮您凑单省钱
          </p>
        </div>
      </div>

      <main className="flex-1 max-w-6xl mx-auto px-3 py-5 w-full">
        {/* 4盒组合提示横幅 */}
        {showComboHint && (
          <div className="mb-4 px-3 py-2.5 rounded-lg bg-yellow-100 border border-yellow-300 text-yellow-800 text-xs font-medium flex items-center gap-2 animate-fade-up">
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            再加1盒经典饺子，即可凑够4盒享组合价（4经典¥100）！
          </div>
        )}

        {/* 经典口味 */}
        <section className="mb-7">
          <div className="flex items-center gap-2 mb-3">
            <span className="badge-classic">经典口味</span>
            <span className="text-xs text-stone-400">¥33/盒 · 4盒¥100起</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4">
            {classicProducts.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                emoji={emojiMap[p.name] || "🥟"}
                onAdd={(item) => addToCart(item)}
              />
            ))}
          </div>
        </section>

        {/* 特色口味 */}
        <section className="mb-7">
          <div className="flex items-center gap-2 mb-3">
            <span className="badge-specialty">特色口味</span>
            <span className="text-xs text-stone-400">¥38/盒 · 3盒¥100</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4">
            {specialtyProducts.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                emoji={emojiMap[p.name] || "🥟"}
                onAdd={(item) => addToCart(item)}
              />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function ProductCard({
  product,
  emoji,
  onAdd,
}: {
  product: ProductListItem;
  emoji: string;
  onAdd: (item: CartItem) => void;
}) {
  const outOfStock = product.stock === 0;
  const [added, setAdded] = useState(false);

  // 最大库存参考值，用于进度条计算
  const MAX_STOCK = 60;
  const stockPercent = outOfStock ? 0 : Math.min(100, (product.stock / MAX_STOCK) * 100);

  const isClassic = product.category === "CLASSIC";
  const mediaTint = isClassic
    ? "from-green-50 to-emerald-50"
    : "from-amber-50 to-orange-50";

  const handleAdd = () => {
    if (outOfStock) return;
    onAdd({
      productId: product.id,
      productName: product.name,
      category: product.category,
      quantity: 1,
      unitPrice: product.unitPrice,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <div className="group card flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-primary-200">
      {/* 媒体区：emoji + 分类底色 */}
      <div
        className={`relative h-24 sm:h-28 flex items-center justify-center bg-gradient-to-br ${mediaTint}`}
      >
        <span className="text-4xl sm:text-5xl leading-none drop-shadow-sm transition-transform duration-300 group-hover:scale-110">
          {emoji}
        </span>
        {outOfStock && (
          <span className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center">
            <span className="text-xs font-semibold text-stone-500 bg-white/90 border border-stone-200 rounded-full px-2.5 py-0.5">
              已售罄
            </span>
          </span>
        )}
        {!outOfStock && (
          <span className="absolute top-2 right-2 text-[10px] font-semibold text-green-700 bg-white/85 backdrop-blur rounded-full px-1.5 py-0.5 shadow-sm">
            库存{product.stock}
          </span>
        )}
      </div>

      {/* 内容区 */}
      <div className="flex flex-col flex-1 p-2.5 sm:p-3">
        <h3 className="font-bold text-sm leading-tight mb-0.5">{product.name}</h3>
        {/* 描述 - 手机端隐藏，sm以上显示 */}
        <p className="text-xs text-stone-400 mb-2 line-clamp-1 hidden sm:block">
          {product.description}
        </p>

        {/* 底部：价格 + 加购 */}
        <div className="flex items-end justify-between mt-auto">
          <div className="text-base font-bold text-primary-600">
            ¥{(product.unitPrice / 100).toFixed(0)}
            <span className="text-[10px] text-stone-400 font-normal">/盒</span>
          </div>
          <button
            disabled={outOfStock}
            onClick={handleAdd}
            className="btn-primary !py-1 !px-2.5 text-xs flex items-center gap-0.5 disabled:opacity-50"
          >
            {added ? (
              <>
                <CheckCircle2 className="w-3 h-3" /> 已加入
              </>
            ) : (
              <>
                <Plus className="w-3 h-3" />
                加购
              </>
            )}
          </button>
        </div>

        {/* 库存进度条 */}
        <div className="w-full h-[3px] bg-stone-100 rounded-full mt-2 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              outOfStock
                ? "bg-stone-300"
                : stockPercent < 30
                ? "bg-amber-400"
                : "bg-green-500"
            }`}
            style={{ width: `${stockPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
