"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Loader2, LogIn, LogOut } from "lucide-react";

/**
 * 顾客端账号菜单：未登录时显示「登录」入口，已登录时显示手机号与「退出登录」。
 * 购物车、我的订单等页面顶部共用此组件。
 */
export function UserMenu() {
  const router = useRouter();
  const [user, setUser] = useState<{ name?: string; phone?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => {
        if (!active) return;
        setUser(d?.user ? { name: d.user.name, phone: d.user.phone } : null);
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (loading) return null;

  if (!user) {
    return (
      <Link
        href="/auth/login"
        className="flex items-center gap-1 text-sm text-stone-600 hover:text-primary-600"
      >
        <LogIn className="w-4 h-4" />
        <span className="hidden sm:inline">登录</span>
      </Link>
    );
  }

  const phone = user.phone || "";
  const masked = phone
    ? `${phone.slice(0, 3)}****${phone.slice(-4)}`
    : user.name || "已登录";

  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="hidden text-stone-500 sm:inline">{masked}</span>
      <button
        type="button"
        disabled={signingOut}
        onClick={async () => {
          setSigningOut(true);
          try {
            await signOut({ redirect: false });
            setUser(null);
            router.refresh();
          } finally {
            setSigningOut(false);
          }
        }}
        className="flex items-center gap-1 text-stone-600 hover:text-accent-600 disabled:opacity-50"
      >
        {signingOut ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <LogOut className="w-4 h-4" />
        )}
        退出登录
      </button>
    </div>
  );
}
