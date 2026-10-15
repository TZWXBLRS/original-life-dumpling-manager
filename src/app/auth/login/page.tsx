"use client";

import Link from "next/link";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Phone, Lock, Loader2 } from "lucide-react";
// 使用 NextAuth 官方 signIn，避免 CSRF token 缺失问题
import { signIn } from "next-auth/react";

export const dynamic = "force-dynamic";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      // 用官方 signIn("credentials") — 自动处理 CSRF 双提交 cookie + callback 跳转
      const result = await signIn("credentials", {
        phone,
        password,
        redirect: false,
        callbackUrl,
      });

      if (!result) {
        setError("登录失败，请稍后重试");
        return;
      }

      if (result.ok && !result.error) {
        // 按会话中的真实角色决定落地页：门店账号（管理员/后厨）进后台，
        // 普通顾客始终留在顾客端，避免顾客被 /admin 的 callbackUrl 带进后台后
        // 再被权限校验弹回首页。
        let role: string | undefined;
        try {
          const sess = await fetch("/api/auth/session").then((r) => r.json());
          role = sess?.user?.role;
        } catch {
          role = undefined;
        }
        const isStaff = role === "ADMIN" || role === "KITCHEN";
        const dest = isStaff
          ? "/admin/dashboard"
          : callbackUrl.startsWith("/admin")
          ? "/"
          : callbackUrl;
        router.refresh();
        router.push(dest);
      } else if (result.status === 401 || result.error) {
        setError("手机号或密码错误");
      } else {
        setError("登录失败：" + (result.error || "未知错误"));
      }
    } catch (err) {
      setError("登录失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-accent-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🥟</div>
          <h1 className="text-2xl font-bold text-primary-700">原味生活饺子馆</h1>
          <p className="text-stone-500 text-sm mt-1">欢迎登录</p>
        </div>

        <form className="card p-8" onSubmit={onSubmit}>
          <div className="space-y-4">
            <div>
              <label className="label">手机号</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  className="input !pl-10"
                  type="tel"
                  placeholder="请输入手机号"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  maxLength={11}
                />
              </div>
            </div>
            <div>
              <label className="label">密码</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  className="input !pl-10"
                  type="password"
                  placeholder="请输入密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {error && (
              <div className="text-sm text-accent-600 bg-accent-50 p-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn-primary w-full !py-3"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              {loading ? "登录中..." : "登录"}
            </button>
          </div>

          {/* 注册入口 */}
          <div className="mt-5 text-center text-sm text-stone-600 border-t border-stone-100 pt-5">
            还没有账号？
            <Link href="/auth/register" className="text-primary-600 font-medium hover:underline ml-1">
              立即注册
            </Link>
            <div className="mt-3 text-xs text-stone-400">
              注册后可保存收货地址、查看历史订单、跟踪配送进度
            </div>
          </div>
        </form>

        <div className="text-center mt-6 text-sm text-stone-500">
          <Link href="/" className="hover:text-primary-600">← 返回首页</Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-stone-400">加载中...</div>}>
      <LoginForm />
    </Suspense>
  );
}

