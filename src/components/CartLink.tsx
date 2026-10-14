"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { useCart } from "@/components/CartProvider";

/**
 * 顶部购物车入口（带角标）
 * 角标实时显示购物车内饺子的「总计盒数」，与加购操作同步。
 */
export function CartLink({
  showLabel = false,
  iconClassName = "w-4 h-4",
  className = "",
}: {
  showLabel?: boolean;
  iconClassName?: string;
  className?: string;
}) {
  const { items } = useCart();
  const totalBoxes = items.reduce((sum, it) => sum + it.quantity, 0);

  return (
    <Link
      href="/cart"
      aria-label={`购物车，共 ${totalBoxes} 盒`}
      className={`relative inline-flex items-center gap-1 text-stone-600 hover:text-primary-600 ${className}`}
    >
      <span className="relative inline-flex">
        <ShoppingCart className={iconClassName} />
        {totalBoxes > 0 && (
          <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-primary-600 text-white text-[10px] font-bold leading-none flex items-center justify-center tabular-nums">
            {totalBoxes > 99 ? "99+" : totalBoxes}
          </span>
        )}
      </span>
      {showLabel && <span className="hidden sm:inline">购物车</span>}
    </Link>
  );
}
