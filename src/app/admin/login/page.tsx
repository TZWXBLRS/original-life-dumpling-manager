"use client";

import Link from "next/link";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Phone, Lock, Loader2, ShieldCheck } from "lucide-react";
import { signIn } from "next-auth/react";

export const dynamic = "force-dynamic";

/**
 * 商家后台独立登录页（与顾客购物完全分离）
 * —— 仅门店账号（管理员 / 后厨）使用手机号 + 密码登录。
 *    顾客请勿在此登录，顾客入口是全站统一的「手机号一键登录」。
 */
function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/admin/dashboard";

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await signIn("credentials", {
        phone,
        password,
        redirect: false,
      });

      if (!result || result.error) {
        setError("手机号或密码错误");
        return;
      }

      // 二次确认角色：顾客账号不允许进入后台
      let role: string | undefined;
      try {
        const sess = await fetch("/api/auth/session").then((r) => r.json());
        role = sess?.user?.role;
      } catch {
        role = undefined;
      }
      if (role !== "ADMIN" && role !== "KITCHEN") {
        await fetch("/api/auth/signout", { method: "POST" }).catch(() => {});
        setError("该账号非门店账号，请使用顾客端一键登录");
        return;
      }

      router.refresh();
      router.push(callbackUrl.startsWith("/admin") ? callbackUrl : "/admin/dashboard");
    } catch {
      setError("登录失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-900 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🥟</div>
          <h1 className="text-2xl font-bold text-white">原味生活 · 管理后台</h1>
          <p className="text-stone-400 text-sm mt-1">仅限门店员工登录</p>
        </div>

        <form
          className="rounded-2xl bg-stone-800 p-8 shadow-2xl ring-1 ring-stone-700"
          onSubmit={onSubmit}
        >
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm text-stone-300">手机号</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
                <input
                  className="w-full rounded-lg border border-stone-600 bg-stone-900 py-2.5 pl-10 pr-3 text-white placeholder:text-stone-500 focus:border-primary-500 focus:outline-none"
                  type="tel"
                  placeholder="请输入门店账号手机号"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                  required
                  maxLength={11}
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm text-stone-300">密码</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
                <input
                  className="w-full rounded-lg border border-stone-600 bg-stone-900 py-2.5 pl-10 pr-3 text-white placeholder:text-stone-500 focus:border-primary-500 focus:outline-none"
                  type="password"
                  placeholder="请输入密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-accent-500/15 p-3 text-sm text-accent-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn-primary flex w-full items-center justify-center gap-2 !py-3"
              disabled={loading || phone.length !== 11 || !password}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShieldCheck className="h-4 w-4" />
              )}
              {loading ? "登录中..." : "登录后台"}
            </button>
          </div>

          <p className="mt-5 border-t border-stone-700 pt-5 text-center text-xs text-stone-400">
            顾客下单无需注册，请返回
            <Link href="/" className="ml-1 text-primary-400 hover:underline">
              顾客端首页
            </Link>
            &nbsp;一键登录
          </p>
        </form>

        <div className="mt-6 text-center text-sm text-stone-500">
          <Link href="/" className="hover:text-primary-400">
            ← 返回顾客端
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-stone-900 text-stone-500">
          加载中...
        </div>
      }
    >
      <AdminLoginForm />
    </Suspense>
  );
}
