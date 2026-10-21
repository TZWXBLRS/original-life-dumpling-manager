"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Loader2, LogIn, LogOut, X } from "lucide-react";
import { PhoneLoginPanel } from "@/components/PhoneLoginPanel";

/**
 * 顾客端账号菜单：全站统一的「手机号一键登录」入口。
 * - 未登录：点击「登录」弹出 PhoneLoginPanel（含可选姓名/收货地址）
 * - 已登录：显示脱敏手机号与「退出登录」
 * 首页、商品页、购物车、订单页顶部共用此组件。
 */
export function UserMenu() {
  const router = useRouter();
  const [user, setUser] = useState<{ name?: string; phone?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const loadSession = async () => {
    try {
      const r = await fetch("/api/auth/session");
      const d = await r.json();
      setUser(d?.user ? { name: d.user.name, phone: d.user.phone } : null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSession();
  }, []);

  // 点击面板外部时收起
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  if (loading) return null;

  if (!user) {
    return (
      <div ref={boxRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex min-h-11 min-w-11 items-center justify-center gap-1 p-2 text-sm text-stone-600 hover:text-primary-600 sm:min-h-0 sm:min-w-0"
        >
          {open ? <X className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
          <span className="hidden sm:inline">{open ? "收起" : "登录"}</span>
        </button>

        {open && (
          <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-2xl border border-stone-200 bg-white p-4 shadow-xl animate-fade-up">
            <div className="mb-3 flex items-center gap-2">
              <span className="h-px w-5 bg-wheat-400/70" aria-hidden="true" />
              <div className="text-sm font-bold tracking-[0.08em] text-primary-700">
                禾也 · 手机号一键登录
              </div>
            </div>
            <PhoneLoginPanel
              autoFocus
              onLoggedIn={() => {
                setOpen(false);
                loadSession();
                router.refresh();
              }}
            />
          </div>
        )}
      </div>
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
