"use client";

import { useEffect, useState } from "react";
import {
  Users,
  UserPlus,
  Ban,
  CheckCircle2,
  KeyRound,
  Loader2,
  X,
  Pencil,
  Trash2,
} from "lucide-react";
import { AdminShell } from "@/components/AdminShell";

type Role = "ADMIN" | "KITCHEN" | "CUSTOMER";

type UserRow = {
  id: string;
  name: string;
  phone: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
  _count?: { orders: number };
};

type Group = "staff" | "customer";

export default function AdminUsersPageClient() {
  const [group, setGroup] = useState<Group>("staff");
  const [users, setUsers] = useState<UserRow[]>([]);
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
  const [resetUser, setResetUser] = useState<UserRow | null>(null);
  const [resetPwd, setResetPwd] = useState("");
  const [resetting, setResetting] = useState(false);

  // 修改顾客手机号弹窗
  const [editPhoneUser, setEditPhoneUser] = useState<UserRow | null>(null);
  const [editPhoneValue, setEditPhoneValue] = useState("");
  const [savingPhone, setSavingPhone] = useState(false);

  // 修改顾客昵称弹窗
  const [editNameUser, setEditNameUser] = useState<UserRow | null>(null);
  const [editNameValue, setEditNameValue] = useState("");
  const [savingName, setSavingName] = useState(false);

  const load = async (g: Group) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/users?group=${g}`);
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
    load(group);
  }, [group]);

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
      load(group);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (u: UserRow) => {
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
      load(group);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const changeRole = async (u: UserRow, role: "ADMIN" | "KITCHEN") => {
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
      load(group);
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

  const savePhone = async () => {
    if (!editPhoneUser) return;
    const next = editPhoneValue.trim();
    if (!/^1[3-9]\d{9}$/.test(next)) {
      setError("请输入正确的11位手机号");
      return;
    }
    setSavingPhone(true);
    setError("");
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editPhoneUser.id,
          action: "UPDATE_PHONE",
          phone: next,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "修改失败");
      setEditPhoneUser(null);
      setEditPhoneValue("");
      showToast("✅ 手机号已更新");
      load(group);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSavingPhone(false);
    }
  };

  const saveName = async () => {
    if (!editNameUser) return;
    const next = editNameValue.trim();
    if (!next) {
      setError("昵称不能为空");
      return;
    }
    setSavingName(true);
    setError("");
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editNameUser.id,
          action: "UPDATE_NAME",
          name: next,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "修改失败");
      setEditNameUser(null);
      setEditNameValue("");
      showToast("✅ 昵称已更新");
      load(group);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSavingName(false);
    }
  };

  const deleteCustomer = async (u: UserRow) => {
    if (!confirm(`确定删除顾客「${u.name} / ${u.phone}」吗？此操作不可撤销。`))
      return;
    try {
      const res = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: u.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "删除失败");
      showToast("✅ 已删除");
      load(group);
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <AdminShell role="ADMIN">
      <main className="flex-1 overflow-auto p-4 md:p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="w-7 h-7 text-primary-600" /> 用户管理
            </h1>
            <p className="text-stone-500 text-sm mt-1">
              {group === "staff"
                ? "管理员与后厨员工账号"
                : "注册顾客账号（含一键登录的微信昵称与手机号）"}
            </p>
          </div>
          {group === "staff" && (
            <button
              className="btn-primary flex items-center gap-1.5 text-sm"
              onClick={() => setShowCreate(true)}
            >
              <UserPlus className="w-4 h-4" /> 新增员工
            </button>
          )}
        </div>

        {/* 权限分组：管理员/员工 与 顾客 */}
        <div className="mb-4 flex gap-2">
          {(
            [
              { key: "staff", label: "管理员 / 员工" },
              { key: "customer", label: "顾客" },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              onClick={() => setGroup(t.key)}
              className={`px-4 py-2 rounded-lg text-sm border transition-colors ${
                group === t.key
                  ? "border-primary-300 bg-primary-50 text-primary-700 ring-1 ring-primary-200"
                  : "border-stone-200 text-stone-600 hover:border-stone-300"
              }`}
            >
              {t.label}
            </button>
          ))}
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
                  <th className="text-left px-5 py-3">
                    {group === "staff" ? "员工" : "顾客"}
                  </th>
                  <th className="text-left px-5 py-3">手机号</th>
                  <th className="text-left px-5 py-3">角色</th>
                  {group === "customer" && (
                    <th className="text-left px-5 py-3">订单数</th>
                  )}
                  <th className="text-left px-5 py-3">状态</th>
                  <th className="text-left px-5 py-3">注册时间</th>
                  <th className="text-right px-5 py-3">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {users.length === 0 && (
                  <tr>
                    <td
                      colSpan={group === "customer" ? 7 : 6}
                      className="px-5 py-12 text-center text-stone-400"
                    >
                      {group === "staff"
                        ? "暂无员工账号"
                        : "暂无顾客账号（顾客使用微信一键登录后会自动出现在这里）"}
                    </td>
                  </tr>
                )}
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-stone-50">
                    <td className="px-5 py-3 font-medium">{u.name}</td>
                    <td className="px-5 py-3 font-mono">{u.phone}</td>
                    <td className="px-5 py-3">
                      {u.role === "CUSTOMER" ? (
                        <span className="text-xs text-primary-700 bg-primary-50 px-2 py-0.5 rounded-full">
                          顾客
                        </span>
                      ) : (
                        <select
                          className="text-xs border border-stone-200 rounded px-2 py-1"
                          value={u.role}
                          onChange={(e) => changeRole(u, e.target.value as any)}
                        >
                          <option value="ADMIN">管理员</option>
                          <option value="KITCHEN">后厨</option>
                        </select>
                      )}
                    </td>
                    {group === "customer" && (
                      <td className="px-5 py-3 text-stone-600">
                        {u._count?.orders ?? 0}
                      </td>
                    )}
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
                      {u.role === "CUSTOMER" && (
                        <>
                          <button
                            className="text-xs text-stone-600 hover:text-primary-600 inline-flex items-center gap-1 mr-3"
                            onClick={() => {
                              setEditNameUser(u);
                              setEditNameValue(u.name);
                            }}
                          >
                            <Pencil className="w-3 h-3" /> 改昵称
                          </button>
                          <button
                            className="text-xs text-stone-600 hover:text-primary-600 inline-flex items-center gap-1 mr-3"
                            onClick={() => {
                              setEditPhoneUser(u);
                              setEditPhoneValue(u.phone);
                            }}
                          >
                            <Pencil className="w-3 h-3" /> 改手机号
                          </button>
                          <button
                            className="text-xs text-accent-600 hover:text-accent-700 inline-flex items-center gap-1 mr-3"
                            onClick={() => deleteCustomer(u)}
                          >
                            <Trash2 className="w-3 h-3" /> 删除
                          </button>
                        </>
                      )}
                      {u.role !== "CUSTOMER" && (
                        <button
                          className="text-xs text-stone-600 hover:text-primary-600 inline-flex items-center gap-1 mr-3"
                          onClick={() => {
                            setResetUser(u);
                            setResetPwd("");
                          }}
                        >
                          <KeyRound className="w-3 h-3" /> 重置密码
                        </button>
                      )}
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

      {/* 修改顾客手机号弹窗 */}
      {editPhoneUser && (
        <Modal
          title={`修改手机号 · ${editPhoneUser.name}`}
          onClose={() => setEditPhoneUser(null)}
        >
          <div className="space-y-3">
            <div className="text-xs text-stone-500">
              当前手机号：{editPhoneUser.phone}。修改后顾客需用新手机号一键登录，历史订单不受影响。
            </div>
            <div>
              <label className="label">新手机号</label>
              <input
                className="input"
                type="tel"
                value={editPhoneValue}
                onChange={(e) =>
                  setEditPhoneValue(e.target.value.replace(/\D/g, ""))
                }
                maxLength={11}
                autoFocus
                required
              />
            </div>
            <div className="pt-2 flex gap-3 justify-end">
              <button
                className="px-4 py-2 rounded-lg text-sm border border-stone-200 hover:bg-stone-50"
                onClick={() => setEditPhoneUser(null)}
                disabled={savingPhone}
              >
                取消
              </button>
              <button
                className="btn-primary text-sm flex items-center gap-1.5"
                disabled={savingPhone || editPhoneValue.trim().length !== 11}
                onClick={savePhone}
              >
                {savingPhone && <Loader2 className="w-4 h-4 animate-spin" />}
                保存
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* 修改顾客昵称弹窗 */}
      {editNameUser && (
        <Modal
          title={`修改昵称 · ${editNameUser.name}`}
          onClose={() => setEditNameUser(null)}
        >
          <div className="space-y-3">
            <div className="text-xs text-stone-500">
              顾客昵称会显示在订单列表、顾客端订单详情里。不会影响手机号与下单。
            </div>
            <div>
              <label className="label">新昵称</label>
              <input
                className="input"
                type="text"
                value={editNameValue}
                onChange={(e) => setEditNameValue(e.target.value)}
                maxLength={20}
                autoFocus
                required
              />
            </div>
            <div className="pt-2 flex gap-3 justify-end">
              <button
                className="px-4 py-2 rounded-lg text-sm border border-stone-200 hover:bg-stone-50"
                onClick={() => setEditNameUser(null)}
                disabled={savingName}
              >
                取消
              </button>
              <button
                className="btn-primary text-sm flex items-center gap-1.5"
                disabled={savingName || !editNameValue.trim()}
                onClick={saveName}
              >
                {savingName && <Loader2 className="w-4 h-4 animate-spin" />}
                保存
              </button>
            </div>
          </div>
        </Modal>
      )}
    </AdminShell>
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
