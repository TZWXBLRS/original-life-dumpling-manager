"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Minus,
  Loader2,
  Package,
  PackageMinus,
  PackagePlus,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { AdminShell } from "@/components/AdminShell";

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
  const [opType, setOpType] = useState<"IN" | "OUT" | "SET">("IN");
  const [opQty, setOpQty] = useState(10);
  const [opReason, setOpReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [batchValue, setBatchValue] = useState(100);
  const [batching, setBatching] = useState(false);

  const OP_LABEL: Record<"IN" | "OUT" | "SET", string> = {
    IN: "入库",
    OUT: "出库",
    SET: "修改",
  };

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
          changeType: opType, // IN 入库 / OUT 出库 / SET 直接设定
          changeAmount: opQty,
          reason:
            opReason ||
            (opType === "SET"
              ? `直接设定为 ${opQty} 盒`
              : OP_LABEL[opType]),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMsg({
        type: "ok",
        text:
          opType === "SET"
            ? `「${p.name}」库存已设为 ${opQty} 盒`
            : `「${p.name}」${OP_LABEL[opType]}成功：${opQty} 盒`,
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

  // 批量把所有口味库存设为同一数值（默认 100）
  const batchSet = async () => {
    setBatching(true);
    setMsg(null);
    try {
      for (const p of products) {
        if (p.stock === batchValue) continue;
        const res = await fetch("/api/admin/inventory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId: p.id,
            changeType: "SET",
            changeAmount: batchValue,
            reason: `批量设置为 ${batchValue}`,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
      }
      setMsg({ type: "ok", text: `已将全部口味库存设为 ${batchValue} 盒` });
      load();
      setTimeout(() => setMsg(null), 4000);
    } catch (e: any) {
      setMsg({ type: "err", text: e.message || "批量设置失败" });
    } finally {
      setBatching(false);
    }
  };

  return (
    <AdminShell role="ADMIN">
      <main className="flex-1 overflow-auto p-4 md:p-8">
        <div className="mb-6">
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Package className="w-7 h-7 text-primary-600" /> 库存管理
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            查看口味库存与单价，支持入库 / 出库 / 直接修改库存
          </p>
        </div>

        {/* 批量设置：一次性把所有口味库存设为同一数值 */}
        <div className="card mb-4 p-4 flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-stone-700">
            批量设置库存（全部口味）：
          </span>
          <div className="flex items-center gap-1 border border-stone-200 rounded-lg">
            <button
              className="w-8 h-8 hover:bg-stone-100 flex items-center justify-center"
              onClick={() => setBatchValue(Math.max(0, batchValue - 10))}
            >
              <Minus className="w-3 h-3" />
            </button>
            <input
              type="number"
              className="w-16 text-center py-1 outline-none bg-transparent"
              value={batchValue}
              onChange={(e) =>
                setBatchValue(Math.max(0, parseInt(e.target.value) || 0))
              }
            />
            <button
              className="w-8 h-8 hover:bg-stone-100 flex items-center justify-center"
              onClick={() => setBatchValue(batchValue + 10)}
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
          <button
            className="btn-primary !py-1.5 !px-3 text-xs flex items-center gap-1"
            disabled={batching || products.length === 0}
            onClick={batchSet}
          >
            {batching ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <PackagePlus className="w-3 h-3" />
            )}
            全部设为 {batchValue} 盒
          </button>
        </div>

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
                            <div className="flex flex-wrap gap-2">
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
                              <button
                                className="btn-secondary !py-1.5 !px-3 text-xs flex items-center gap-1"
                                onClick={() => {
                                  setEditingId(p.id);
                                  setOpType("SET");
                                  setOpQty(p.stock);
                                  setOpReason("");
                                }}
                              >
                                <Package className="w-3 h-3" /> 直接修改
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
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
                                <button
                                  onClick={() => setOpType("SET")}
                                  className={`text-xs px-2 py-1 rounded-lg border ${
                                    opType === "SET"
                                      ? "bg-blue-50 border-blue-300 text-blue-700"
                                      : "border-stone-200"
                                  }`}
                                >
                                  <Package className="w-3 h-3 inline mr-1" />
                                  设为
                                </button>
                                <div className="flex-1" />
                                <div className="flex items-center gap-1 border border-stone-200 rounded-lg">
                                  <button
                                    className="w-7 h-7 hover:bg-stone-100 flex items-center justify-center"
                                    onClick={() =>
                                      setOpQty(Math.max(0, opQty - 1))
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
                                        Math.max(0, parseInt(e.target.value) || 0)
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
                                placeholder={
                                  opType === "SET"
                                    ? `将库存设为多少盒（例如：100）`
                                    : "操作原因（例如：补货 / 报废 / 盘点差异）"
                                }
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
                                  确认{OP_LABEL[opType]}
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
                              {opType === "SET" && (
                                <div className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg p-2">
                                  当前库存 {p.stock} 盒，将直接改为 {opQty} 盒
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
    </AdminShell>
  );
}
