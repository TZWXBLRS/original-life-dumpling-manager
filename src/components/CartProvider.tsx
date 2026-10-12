"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { CartItem } from "@/lib/pricing";

/**
 * 购物车 Context — 使用 localStorage 持久化
 * 降级模式：localStorage 不可用时退化为内存状态
 */

const STORAGE_KEY = "dumpling-cart";

interface CartContextValue {
  items: CartItem[];
  addToCart: (item: CartItem) => void;
  updateQty: (productId: string, delta: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
  /** 经典口味总盒数 */
  classicBoxes: number;
  /** 是否该提示「再加1盒凑4盒享组合价」 */
  showComboHint: boolean;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // 从 localStorage 加载（降级：失败则用空数组）
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CartItem[];
        if (Array.isArray(parsed)) setItems(parsed);
      }
    } catch {
      // localStorage 不可用，降级为内存模式
    }
    setHydrated(true);
  }, []);

  // 写入 localStorage（降级：失败则静默）
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // 忽略写入失败
    }
  }, [items, hydrated]);

  const addToCart = useCallback((item: CartItem) => {
    setItems((prev) => {
      const existing = prev.find((it) => it.productId === item.productId);
      if (existing) {
        return prev.map((it) =>
          it.productId === item.productId
            ? { ...it, quantity: it.quantity + item.quantity }
            : it
        );
      }
      return [...prev, item];
    });
  }, []);

  const updateQty = useCallback((productId: string, delta: number) => {
    setItems((prev) =>
      prev
        .map((it) =>
          it.productId === productId
            ? { ...it, quantity: Math.max(0, it.quantity + delta) }
            : it
        )
        .filter((it) => it.quantity > 0)
    );
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => prev.filter((it) => it.productId !== productId));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const classicBoxes = items
    .filter((it) => it.category === "CLASSIC")
    .reduce((sum, it) => sum + it.quantity, 0);

  // 4盒组合提示：经典盒数 mod 4 === 3 时，再加1盒即可凑够4盒享组合价
  const showComboHint = classicBoxes > 0 && classicBoxes % 4 === 3;

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        updateQty,
        removeItem,
        clearCart,
        classicBoxes,
        showComboHint,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
