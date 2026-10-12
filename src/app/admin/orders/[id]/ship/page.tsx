"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Snowflake,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Truck,
  ArrowLeft,
  ShieldCheck,
} from "lucide-react";
import {
  FROZEN_REQUIRED_HOURS,
  DELIVERY_WINDOW_START_HOUR,
  DELIVERY_WINDOW_END_HOUR,
  isInDeliveryWindow,
  getNextDeliveryWindow,
  checkOrderFrozenStatus,
  type ProductFrozenInfo,
} from "@/lib/frozen-check";

/**
 * 后台 - 快递发货确认页面
 *
 * 当订单需要发快递时，系统检查所有商品的冷冻时间：
 * - 全部达标 → 可直接发货
 * - 有不足8小时的 → 弹出提醒，请前台确认饺子冷冻情况后决定是否继续发货
 */

// 模拟数据：订单中的商品及其冷冻时间
const mockOrderProducts: ProductFrozenInfo[] = [
  {
    productId: "1",
    productName: "三鲜饺子",
    lastFrozenAt: new Date(Date.now() - 10 * 60 * 60 * 1000), // 10小时前，达标
  },
  {
    productId: "2",
    productName: "菌菇饺子",
    lastFrozenAt: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3小时前，不达标
  },
];

export default function ShipConfirmPage() {
  const [now, setNow] = useState(new Date());
  const [confirmed, setConfirmed] = useState(false);
  const [shipped, setShipped] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const frozenCheck = checkOrderFrozenStatus(mockOrderProducts, now);
  const inWindow = isInDeliveryWindow(now);
  const nextWindow = getNextDeliveryWindow(now);

  // 是否可以发货
  const canShip =
    (frozenCheck.canShip || confirmed) && inWindow && !frozenCheck.items.some((i) => i.status === "NO_RECORD");

  const handleShip = () => {
    if (!canShip) return;
    // TODO: 调用 API 更新订单状态为 SHIPPED
    setShipped(true);
  };

  if (shipped) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-100">
        <div className="card p-10 max-w-md text-center">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">发货成功</h2>
          <p className="text-stone-500 mb-6">
            订单已标记为「配送中」，请通知快递员取件。
          </p>
          <Link href="/admin/orders" className="btn-primary">
            返回订单列表
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-100">
      {/* 顶部导航 */}
      <header className="bg-white border-b border-stone-200">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center gap-4">
          <Link
            href="/admin/orders"
            className="text-stone-500 hover:text-primary-600 flex items-center gap-1 text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> 返回订单
          </Link>
          <div className="flex-1" />
          <div className="text-sm text-stone-500">
            订单号：DMP20260813001234
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <Truck className="w-6 h-6" /> 快递发货确认
        </h1>

        {/* 发货时间窗口状态 */}
        <div
          className={`card p-5 mb-6 border-l-4 ${
            inWindow
              ? "border-l-green-500 bg-green-50"
              : "border-l-amber-500 bg-amber-50"
          }`}
        >
          <div className="flex items-start gap-3">
            <Clock
              className={`w-5 h-5 mt-0.5 ${
                inWindow ? "text-green-600" : "text-amber-600"
              }`}
            />
            <div>
              <div className="font-bold text-stone-800">
                发货时间窗口：{DELIVERY_WINDOW_START_HOUR}:00 -{" "}
                {DELIVERY_WINDOW_END_HOUR}:00
              </div>
              {inWindow ? (
                <div className="text-sm text-green-700 mt-1">
                  ✅ 当前在发货窗口内，可以发货
                </div>
              ) : (
                <div className="text-sm text-amber-700 mt-1">
                  ⏳ 当前不在发货窗口。下一个窗口：
                  {nextWindow.start.toLocaleString("zh-CN", {
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  -{" "}
                  {nextWindow.end.toLocaleTimeString("zh-CN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 冷冻状态检查 */}
        <div className="card p-5 mb-6">
          <h2 className="font-bold mb-4 flex items-center gap-2">
            <Snowflake className="w-5 h-5 text-blue-600" />
            饺子冷冻状态检查
            <span className="text-sm font-normal text-stone-400">
              （需满 {FROZEN_REQUIRED_HOURS} 小时）
            </span>
          </h2>

          {/* 各商品冷冻状态 */}
          <div className="space-y-3">
            {frozenCheck.items.map((item) => (
              <div
                key={item.productId}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  item.status === "READY"
                    ? "bg-green-50 border-green-200"
                    : item.status === "NOT_READY"
                    ? "bg-amber-50 border-amber-200"
                    : "bg-red-50 border-red-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  {item.status === "READY" ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : item.status === "NOT_READY" ? (
                    <Clock className="w-5 h-5 text-amber-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600" />
                  )}
                  <div>
                    <div className="font-medium">{item.productName}</div>
                    <div className="text-xs text-stone-500">
                      {item.status === "READY"
                        ? `已冷冻 ${item.frozenHours} 小时 ✅`
                        : item.status === "NOT_READY"
                        ? `已冷冻 ${item.frozenHours} 小时，还需 ${item.remainingHours} 小时`
                        : "无冷冻入库记录"}
                    </div>
                  </div>
                </div>
                {item.readyAt && item.status === "NOT_READY" && (
                  <div className="text-xs text-amber-700 text-right">
                    预计达标时间
                    <br />
                    {item.readyAt.toLocaleString("zh-CN", {
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 综合状态提示 */}
          <div
            className={`mt-4 p-4 rounded-lg ${
              frozenCheck.canShip
                ? "bg-green-100 text-green-800"
                : "bg-amber-100 text-amber-800"
            }`}
          >
            <div className="font-medium">{frozenCheck.message}</div>
          </div>
        </div>

        {/* 前台确认区（当冷冻不足时显示） */}
        {frozenCheck.needsConfirmation && !confirmed && (
          <div className="card p-6 mb-6 border-2 border-amber-300">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0" />
              <div>
                <h3 className="font-bold text-amber-800">
                  需要前台确认冷冻情况
                </h3>
                <p className="text-sm text-amber-700 mt-1">
                  部分饺子冷冻时间不足 {FROZEN_REQUIRED_HOURS} 小时。
                  请前台人员检查饺子实际冷冻状况（是否已完全冻硬），
                  确认后可选择继续发货。
                </p>
              </div>
            </div>

            {/* 检查清单 */}
            <div className="bg-white rounded-lg p-4 border border-amber-200 mb-4">
              <div className="text-sm font-medium text-stone-700 mb-2">
                请逐项确认：
              </div>
              <ul className="space-y-2 text-sm text-stone-600">
                <li className="flex items-start gap-2">
                  <span className="text-amber-500">☐</span>
                  已到冷库检查饺子实际冷冻状态
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500">☐</span>
                  确认所有饺子已完全冻硬（无软化现象）
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500">☐</span>
                  已准备好泡沫箱和冰袋
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500">☐</span>
                  知悉冷冻时间不足可能导致运输途中品质风险
                </li>
              </ul>
            </div>

            <button
              className="btn-primary w-full"
              onClick={() => setConfirmed(true)}
            >
              <ShieldCheck className="w-4 h-4 mr-2" />
              已确认饺子冷冻情况，继续发货
            </button>
          </div>
        )}

        {/* 确认后提示 */}
        {confirmed && (
          <div className="card p-4 mb-6 bg-blue-50 border-blue-200">
            <div className="flex items-center gap-2 text-blue-800 text-sm">
              <ShieldCheck className="w-4 h-4" />
              前台已确认冷冻情况，可以发货。
            </div>
          </div>
        )}

        {/* 发货按钮 */}
        <div className="flex gap-3">
          <button
            className="btn-primary flex-1 !py-3 text-base"
            disabled={!canShip}
            onClick={handleShip}
          >
            <Truck className="w-4 h-4 mr-2" />
            {!inWindow
              ? "当前不在发货时间窗口"
              : frozenCheck.items.some((i) => i.status === "NO_RECORD")
              ? "有商品无冷冻记录，无法发货"
              : !frozenCheck.canShip && !confirmed
              ? "请先确认冷冻情况"
              : "确认发货"}
          </button>
          <Link href="/admin/orders" className="btn-secondary !py-3">
            取消
          </Link>
        </div>

        {/* 无冷冻记录时无法发货 */}
        {frozenCheck.items.some((i) => i.status === "NO_RECORD") && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <XCircle className="w-4 h-4 inline mr-1" />
            有商品无冷冻入库记录，请先入库冷冻后再发货。
          </div>
        )}
      </main>
    </div>
  );
}
