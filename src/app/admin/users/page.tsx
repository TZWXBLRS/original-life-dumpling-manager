"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  ShoppingBasket,
  Package,
  Users,
  Settings,
  ChefHat,
  UserPlus,
  Ban,
  CheckCircle2,
  Edit3,
  KeyRound,
  Loader2,
  X,
} from "lucide-react";

type StaffUser = {
  id: string;
  name: string;
  phone: string;
  role: "ADMIN" | "KITCHEN";
  isActive: boolean;
  createdAt: string;
};

export default function AdminUsersPageClient() {
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  // 新建员工弹窗
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newRole, setNewRole] = useState<"ADMIN" | "KITCHEN">("KITCHEN");
  const [newPwd, setNewPwd] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // 重置密码弹窗
  const [resetUser, setResetUser] = useState<StaffUser | null>(null);
  const [resetPwd, setResetPwd] = useState("");
  const [resetting, setResetting] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "加载失败");
      setUsers(data.users || []);
    } catch (e: any) {
      setError(e.message || "加载失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  };

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          phone: newPhone.trim(),
          role: newRole,
          password: newPwd,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "创建失败");
      setShowCreate(false);
      setNewName("");
      setNewPhone("");
      setNewRole("KITCHEN");
      setNewPwd("");
      showToast("✅ 创建成功");
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (u: StaffUser) => {
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: u.id,
          action: "TOGGLE_ACTIVE",
          isActive: !u.isActive,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "操作失败");
      showToast(u.isActive ? "已禁用" : "已启用");
      load();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const changeRole = async (u: StaffUser, role: "ADMIN" | "KITCHEN") => {
    if (role === u.role) return;
    if (!confirm(`确定将「${u.name}」改为${role === "ADMIN" ? "管理员" : "后厨"}吗？`)) return;
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: u.id, action: "UPDATE_ROLE", role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "修改失败");
      showToast("角色已更新");
      load();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const confirmReset = async () => {
    if (!resetUser) return;
    setResetting(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: resetUser.id,
          action: "RESET_PASSWORD",
          password: resetPwd,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "重置失败");
      setResetUser(null);
      setResetPwd("");
      showToast("✅ 密码重置成功");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-stone-100">
      <aside className="w-60 bg-stone-900 text-stone-200 flex flex-col">
        <div className="p-5 border-b border-stone-800">
          <Link href="/admin/dashboard" className="flex items-center gap-2">
            <span className="text-2xl">🥟</span>
            <div>
              <div className="font-bold text-white">管理后台</div>
              <div className="text-xs text-stone-400">原味生活</div>
            </div>
          </Link>
        </div>
        <nav className="flex-1 p-3 space-y-1 text-sm">
          <NavItem icon={LayoutDashboard} label="仪表盘" href="/admin/dashboard" />
          <NavItem icon={ShoppingBasket} label="订单管理" href="/admin/orders" />
          <NavItem icon={Package} label="库存管理" href="/admin/inventory" />
          <NavItem icon={ChefHat} label="生产看板" href="/admin/production" />
          <div className="pt-3 mt-3 border-t border-stone-800 text-xs text-stone-500 px-3 pb-1">
            管理员权限
          </div>
          <NavItem icon={Users} label="用户管理" href="/admin/users" active />
          <NavItem icon={Settings} label="系统配置" href="/admin/settings" />
        </nav>
        <div className="p-3 border-t border-stone-800 text-xs text-stone-400 space-y-1">
          <div className="px-3 py-2">当前登录：管理员</div>
          <Link
            href="/"
            className="block px-3 py-2 rounded-lg text-sm hover:bg-stone-800 flex items-center gap-2 text-stone-300"
          >
            ← 返回顾客端
          </Link>
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="w-7 h-7 text-primary-600" /> 用户管理
            </h1>
            <p className="text-stone-500 text-sm mt-1">管理员和后厨员工账号管理</p>
          </div>
          <button
            className="btn-primary flex items-center gap-1.5 text-sm"
            onClick={() => setShowCreate(true)}
          >
            <UserPlus className="w-4 h-4" /> 新增员工
          </button>
        </div>

        {error && (
          <div className="card mb-4 p-3 text-sm text-accent-700 bg-accent-50 border border-accent-200">
            {error}
          </div>
        )}

        {loading ? (
          <div className="card p-12 text-center text-stone-400">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-3" /> 加载中...
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 text-stone-500 text-xs">
                <tr>
                  <th className="text-left px-5 py-3">员工</th>
                  <th className="text-left px-5 py-3">手机号</th>
                  <th className="text-left px-5 py-3">角色</th>
                  <th className="text-left px-5 py-3">状态</th>
                  <th className="text-left px-5 py-3">创建时间</th>
                  <th className="text-right px-5 py-3">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-stone-50">
                    <td className="px-5 py-3 font-medium">{u.name}</td>
                    <td className="px-5 py-3 font-mono">{u.phone}</td>
                    <td className="px-5 py-3">
                      <select
                        className="text-xs border border-stone-200 rounded px-2 py-1"
                        value={u.role}
                        onChange={(e) => changeRole(u, e.target.value as any)}
                      >
                        <option value="ADMIN">管理员</option>
                        <option value="KITCHEN">后厨</option>
                      </select>
                    </td>
                    <td className="px-5 py-3">
                      {u.isActive ? (
                        <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" /> 启用中
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full">
                          <Ban className="w-3 h-3" /> 已禁用
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-xs text-stone-400">
                      {new Date(u.createdAt).toLocaleDateString("zh-CN")}
                    </td>
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      <button
                        className="text-xs text-stone-600 hover:text-primary-600 inline-flex items-center gap-1 mr-3"
                        onClick={() => {
                          setResetUser(u);
                          setResetPwd("");
                        }}
                      >
                        <KeyRound className="w-3 h-3" /> 重置密码
                      </button>
                      <button
                        className={`text-xs inline-flex items-center gap-1 ${
                          u.isActive
                            ? "text-accent-600 hover:text-accent-700"
                            : "text-green-600 hover:text-green-700"
                        }`}
                        onClick={() => toggleActive(u)}
                      >
                        {u.isActive ? (
                          <>
                            <Ban className="w-3 h-3" /> 禁用
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3 h-3" /> 启用
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Toast */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 bg-stone-900 text-white px-4 py-2.5 rounded-lg shadow-lg text-sm animate-[fadeIn_.2s]">
          {toast}
        </div>
      )}

      {/* 新增员工弹窗 */}
      {showCreate && (
        <Modal title="新增员工账号" onClose={() => setShowCreate(false)}>
          <form onSubmit={createUser} className="space-y-3">
            <div>
              <label className="label">姓名</label>
              <input
                className="input"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="例如：王师傅"
                required
                maxLength={50}
              />
            </div>
            <div>
              <label className="label">手机号（登录账号）</label>
              <input
                className="input"
                type="tel"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="11位手机号"
                maxLength={11}
                required
              />
            </div>
            <div>
              <label className="label">角色</label>
              <select
                className="input"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as any)}
              >
                <option value="KITCHEN">后厨（仅看板和库存）</option>
                <option value="ADMIN">管理员（全部权限）</option>
              </select>
            </div>
            <div>
              <label className="label">初始密码</label>
              <input
                className="input"
                type="text"
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                placeholder="至少6位"
                minLength={6}
                maxLength={50}
                required
              />
            </div>
            <div className="pt-3 flex gap-3 justify-end">
              <button
                type="button"
                className="px-4 py-2 rounded-lg text-sm border border-stone-200 hover:bg-stone-50"
                onClick={() => setShowCreate(false)}
                disabled={submitting}
              >
                取消
              </button>
              <button
                type="submit"
                className="btn-primary text-sm flex items-center gap-1.5"
                disabled={submitting}
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                创建
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* 重置密码弹窗 */}
      {resetUser && (
        <Modal
          title={`重置密码 · ${resetUser.name}`}
          onClose={() => setResetUser(null)}
        >
          <div className="space-y-3">
            <div className="text-xs text-stone-500">
              请输入新密码（至少6位），设置后告知员工本人。
            </div>
            <div>
              <label className="label">新密码</label>
              <input
                className="input"
                type="text"
                value={resetPwd}
                onChange={(e) => setResetPwd(e.target.value)}
                minLength={6}
                maxLength={50}
                required
                autoFocus
              />
            </div>
            <div className="pt-2 flex gap-3 justify-end">
              <button
                className="px-4 py-2 rounded-lg text-sm border border-stone-200 hover:bg-stone-50"
                onClick={() => setResetUser(null)}
                disabled={resetting}
              >
                取消
              </button>
              <button
                className="btn-primary text-sm flex items-center gap-1.5"
                disabled={resetting || resetPwd.length < 6}
                onClick={confirmReset}
              >
                {resetting && <Loader2 className="w-4 h-4 animate-spin" />}
                确认重置
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function NavItem({
  icon: Icon,
  label,
  href,
  active,
}: {
  icon: any;
  label: string;
  href: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
        active
          ? "bg-primary-600 text-white shadow"
          : "hover:bg-stone-800 text-stone-300"
      }`}
    >
      <Icon className="w-4 h-4" /> {label}
    </Link>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-md shadow-2xl">
        <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
          <h3 className="font-bold">{title}</h3>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
