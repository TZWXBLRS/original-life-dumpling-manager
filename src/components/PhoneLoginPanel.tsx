"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import {
  Phone,
  Loader2,
  MessageSquare,
  ChevronDown,
  User,
  ShieldCheck,
} from "lucide-react";
import { PROVINCE_OPTIONS } from "@/lib/regions";

/**
 * 顾客一键登录面板 —— 顾客端统一登录入口（右上角菜单 / 购物车页共用）
 *
 * - 未配置短信服务商：输入手机号即可登录
 * - 已配置短信服务商：需先获取并填写验证码
 * - 可展开「填写姓名 / 收货地址（可选）」，登录后记住，下单时自动带出
 */
export function PhoneLoginPanel({
  onLoggedIn,
  autoFocus = false,
}: {
  onLoggedIn?: () => void;
  autoFocus?: boolean;
}) {
  const router = useRouter();

  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [smsEnabled, setSmsEnabled] = useState<boolean>(false);
  const [cooldown, setCooldown] = useState(0);
  const [sending, setSending] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [wechatName, setWechatName] = useState("");
  const [addr, setAddr] = useState({
    province: "",
    city: "",
    district: "",
    detail: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 是否启用验证码（由服务端是否配置短信服务商决定）
  useEffect(() => {
    fetch("/api/auth/send-code")
      .then((r) => r.json())
      .then((d) => setSmsEnabled(Boolean(d?.smsEnabled)))
      .catch(() => setSmsEnabled(false));
  }, []);

  // 重发倒计时
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const phoneOk = /^1\d{10}$/.test(phone);
  const hasProfileInput =
    Boolean(wechatName) || Boolean(addr.province) || Boolean(addr.detail);

  const sendCode = async () => {
    setError("");
    if (!phoneOk) {
      setError("请输入正确的11位手机号");
      return;
    }
    setSending(true);
    try {
      const r = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "验证码发送失败");
      setSmsEnabled(Boolean(d.smsEnabled));
      setCooldown(60);
    } catch (e: any) {
      setError(e?.message || "验证码发送失败");
    } finally {
      setSending(false);
    }
  };

  const login = async () => {
    setError("");
    if (!phoneOk) {
      setError("请输入正确的11位手机号");
      return;
    }
    if (smsEnabled && !code) {
      setError("请输入验证码");
      return;
    }
    setLoading(true);
    try {
      const r1 = await fetch("/api/auth/demo-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          code: smsEnabled ? code : undefined,
          wechatName: wechatName || undefined,
          address: hasProfileInput ? addr : undefined,
        }),
      });
      const d1 = await r1.json();
      if (!r1.ok) throw new Error(d1.error || "登录失败");

      const r2 = await signIn("credentials", {
        phone: d1.phone,
        password: d1.password,
        redirect: false,
      });
      if (!r2 || r2.error) throw new Error(r2?.error || "登录失败");

      router.refresh();
      onLoggedIn?.();
    } catch (e: any) {
      setError(e?.message || "登录失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="label">手机号</label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            className="input !pl-10"
            type="tel"
            maxLength={11}
            autoFocus={autoFocus}
            placeholder="请输入11位手机号"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
          />
        </div>
      </div>

      {smsEnabled && (
        <div>
          <label className="label">短信验证码</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                className="input !pl-10"
                inputMode="numeric"
                maxLength={6}
                placeholder="6位验证码"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              />
            </div>
            <button
              type="button"
              onClick={sendCode}
              disabled={!phoneOk || sending || cooldown > 0}
              className="btn-secondary !py-2 px-3 text-sm whitespace-nowrap disabled:opacity-50"
            >
              {sending ? "发送中" : cooldown > 0 ? `${cooldown}s` : "获取验证码"}
            </button>
          </div>
        </div>
      )}

      {/* 下拉可选项：姓名 / 收货地址 */}
      <div className="rounded-lg border border-stone-200">
        <button
          type="button"
          onClick={() => setShowProfile((v) => !v)}
          className="flex w-full items-center justify-between px-3 py-2 text-sm text-stone-600 hover:bg-stone-50"
        >
          <span className="flex items-center gap-1.5">
            <User className="w-4 h-4" /> 填写姓名 / 收货地址（可选）
          </span>
          <ChevronDown
            className={`w-4 h-4 transition-transform ${
              showProfile ? "rotate-180" : ""
            }`}
          />
        </button>
        {showProfile && (
          <div className="space-y-2 border-t border-stone-100 p-3">
            <input
              className="input !py-2 text-sm"
              placeholder="姓名 / 微信名"
              maxLength={20}
              value={wechatName}
              onChange={(e) => setWechatName(e.target.value)}
            />
            <div className="grid grid-cols-3 gap-2">
              <select
                className="input !py-2 text-sm"
                value={addr.province}
                onChange={(e) => setAddr({ ...addr, province: e.target.value })}
              >
                <option value="">省份</option>
                {PROVINCE_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <input
                className="input !py-2 text-sm"
                placeholder="城市"
                value={addr.city}
                onChange={(e) => setAddr({ ...addr, city: e.target.value })}
              />
              <input
                className="input !py-2 text-sm"
                placeholder="区/县"
                value={addr.district}
                onChange={(e) => setAddr({ ...addr, district: e.target.value })}
              />
            </div>
            <input
              className="input !py-2 text-sm"
              placeholder="详细地址（街道 / 楼号 / 门牌号）"
              value={addr.detail}
              onChange={(e) => setAddr({ ...addr, detail: e.target.value })}
            />
            <p className="text-xs text-stone-400">登录后会记住，下单时自动带出</p>
          </div>
        )}
      </div>

      {error && (
        <div className="text-sm text-accent-600 bg-accent-50 p-2 rounded-lg">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={login}
        disabled={loading || !phoneOk || (smsEnabled && code.length < 4)}
        className="btn-primary w-full !py-3 flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <ShieldCheck className="w-4 h-4" />
        )}
        {loading ? "登录中..." : "一键登录"}
      </button>
      <p className="text-xs text-stone-400 text-center">
        {smsEnabled ? "需短信验证码，安全登录" : "输入手机号即可下单，无需注册"}
      </p>
    </div>
  );
}
