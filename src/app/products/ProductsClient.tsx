"use client";

import { Plus, Minus, Sparkles } from "lucide-react";
import { useCart } from "@/components/CartProvider";
import type { ProductCategory } from "@/lib/pricing";

type ProductFromDB = {
  id: string;
  name: string;
  category: string; // Prisma returns plain string, validated at runtime
  unitPrice: number;
  stock: number;
  description: string | null;
};

const emojiMap: Record<string, string> = {
  "三鲜饺子": "🥬",
  "荠菜饺子": "🌿",
  "酸菜饺子": "🥗",
  "茴香饺子": "🌱",
  "芹菜饺子": "🥬",
  "玉米饺子": "🌽",
  "黑松露饺子": "🍄",
  "菌菇饺子": "🍄",
};

// 库存进度条的满格基准
const MAX_STOCK = 100;

export function ProductsClient({ products }: { products: ProductFromDB[] }) {
  const { showComboHint, totalBoxes } = useCart();

  // 售罄沉底
  const sortedProducts = [...products].sort((a, b) => {
    if (a.stock === 0 && b.stock !== 0) return 1;
    if (a.stock !== 0 && b.stock === 0) return -1;
    return 0;
  });

  const classicProducts = sortedProducts.filter((p) => p.category === "CLASSIC");
  const specialtyProducts = sortedProducts.filter((p) => p.category === "SPECIALTY");

  if (products.length === 0) {
    return (
      <div className="text-center py-20 text-stone-400">
        <div className="text-5xl mb-3">🥟</div>
        <p>暂无可售口味，请稍后再来</p>
      </div>
    );
  }

  return (
    <>
      {totalBoxes > 0 && (
        <div className="mb-3 flex items-center justify-between gap-2 rounded-lg bg-primary-50 border border-primary-200 px-3 py-2 text-sm text-primary-700">
          <span className="font-medium">
            已选 <b>{totalBoxes}</b> 盒，购物车已实时同步
          </span>
          <a href="/cart" className="text-xs font-medium underline underline-offset-2">
            去购物车 →
          </a>
        </div>
      )}

      {showComboHint && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-wheat-300 bg-wheat-50 px-3 py-2.5 text-xs font-medium text-wheat-700">
          <Sparkles className="w-3.5 h-3.5 shrink-0" />
          再加1盒经典饺子，即可凑够4盒享组合价（4经典¥100）！
        </div>
      )}

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
            />
          ))}
        </div>
      </section>

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
            />
          ))}
        </div>
      </section>
    </>
  );
}

function ProductCard({
  product,
  emoji,
}: {
  product: ProductFromDB;
  emoji: string;
}) {
  const { items, addToCart, updateQty } = useCart();

  const outOfStock = product.stock === 0;
  const selected = items.find((it) => it.productId === product.id)?.quantity ?? 0;
  const atMax = selected >= product.stock;

  const stockPercent = outOfStock
    ? 0
    : Math.min(100, (product.stock / MAX_STOCK) * 100);

  const isClassic = product.category === "CLASSIC";
  const mediaTint = isClassic
    ? "from-primary-50 to-rice-100"
    : "from-wheat-50 to-rice-100";

  const handleAdd = () => {
    if (outOfStock || atMax) return;
    addToCart({
      productId: product.id,
      productName: product.name,
      category: product.category as ProductCategory,
      quantity: 1,
      unitPrice: product.unitPrice,
    });
  };

  return (
    <div className="group card flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-primary-200">
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
          <span className="absolute top-2 right-2 rounded-full bg-rice-50/90 px-1.5 py-0.5 text-[10px] font-semibold text-primary-700 shadow-sm backdrop-blur">
            库存{product.stock}
          </span>
        )}
        {selected > 0 && (
          <span className="absolute top-2 left-2 rounded-full bg-primary-600 px-1.5 py-0.5 text-[10px] font-semibold text-rice-50 shadow-sm">
            已选{selected}
          </span>
        )}
      </div>

      <div className="flex flex-col flex-1 p-2.5 sm:p-3">
        <h3 className="font-bold text-sm leading-tight mb-0.5">{product.name}</h3>
        {product.description && (
          <p className="text-xs text-stone-400 mb-2 line-clamp-1 hidden sm:block">
            {product.description}
          </p>
        )}

        <div className="flex items-center justify-between mt-auto mb-1.5">
          <div className="text-base font-bold text-primary-700">
            ¥{(product.unitPrice / 100).toFixed(0)}
            <span className="text-[10px] text-stone-400 font-normal">/盒</span>
          </div>
          <span className="text-[10px] text-stone-500">
            {selected > 0 ? `已选 ${selected} 盒` : "未选择"}
          </span>
        </div>

        {/* 数量选择：减 / 数量 / 加 */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label="减少一盒"
            disabled={selected === 0}
            onClick={() => updateQty(product.id, -1)}
            className="h-11 w-11 shrink-0 rounded-lg border border-stone-300 flex items-center justify-center text-stone-600 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <div className="flex-1 h-11 rounded-lg bg-stone-50 border border-stone-200 flex items-center justify-center gap-0.5 text-sm font-bold text-stone-700">
            {selected}
            <span className="text-[10px] font-normal text-stone-400">盒</span>
          </div>
          <button
            type="button"
            aria-label="加购一盒"
            disabled={outOfStock || atMax}
            onClick={handleAdd}
            className="h-11 w-11 shrink-0 rounded-lg bg-primary-600 text-rice-50 flex items-center justify-center hover:bg-primary-700 active:bg-primary-800 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="mt-2 w-full h-[3px] overflow-hidden rounded-full bg-stone-100">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              outOfStock
                ? "bg-stone-300"
                : stockPercent < 30
                ? "bg-wheat-400"
                : "bg-primary-500"
            }`}
            style={{ width: `${stockPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
