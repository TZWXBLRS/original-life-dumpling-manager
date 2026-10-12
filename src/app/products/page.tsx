"use client";

import { useState } from "react";
import Link from "next/link";
import { ShoppingCart, Plus, Home } from "lucide-react";
import { useCart } from "@/components/CartProvider";
import type { CartItem, ProductCategory } from "@/lib/pricing";

/**
 * 顾客端页面 - 商品列表
 * 展示所有口味的饺子、库存、价格，支持加入购物车
 * 手机端 2 列布局，一屏可见 4 个口味
 */
export default function ProductsPage() {
  // 占位商品数据，从组件内 state 加载（TODO: 后续从数据库读取）
  const [products] = useState([
    { id: "1", name: "三鲜饺子", category: "CLASSIC" as ProductCategory, unitPrice: 3300, stock: 50, description: "素三鲜组合，三种时蔬鲜香搭配" },
    { id: "2", name: "荠菜饺子", category: "CLASSIC" as ProductCategory, unitPrice: 3300, stock: 45, description: "新鲜荠菜，清香可口" },
    { id: "3", name: "酸菜饺子", category: "CLASSIC" as ProductCategory, unitPrice: 3300, stock: 0, description: "东北酸菜风味，酸爽开胃" },
    { id: "4", name: "茴香饺子", category: "CLASSIC" as ProductCategory, unitPrice: 3300, stock: 40, description: "北方特色茴香口味，回味悠长" },
    { id: "5", name: "芹菜饺子", category: "CLASSIC" as ProductCategory, unitPrice: 3300, stock: 48, description: "新鲜芹菜，清爽不腻" },
    { id: "6", name: "玉米饺子", category: "CLASSIC" as ProductCategory, unitPrice: 3300, stock: 52, description: "甜玉米粒，老少皆宜" },
    { id: "7", name: "黑松露饺子", category: "SPECIALTY" as ProductCategory, unitPrice: 3800, stock: 20, description: "珍稀黑松露，高端风味" },
    { id: "8", name: "菌菇饺子", category: "SPECIALTY" as ProductCategory, unitPrice: 3800, stock: 18, description: "多种野生菌菇混合，鲜美无比" },
  ]);

  // 口味 → emoji 映射，替代大图
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

      <main className="flex-1 max-w-6xl mx-auto px-3 py-4 w-full">
        <div className="mb-3">
          <h1 className="text-lg font-bold">全部口味</h1>
          <p className="text-stone-500 text-xs mt-0.5">
            🌱 纯素饺子 · 系统自动计算最优优惠
          </p>
        </div>

        {/* 4盒组合提示横幅 */}
        {showComboHint && (
          <div className="mb-3 px-3 py-2 rounded-lg bg-yellow-100 border border-yellow-300 text-yellow-800 text-xs font-medium">
            💡 再加1盒经典饺子，即可凑够4盒享组合价（4经典¥100）！
          </div>
        )}

        {/* 经典口味 */}
        <section className="mb-5">
          <h2 className="text-sm font-bold mb-2 flex items-center gap-2">
            <span className="badge-classic">经典口味</span>
            <span className="text-xs text-stone-400 font-normal">¥33/盒 · 4盒¥100起</span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
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
        <section className="mb-5">
          <h2 className="text-sm font-bold mb-2 flex items-center gap-2">
            <span className="badge-specialty">特色口味</span>
            <span className="text-xs text-stone-400 font-normal">¥38/盒 · 3盒¥100</span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
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
  product: {
    id: string;
    name: string;
    category: ProductCategory;
    unitPrice: number;
    stock: number;
    description: string;
  };
  emoji: string;
  onAdd: (item: CartItem) => void;
}) {
  const outOfStock = product.stock === 0;
  const [added, setAdded] = useState(false);

  // 最大库存参考值，用于进度条计算
  const MAX_STOCK = 60;
  const stockPercent = outOfStock ? 0 : Math.min(100, (product.stock / MAX_STOCK) * 100);

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
    <div className="card p-2.5 flex flex-col">
      {/* 紧凑头部：emoji + 库存 */}
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-2xl leading-none">{emoji}</span>
        {outOfStock ? (
          <span className="badge-out text-[10px] !px-1.5 !py-0.5">缺货</span>
        ) : (
          <span className="text-[10px] text-green-600 font-medium">库存{product.stock}</span>
        )}
      </div>
      {/* 名称 */}
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
            <>✓ 已加入</>
          ) : (
            <>
              <Plus className="w-3 h-3" />
              加购
            </>
          )}
        </button>
      </div>
      {/* 库存进度条 */}
      <div className="w-full h-[2px] bg-stone-100 rounded-full mt-1.5 overflow-hidden">
        <div
          className={`h-full rounded-full ${outOfStock ? "bg-stone-300" : "bg-green-500"}`}
          style={{ width: `${stockPercent}%` }}
        />
      </div>
    </div>
  );
}
