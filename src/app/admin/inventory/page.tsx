"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Plus,
  Minus,
  Loader2,
  PackageMinus,
  PackagePlus,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

interface Product {
  id: string;
  name: string;
  category: string;
  unitPrice: number;
  stock: number;
  description: string;
}

const STATUS_TEXT = {
  CLASSIC: { label: "经典", cls: "badge-classic" },
  SPECIALTY: { label: "特色", cls: "badge-specialty" },
};

/**
 * 后台 - 库存管理页
 * 功能：
 *  1. 查看当前所有口味库存、单价
 *  2. 入库操作：新增库存
 *  3. 出库操作：减少库存（如：报废、盘点差异）
 *  4. 最近变更记录
 */
export default function AdminInventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [opType, setOpType] = useState<"IN" | "OUT">("IN");
  const [opQty, setOpQty] = useState(10);
  const [opReason, setOpReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/products");
      const data = await res.json();
      setProducts(data.products || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (p: Product) => {
    setSubmitting(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: p.id,
          changeType: opType, // IN 入库 / OUT 出库
          changeAmount: opQty,
          reason: opReason || (opType === "IN" ? "入库" : "出库"),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMsg({
        type: "ok",
        text: `「${p.name}」${opType === "IN" ? "入库" : "出库"}成功：${opQty} 盒`,
      });
      setEditingId(null);
      load();
      setTimeout(() => setMsg(null), 4000);
    } catch (e: any) {
      setMsg({ type: "err", text: e.message || "操作失败" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-100">
      <header className="bg-white border-b border-stone-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center gap-4">
          <Link href="/admin/dashboard" className="text-stone-500 hover:text-primary-600 text-sm">
            ← 仪表盘
          </Link>
          <h1 className="font-bold text-lg flex items-center gap-2">
            库存管理
          </h1>
          <div className="flex-1" />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {msg && (
          <div
            className={`card mb-4 p-3 flex items-center gap-2 text-sm ${
              msg.type === "ok"
                ? "bg-green-50 border-green-200 text-green-800"
                : "bg-accent-50 border-accent-200 text-accent-700"
            }`}
          >
            {msg.type === "ok" ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <AlertTriangle className="w-4 h-4" />
            )}
            {msg.text}
          </div>
        )}

        {loading ? (
          <div className="card p-12 text-center text-stone-400">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" /> 加载中...
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-stone-50 text-stone-500 text-xs">
                  <tr>
                    <th className="text-left px-4 py-3">商品</th>
                    <th className="text-left px-4 py-3">当前库存</th>
                    <th className="text-left px-4 py-3">单价</th>
                    <th className="text-left px-4 py-3">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {products.map((p) => {
                    const st = STATUS_TEXT[p.category as keyof typeof STATUS_TEXT];
                    const editing = editingId === p.id;
                    return (
                      <tr key={p.id}>
                        <td className="px-4 py-3">
                          <div className="font-medium">{p.name}</div>
                          <div className="text-xs text-stone-500 mt-0.5">
                            <span className={st?.cls}>{st?.label}</span>
                            <span className="ml-2">{p.description}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div
                            className={`text-lg font-bold ${
                              p.stock === 0
                                ? "text-stone-400"
                                : p.stock < 10
                                ? "text-accent-600"
                                : "text-stone-800"
                            }`}
                          >
                            {p.stock} 盒
                          </div>
                          {p.stock > 0 && p.stock < 10 && (
                            <div className="text-xs text-accent-600">⚠️ 库存预警</div>
                          )}
                        </td>
                        <td className="px-4 py-3">¥{(p.unitPrice / 100).toFixed(0)}</td>
                        <td className="px-4 py-3">
                          {!editing ? (
                            <div className="flex gap-2">
                              <button
                                className="btn-secondary !py-1.5 !px-3 text-xs flex items-center gap-1"
                                onClick={() => {
                                  setEditingId(p.id);
                                  setOpType("IN");
                                  setOpQty(20);
                                  setOpReason("日常补货入库");
                                }}
                              >
                                <PackagePlus className="w-3 h-3" /> 入库
                              </button>
                              <button
                                className="btn-secondary !py-1.5 !px-3 text-xs flex items-center gap-1"
                                onClick={() => {
                                  setEditingId(p.id);
                                  setOpType("OUT");
                                  setOpQty(1);
                                  setOpReason("");
                                }}
                              >
                                <PackageMinus className="w-3 h-3" /> 出库
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => setOpType("IN")}
                                  className={`text-xs px-2 py-1 rounded-lg border ${
                                    opType === "IN"
                                      ? "bg-green-50 border-green-300 text-green-700"
                                      : "border-stone-200"
                                  }`}
                                >
                                  <PackagePlus className="w-3 h-3 inline mr-1" />
                                  入库
                                </button>
                                <button
                                  onClick={() => setOpType("OUT")}
                                  className={`text-xs px-2 py-1 rounded-lg border ${
                                    opType === "OUT"
                                      ? "bg-accent-50 border-accent-300 text-accent-700"
                                      : "border-stone-200"
                                  }`}
                                >
                                  <PackageMinus className="w-3 h-3 inline mr-1" />
                                  出库
                                </button>
                                <div className="flex-1" />
                                <div className="flex items-center gap-1 border border-stone-200 rounded-lg">
                                  <button
                                    className="w-7 h-7 hover:bg-stone-100 flex items-center justify-center"
                                    onClick={() =>
                                      setOpQty(Math.max(1, opQty - 1))
                                    }
                                  >
                                    <Minus className="w-3 h-3" />
                                  </button>
                                  <input
                                    type="number"
                                    className="w-14 text-center py-1 outline-none bg-transparent"
                                    value={opQty}
                                    onChange={(e) =>
                                      setOpQty(
                                        Math.max(1, parseInt(e.target.value) || 1)
                                      )
                                    }
                                  />
                                  <button
                                    className="w-7 h-7 hover:bg-stone-100 flex items-center justify-center"
                                    onClick={() => setOpQty(opQty + 1)}
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                              <input
                                className="input !py-1.5 text-xs"
                                placeholder="操作原因（例如：补货 / 报废 / 盘点差异）"
                                value={opReason}
                                onChange={(e) => setOpReason(e.target.value)}
                              />
                              <div className="flex gap-2">
                                <button
                                  className="btn-primary !py-1.5 !px-3 text-xs flex-1 flex items-center justify-center gap-1"
                                  disabled={submitting}
                                  onClick={() => submit(p)}
                                >
                                  {submitting ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : null}
                                  确认{opType === "IN" ? "入库" : "出库"}
                                </button>
                                <button
                                  className="btn-secondary !py-1.5 !px-3 text-xs"
                                  onClick={() => setEditingId(null)}
                                  disabled={submitting}
                                >
                                  取消
                                </button>
                              </div>
                              {opType === "OUT" &&
                                opQty > p.stock && (
                                  <div className="text-xs text-accent-700 bg-accent-50 border border-accent-200 rounded-lg p-2">
                                    <AlertTriangle className="w-3 h-3 inline mr-1" />
                                    当前库存 {p.stock} 盒，不能出库 {opQty} 盒
                                  </div>
                                )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
