"use client";

import { useEffect, useState } from "react";
import { Settings, Save, Loader2 } from "lucide-react";
import { AdminShell } from "@/components/AdminShell";

type ConfigItem = {
  id: string;
  key: string;
  value: string;
  description: string | null;
};

const KEY_LABELS: Record<string, string> = {
  STORE_NAME: "门店名称",
  STORE_PHONE: "门店联系电话",
  PICKUP_ADDRESS: "自取地址",
  BUSINESS_HOURS: "营业时间配置 (JSON)",
  DAILY_LIMIT: "每日销售上限（盒）",
  FOAM_BOX_PRICE: "泡沫箱单价（分）",
  FOAM_BOX_CAPACITY: "每个泡沫箱可装盒数",
};

const KEY_PLACEHOLDERS: Record<string, string> = {
  STORE_NAME: "素生活·原味生活饺子馆",
  STORE_PHONE: "18301576627 或 010-xxxxxxxx",
  PICKUP_ADDRESS: "北京昌平路181号院卢卡新天地3号楼底商负107 素生活",
  BUSINESS_HOURS:
    '{"weekdays":"9:30-20:30","weekend":"9:30-20:30","holidays":"9:30-20:30（节假日正常营业）","pickupSlots":["09:30-11:30","11:30-13:30","13:30-15:30","15:30-17:30","17:30-19:30","19:30-20:30"]}',
  DAILY_LIMIT: "100",
  FOAM_BOX_PRICE: "500 (即 5 元)",
  FOAM_BOX_CAPACITY: "5",
};

export default function AdminSettingsPageClient() {
  const [configs, setConfigs] = useState<ConfigItem[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/configs");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "加载失败");
      setConfigs(data.configs || []);
      const v: Record<string, string> = {};
      for (const c of data.configs || []) {
        v[c.key] = c.value;
      }
      // 补齐缺失的 key（确保展示全部）
      for (const k of Object.keys(KEY_LABELS)) {
        if (v[k] === undefined) v[k] = "";
      }
      setValues(v);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    setError("");
    setSaving(true);
    try {
      const updates = Object.entries(values).map(([key, value]) => ({
        key,
        value: value.trim(),
      }));
      const res = await fetch("/api/admin/configs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "保存失败");
      setToast("✅ 保存成功");
      setTimeout(() => setToast(""), 2500);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const displayKeys = Object.keys(KEY_LABELS);

  return (
    <AdminShell role="ADMIN">
      <main className="flex-1 overflow-auto p-4 md:p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Settings className="w-7 h-7 text-primary-600" /> 系统配置
            </h1>
            <p className="text-stone-500 text-sm mt-1">门店信息、营业参数、快递配置</p>
          </div>
          <button
            onClick={save}
            disabled={saving || loading}
            className="btn-primary flex items-center gap-1.5 text-sm disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? "保存中..." : "保存全部"}
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
          <div className="card p-6">
            <div className="grid md:grid-cols-2 gap-5 max-w-4xl">
              {displayKeys.map((k) => (
                <div key={k} className={k === "BUSINESS_HOURS" || k === "PICKUP_ADDRESS" ? "md:col-span-2" : ""}>
                  <label className="label">
                    {KEY_LABELS[k]}
                    <span className="ml-1 text-xs text-stone-400">
                      ({k})
                    </span>
                  </label>
                  {k === "BUSINESS_HOURS" || k === "PICKUP_ADDRESS" ? (
                    <textarea
                      className="textarea font-mono text-sm"
                      rows={k === "BUSINESS_HOURS" ? 6 : 3}
                      placeholder={KEY_PLACEHOLDERS[k]}
                      value={values[k] ?? ""}
                      onChange={(e) => setValues({ ...values, [k]: e.target.value })}
                    />
                  ) : (
                    <input
                      className="input"
                      placeholder={KEY_PLACEHOLDERS[k]}
                      value={values[k] ?? ""}
                      onChange={(e) => setValues({ ...values, [k]: e.target.value })}
                      type={
                        k === "DAILY_LIMIT" || k === "FOAM_BOX_PRICE" || k === "FOAM_BOX_CAPACITY"
                          ? "number"
                          : "text"
                      }
                    />
                  )}
                  <div className="mt-1 text-xs text-stone-400">
                    {configs.find((c) => c.key === k)?.description}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-5 border-t border-stone-100 flex justify-end">
              <button
                onClick={save}
                disabled={saving}
                className="btn-primary flex items-center gap-1.5 text-sm disabled:opacity-50"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                <Save className="w-4 h-4" /> 保存全部修改
              </button>
            </div>
          </div>
        )}
      </main>

      {toast && (
        <div className="fixed top-5 right-5 z-50 bg-stone-900 text-white px-4 py-2.5 rounded-lg shadow-lg text-sm">
          {toast}
        </div>
      )}
    </AdminShell>
  );
}
