"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CreditCard,
  ChefHat,
  CheckCircle2,
  Truck,
  XCircle,
  Loader2,
  AlertTriangle,
} from "lucide-react";

type Props = {
  orderId: string;
  status: string;
  deliveryType: string;
  userRole: "CUSTOMER" | "KITCHEN" | "ADMIN";
  isOwner: boolean;
};

type Action =
  | "PAY"
  | "START_PREPARE"
  | "MARK_READY"
  | "SHIP"
  | "COMPLETE"
  | "CANCEL";

const ACTION_CONFIG: Record<
  Action,
  { label: string; icon: any; cls: string; confirm?: string }
> = {
  PAY: {
    label: "确认支付",
    icon: CreditCard,
    cls: "bg-primary-600 hover:bg-primary-700 text-white",
  },
  START_PREPARE: {
    label: "开始备餐",
    icon: ChefHat,
    cls: "bg-indigo-600 hover:bg-indigo-700 text-white",
  },
  MARK_READY: {
    label: "标记备好",
    icon: CheckCircle2,
    cls: "bg-teal-600 hover:bg-teal-700 text-white",
  },
  SHIP: {
    label: "确认发货",
    icon: Truck,
    cls: "bg-blue-600 hover:bg-blue-700 text-white",
  },
  COMPLETE: {
    label: "标记完成",
    icon: CheckCircle2,
    cls: "bg-green-600 hover:bg-green-700 text-white",
  },
  CANCEL: {
    label: "取消订单",
    icon: XCircle,
    cls: "bg-stone-600 hover:bg-stone-700 text-white",
    confirm: "确定要取消此订单吗？",
  },
};

export default function OrderActionButtons({
  orderId,
  status,
  deliveryType,
  userRole,
  isOwner,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<Action | null>(null);
  const [cancelInput, setCancelInput] = useState("");
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [error, setError] = useState("");

  const isStaff = userRole === "ADMIN" || userRole === "KITCHEN";
  const isAdmin = userRole === "ADMIN";

  // 根据状态和角色，决定展示哪些操作按钮
  const availableActions: Action[] = [];

  if (status === "PENDING_PAYMENT") {
    if (isOwner || isAdmin) availableActions.push("PAY");
    if (isOwner || isAdmin) availableActions.push("CANCEL");
  } else if (status === "PAID") {
    if (isStaff) availableActions.push("START_PREPARE", "MARK_READY");
    if (isAdmin) availableActions.push("CANCEL");
  } else if (status === "PREPARING") {
    if (isStaff) availableActions.push("MARK_READY");
    if (deliveryType !== "PICKUP" && isAdmin) availableActions.push("SHIP");
    if (isAdmin) availableActions.push("CANCEL");
    if (isStaff) availableActions.push("COMPLETE");
  } else if (status === "READY" || status === "READY_FOR_PICKUP") {
    if (deliveryType !== "PICKUP" && isAdmin) availableActions.push("SHIP");
    if (deliveryType === "PICKUP" && isStaff) availableActions.push("COMPLETE");
    if (isStaff) availableActions.push("COMPLETE");
    if (isAdmin) availableActions.push("CANCEL");
  } else if (status === "SHIPPED") {
    if (isStaff) availableActions.push("COMPLETE");
  }

  if (availableActions.length === 0) return null;

  const runAction = async (action: Action) => {
    setError("");

    // 取消订单弹窗
    if (action === "CANCEL") {
      setShowCancelModal(true);
      return;
    }

    setLoading(action);
    try {
      const body: any = { action };
      if (action === "PAY") body.paymentMethod = "MANUAL";

      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "操作失败");
      }
      router.refresh();
    } catch (e: any) {
      setError(e.message || "操作失败");
    } finally {
      setLoading(null);
    }
  };

  const confirmCancel = async () => {
    setLoading("CANCEL");
    setError("");
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CANCEL",
          cancelReason: cancelInput || "用户取消",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "取消失败");
      setShowCancelModal(false);
      router.refresh();
    } catch (e: any) {
      setError(e.message || "取消失败");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="card p-5">
      <h3 className="font-bold mb-3">订单操作</h3>

      {error && (
        <div className="mb-3 p-3 rounded-lg text-sm bg-accent-50 text-accent-700 border border-accent-200">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {availableActions.map((a) => {
          const cfg = ACTION_CONFIG[a];
          return (
            <button
              key={a}
              onClick={() => runAction(a)}
              disabled={loading !== null}
              className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${cfg.cls}`}
            >
              {loading === a ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <cfg.icon className="w-4 h-4" />
              )}
              {cfg.label}
            </button>
          );
        })}
      </div>

      {/* 取消订单弹窗 */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="font-bold text-lg mb-3">确认取消订单</h3>
            <p className="text-sm text-stone-600 mb-4">
              {status === "PENDING_PAYMENT"
                ? "取消后如需购买可重新下单。"
                : "订单已支付，取消后库存将返还，请谨慎操作。"}
            </p>
            <textarea
              className="textarea text-sm w-full"
              rows={3}
              placeholder="取消原因（可选）"
              value={cancelInput}
              onChange={(e) => setCancelInput(e.target.value)}
            />
            <div className="mt-5 flex gap-3 justify-end">
              <button
                className="px-4 py-2 rounded-lg text-sm border border-stone-200 hover:bg-stone-50"
                onClick={() => {
                  setShowCancelModal(false);
                  setCancelInput("");
                }}
                disabled={loading !== null}
              >
                返回
              </button>
              <button
                className="px-4 py-2 rounded-lg text-sm bg-accent-600 hover:bg-accent-700 text-white disabled:opacity-50 flex items-center gap-1.5"
                onClick={confirmCancel}
                disabled={loading !== null}
              >
                {loading === "CANCEL" && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                确认取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
