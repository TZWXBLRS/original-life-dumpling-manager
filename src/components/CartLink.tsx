"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { useCart } from "@/components/CartProvider";

/**
 * 购物车入口：图标右上角实时显示顾客已选饺子的总计盒数。
 * 数量随 addToCart / updateQty 自动同步（来自 CartProvider）。
 */
export function CartLink({
  showLabel = true,
  className = "",
}: {
  showLabel?: boolean;
  className?: string;
}) {
  const { totalBoxes } = useCart();

  return (
    <Link
      href="/cart"
      aria-label={`购物车（${totalBoxes} 盒）`}
      className={`flex items-center gap-1 text-stone-600 hover:text-primary-600 ${className}`}
    >
      <span className="relative inline-flex">
        <ShoppingCart className="w-5 h-5" />
        {totalBoxes > 0 && (
          <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-primary-500 text-white text-[10px] font-bold flex items-center justify-center shadow-sm">
            {totalBoxes > 99 ? "99+" : totalBoxes}
          </span>
        )}
      </span>
      {showLabel && <span className="hidden sm:inline">购物车</span>}
    </Link>
  );
}
