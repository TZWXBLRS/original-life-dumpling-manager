"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Clock,
  CheckCircle2,
  Truck,
  ArrowLeft,
} from "lucide-react";
import {
  DELIVERY_WINDOW_START_HOUR,
  DELIVERY_WINDOW_END_HOUR,
  isInDeliveryWindow,
  getNextDeliveryWindow,
} from "@/lib/delivery-window";

/**
 * 后台 - 快递发货确认页面
 *
 * 检查是否在发货时间窗口（18:00-20:00），可发货则一键发货
 */

export default function ShipConfirmPage() {
  const [now, setNow] = useState(new Date());
  const [shipped, setShipped] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const inWindow = isInDeliveryWindow(now);
  const nextWindow = getNextDeliveryWindow(now);

  const handleShip = () => {
    if (!inWindow) return;
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
                    timeZone: "Asia/Shanghai",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  -{" "}
                  {nextWindow.end.toLocaleTimeString("zh-CN", {
                    timeZone: "Asia/Shanghai",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 发货按钮 */}
        <div className="flex gap-3">
          <button
            className="btn-primary flex-1 !py-3 text-base"
            disabled={!inWindow}
            onClick={handleShip}
          >
            <Truck className="w-4 h-4 mr-2" />
            {inWindow ? "确认发货" : "当前不在发货时间窗口"}
          </button>
          <Link href="/admin/orders" className="btn-secondary !py-3">
            取消
          </Link>
        </div>
      </main>
    </div>
  );
}
