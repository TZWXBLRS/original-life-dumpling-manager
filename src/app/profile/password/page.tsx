"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, KeyRound, Loader2, CheckCircle2 } from "lucide-react";

export default function ChangePasswordPage() {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit() {
    setError("");
    if (newPassword.length < 6) {
      setError("新密码至少6位");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("两次输入的新密码不一致");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ oldPassword, newPassword }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "修改失败");
      return;
    }
    setDone(true);
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <Link
        href="/profile"
        className="inline-flex items-center gap-1 text-sm text-stone-400 hover:text-primary-600 mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> 用户中心
      </Link>
      <h1 className="text-2xl font-bold flex items-center gap-2 mb-6">
        <KeyRound className="w-6 h-6 text-primary-600" /> 修改密码
      </h1>

      {done ? (
        <div className="card p-8 text-center">
          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <div className="font-medium mb-1">密码修改成功</div>
          <p className="text-sm text-stone-400 mb-4">下次登录请使用新密码</p>
          <Link href="/profile" className="btn-primary inline-block px-6 py-2">
            返回用户中心
          </Link>
        </div>
      ) : (
        <div className="card p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm">
              {error}
            </div>
          )}
          <div>
            <label className="block text-xs text-stone-500 mb-1">原密码</label>
            <input
              type="password"
              className="input"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="请输入原密码"
            />
          </div>
          <div>
            <label className="block text-xs text-stone-500 mb-1">新密码</label>
            <input
              type="password"
              className="input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="至少6位"
            />
          </div>
          <div>
            <label className="block text-xs text-stone-500 mb-1">确认新密码</label>
            <input
              type="password"
              className="input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="再次输入新密码"
            />
          </div>
          <button
            onClick={submit}
            disabled={loading || !oldPassword || !newPassword || !confirmPassword}
            className="btn-primary w-full flex items-center justify-center gap-1.5"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />} 确认修改
          </button>
        </div>
      )}
    </div>
  );
}
