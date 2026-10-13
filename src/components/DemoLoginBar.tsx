"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Phone, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { signIn } from "next-auth/react";

/**
 * 演示登录条 - demo 阶段专用
 *
 * 真实接入微信小程序后此组件可移除，替换为：
 *   - 小程序 wx.login() → 后端 code2session 换 openid 自动建账
 *   - <button open-type="phoneOneClickLogin"> 一键授权手机号
 *
 * 当前演示模式流程：
 *   1. 调用 /api/auth/demo-login 用手机号 upsert 一个 CUSTOMER 用户（固定演示密码）
 *   2. 用 NextAuth signIn("credentials") 完成登录，写入 JWT session
 *   3. router.refresh() 让 Server Component 重新读 session
 */
export function DemoLoginBar({
  compact = false,
  onLoggedIn,
}: {
  compact?: boolean;
  onLoggedIn?: () => void;
}) {
  const router = useRouter();
  const [sessionUser, setSessionUser] = useState<{ name?: string; phone?: string } | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 检测当前 session
  const refreshSession = async () => {
    setSessionLoading(true);
    try {
      const res = await fetch("/api/auth/session");
      const data = await res.json();
      if (data?.user) {
        setSessionUser({ name: data.user.name, phone: data.user.phone });
      } else {
        setSessionUser(null);
      }
    } catch {
      setSessionUser(null);
    } finally {
      setSessionLoading(false);
    }
  };

  useEffect(() => {
    refreshSession();
  }, []);

  const handleDemoLogin = async () => {
    setError("");
    if (!/^1\d{10}$/.test(phone)) {
      setError("请输入正确的11位手机号");
      return;
    }
    setLoading(true);
    try {
      // 1. 调演示登录接口：创建/复用用户，拿到固定密码
      const r1 = await fetch("/api/auth/demo-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const d1 = await r1.json();
      if (!r1.ok) throw new Error(d1.error || "演示登录失败");

      // 2. 用 NextAuth signIn 完成真实登录，写 session
      const r2 = await signIn("credentials", {
        phone: d1.phone,
        password: d1.password,
        redirect: false,
      });
      if (!r2 || r2.error) {
        throw new Error(r2?.error || "登录失败");
      }

      // 3. 刷新前端 session 状态 + 通知 server 端重读
      await refreshSession();
      router.refresh();
      onLoggedIn?.();
    } catch (e: any) {
      setError(e?.message || "演示登录失败");
    } finally {
      setLoading(false);
    }
  };

  // 紧凑模式：仅显示状态，不显示登录表单（用于购物车右上角等小区域）
  if (compact) {
    if (sessionLoading) return null;
    if (sessionUser) {
      return (
        <span className="text-xs text-stone-500">
          已登录：{sessionUser.phone?.slice(-4)}
        </span>
      );
    }
    return null;
  }

  if (sessionLoading) {
    return (
      <div className="card p-3 mb-3 flex items-center gap-2 text-sm text-stone-400">
        <Loader2 className="w-4 h-4 animate-spin" /> 检查登录状态...
      </div>
    );
  }

  if (sessionUser) {
    return (
      <div className="card p-3 mb-3 flex items-center gap-2 text-sm text-green-700 bg-green-50 border-green-200">
        <CheckCircle2 className="w-4 h-4" />
        已登录：{sessionUser.name} · {sessionUser.phone?.slice(0, 3)}****{sessionUser.phone?.slice(-4)}
      </div>
    );
  }

  return (
    <div className="card p-4 mb-4 border-primary-200 bg-primary-50/50">
      <div className="flex items-start gap-2 mb-3">
        <Phone className="w-5 h-5 text-primary-600 mt-0.5 shrink-0" />
        <div>
          <div className="font-bold text-primary-800 text-sm">
            演示模式：手机号一键登录
          </div>
          <div className="text-xs text-stone-500 mt-0.5">
            输入手机号即可下单，无需注册。正式上线后将自动用微信静默登录，体验更顺滑。
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        <input
          type="tel"
          maxLength={11}
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
          placeholder="请输入11位手机号"
          className="input !py-2 flex-1"
        />
        <button
          onClick={handleDemoLogin}
          disabled={loading || phone.length !== 11}
          className="btn-primary !py-2 px-4 text-sm flex items-center gap-1.5"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Phone className="w-4 h-4" />
          )}
          {loading ? "登录中" : "一键登录"}
        </button>
      </div>
      {error && (
        <div className="mt-2 flex items-start gap-1.5 text-sm text-accent-700 bg-accent-50 rounded p-2">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}
