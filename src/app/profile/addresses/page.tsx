"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  MapPin,
  Plus,
  Edit3,
  Trash2,
  CheckCircle2,
  Loader2,
  X,
  ArrowLeft,
} from "lucide-react";

type Address = {
  id: string;
  name: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  detail: string;
  isDefault: boolean;
};

const EMPTY_FORM = {
  name: "",
  phone: "",
  province: "",
  city: "",
  district: "",
  detail: "",
  isDefault: false,
};

export default function AddressesPage() {
  const [list, setList] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Address | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [error, setError] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/addresses");
    const data = await res.json();
    setList(data.list || []);
    setLoading(false);
  }

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setError("");
    setShowForm(true);
  }

  function openEdit(addr: Address) {
    setEditing(addr);
    setForm({
      name: addr.name,
      phone: addr.phone,
      province: addr.province,
      city: addr.city,
      district: addr.district,
      detail: addr.detail,
      isDefault: addr.isDefault,
    });
    setError("");
    setShowForm(true);
  }

  async function save() {
    setSaving(true);
    setError("");
    const url = editing
      ? `/api/addresses/${editing.id}`
      : "/api/addresses";
    const method = editing ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "保存失败");
      return;
    }
    setShowForm(false);
    await load();
  }

  async function remove(id: string) {
    if (!confirm("确定删除这个地址吗？")) return;
    const res = await fetch(`/api/addresses/${id}`, { method: "DELETE" });
    if (res.ok) await load();
  }

  async function setDefault(id: string) {
    const addr = list.find((a) => a.id === id);
    if (!addr) return;
    await fetch(`/api/addresses/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...addr, isDefault: true }),
    });
    await load();
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link
        href="/profile"
        className="inline-flex items-center gap-1 text-sm text-stone-400 hover:text-primary-600 mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> 用户中心
      </Link>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MapPin className="w-6 h-6 text-primary-600" /> 收货地址
        </h1>
        <button className="btn-primary flex items-center gap-1.5 text-sm" onClick={openCreate}>
          <Plus className="w-4 h-4" /> 新增地址
        </button>
      </div>

      {loading ? (
        <div className="card p-12 text-center text-stone-400">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-3" /> 加载中...
        </div>
      ) : list.length === 0 ? (
        <div className="card p-12 text-center text-stone-400">
          <MapPin className="w-10 h-10 mx-auto mb-3 opacity-40" />
          还没有收货地址，点击右上角添加
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((addr) => (
            <div key={addr.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{addr.name}</span>
                    <span className="text-sm text-stone-500">{addr.phone}</span>
                    {addr.isDefault && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> 默认
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-stone-600">
                    {addr.province}
                    {addr.city}
                    {addr.district}
                    {addr.detail}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => openEdit(addr)}
                    className="p-2 rounded-lg hover:bg-stone-100 text-stone-500"
                    title="编辑"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => remove(addr.id)}
                    className="p-2 rounded-lg hover:bg-red-50 text-red-500"
                    title="删除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {!addr.isDefault && (
                <button
                  onClick={() => setDefault(addr.id)}
                  className="mt-2 text-xs text-primary-600 hover:underline"
                >
                  设为默认地址
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="font-bold">
                {editing ? "编辑地址" : "新增地址"}
              </h2>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-stone-100 rounded">
                <X className="w-5 h-5 text-stone-400" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              {error && (
                <div className="p-2 rounded bg-red-50 text-red-600 text-sm">
                  {error}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <Field label="收件人" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="姓名" />
                <Field label="手机号" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="11位手机号" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Field label="省" value={form.province} onChange={(v) => setForm({ ...form, province: v })} placeholder="北京" />
                <Field label="市" value={form.city} onChange={(v) => setForm({ ...form, city: v })} placeholder="北京市" />
                <Field label="区" value={form.district} onChange={(v) => setForm({ ...form, district: v })} placeholder="昌平区" />
              </div>
              <Field label="详细地址" value={form.detail} onChange={(v) => setForm({ ...form, detail: v })} placeholder="街道门牌号" />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isDefault}
                  onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                />
                设为默认地址
              </label>
            </div>
            <div className="p-4 border-t flex gap-2">
              <button onClick={() => setShowForm(false)} className="flex-1 btn-secondary">
                取消
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="flex-1 btn-primary flex items-center justify-center gap-1.5"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />} 保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs text-stone-500 mb-1">{label}</label>
      <input
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}
