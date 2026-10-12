"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Phone, Lock, User, Loader2, MessageCircle } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ phone: "", password: "", name: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      // 注册成功 → 跳去登录页
      router.push("/auth/login?registered=1&phone=" + encodeURIComponent(form.phone));
    } catch (err: any) {
      setError(err.message || "注册失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 p-4">
      <div className="card w-full max-w-md p-8">
        <div className="text-center mb-6">
          <div className="text-5xl mb-2">🥟</div>
          <h1 className="text-2xl font-bold text-primary-700">素生活·原味生活</h1>
          <p className="text-stone-500 text-sm mt-1">顾客注册</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm text-stone-600 mb-1.5">姓名/昵称</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                className="input pl-10"
                placeholder="怎么称呼你呢？"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-stone-600 mb-1.5">手机号</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                className="input pl-10"
                placeholder="11位手机号"
                maxLength={11}
                value={form.phone}
                onChange={(e) =>
                  setForm({ ...form, phone: e.target.value.replace(/\D/g, "") })
                }
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-stone-600 mb-1.5">密码</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                type="password"
                className="input pl-10"
                placeholder="至少6位"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
          </div>

          {error && (
            <div className="bg-accent-50 border border-accent-200 rounded-lg px-3 py-2 text-sm text-accent-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full !py-3 flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <UserPlus className="w-4 h-4" />
            )}
            {loading ? "注册中..." : "注册账号"}
          </button>
        </form>

        <div className="mt-5 text-center text-sm text-stone-500 space-y-2">
          <div>
            已有账号？{" "}
            <Link href="/auth/login" className="text-primary-600 font-medium hover:underline">
              去登录
            </Link>
          </div>
          <div className="pt-2 border-t border-stone-100 text-stone-400 flex items-center justify-center gap-1">
            <MessageCircle className="w-3.5 h-3.5" />
            门店电话：18301576627
          </div>
        </div>

        {/* 微信登录占位（待配置微信开放平台后显示） */}
        {process.env.NEXT_PUBLIC_WECHAT_ENABLED === "1" && (
          <div className="mt-5 pt-5 border-t border-stone-100">
            <button className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-[#07c160] text-white font-medium hover:bg-[#06ae56] transition-colors">
              <svg className="w-5 h-5" viewBox="0 0 1024 1024" fill="currentColor">
                <path d="M472.7 112.4C256.6 112.4 80.7 252.8 80.7 429.4c0 101.3 55.4 190.9 148 253.5L203.5 787.9l119-59.3c43.5 8.5 83.8 15.5 129.4 15.5 13.5 0 26.8-.5 39.9-1.4-2-8.2-3.1-16.6-3.1-25.3 0-121 137.1-218.8 306.3-218.8 18.4 0 36.4 1.1 54 3.2-21-174.5-198.8-306.6-416.3-306.6z m-115.4 137.3c28.4 0 51.3 22.9 51.3 51.3 0 28.4-22.9 51.3-51.3 51.3-28.4 0-51.3-22.9-51.3-51.3 0-28.4 22.9-51.3 51.3-51.3z m230.8 0c28.4 0 51.3 22.9 51.3 51.3 0 28.4-22.9 51.3-51.3 51.3-28.4 0-51.3-22.9-51.3-51.3 0-28.4 22.9-51.3 51.3-51.3zM943.3 608.4c0-95.5-109.2-172.8-244.4-172.8s-244.4 77.3-244.4 172.8 109.2 172.8 244.4 172.8c25.7 0 50.4-3.1 73.2-8.8L865 797l19-88.8c37.4-34 59.3-79.8 59.3-99.8z m-161.1-42.4c-19 0-34.3-15.3-34.3-34.2s15.3-34.2 34.3-34.2c19 0 34.3 15.3 34.3 34.2s-15.3 34.2-34.3 34.2z m131.8 0c-19 0-34.3-15.3-34.3-34.2s15.3-34.2 34.3-34.2 34.3 15.3 34.3 34.2-15.3 34.2-34.3 34.2z" />
              </svg>
              微信一键登录
            </button>
            <p className="text-xs text-stone-400 mt-2 text-center">
              微信授权登录可帮助你自动保存收货地址和订单信息
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
