"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  calculatePrice,
  formatYuan,
  type CartItem,
} from "@/lib/pricing";
import { useCart } from "@/components/CartProvider";
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  Clock,
  AlertTriangle,
  Snowflake,
  Truck,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import {
  DELIVERY_WINDOW_START_HOUR,
  DELIVERY_WINDOW_END_HOUR,
  FROZEN_REQUIRED_HOURS,
  isInDeliveryWindow,
  getNextDeliveryWindow,
} from "@/lib/frozen-check";
import type { DeliveryETAResult } from "@/lib/delivery";

export default function CartPage() {
  const { items, updateQty, removeItem, clearCart, showComboHint, classicBoxes } =
    useCart();
  const [deliveryType, setDeliveryType] = useState<
    "PICKUP" | "DELIVERY" | "EXPRESS"
  >("PICKUP");

  // 快递相关状态
  const [province, setProvince] = useState("");
  const [etaResult, setEtaResult] = useState<DeliveryETAResult | null>(null);
  const [etaLoading, setEtaLoading] = useState(false);
  const [customerAckRisk, setCustomerAckRisk] = useState(false);
  const [now, setNow] = useState(new Date());

  // 每分钟刷新当前时间（用于发货窗口判断）
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // 查询快递时效
  const queryETA = async () => {
    if (!province) return;
    setEtaLoading(true);
    try {
      const res = await fetch(
        `/api/delivery/eta?province=${encodeURIComponent(province)}`
      );
      const data = await res.json();
      setEtaResult(data);
    } catch {
      setEtaResult(null);
    } finally {
      setEtaLoading(false);
    }
  };

  const pricing = calculatePrice(items, deliveryType);
  const inWindow = isInDeliveryWindow(now);
  const nextWindow = getNextDeliveryWindow(now);

  // 快递是否被阻断（不支持地区 或 超时未确认风险）
  const deliveryBlocked =
    deliveryType === "DELIVERY" &&
    ((etaResult && !etaResult.supported) ||
      (etaResult &&
        etaResult.recommendCancel &&
        !customerAckRisk));

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-stone-200">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🥟</span>
            <span className="font-bold text-primary-700">原味生活</span>
          </Link>
          <Link href="/products" className="text-sm text-stone-600 hover:text-primary-600">
            继续选购 →
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto px-4 py-10 w-full">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <ShoppingCart /> 我的购物车
        </h1>

        {items.length === 0 ? (
          <div className="card p-16 text-center text-stone-400">
            <div className="text-6xl mb-4">🛒</div>
            <div className="mb-4">购物车是空的</div>
            <Link href="/products" className="btn-primary">
              去选购饺子
            </Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* 左侧：商品列表 + 配送设置 */}
            <div className="lg:col-span-2 space-y-3">
              {showComboHint && (
                <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 mb-3 flex items-center gap-2 text-sm text-amber-800">
                  <span className="text-lg">💡</span>
                  <span>再加1盒经典饺子，即可凑够4盒享组合价（4经典¥100）！</span>
                </div>
              )}
              {items.map((it) => (
                <div key={it.productId} className="card p-4 flex items-center gap-4">
                  <div className="w-20 h-20 bg-stone-100 rounded-lg flex items-center justify-center text-3xl shrink-0">
                    🥟
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{it.productName}</span>
                      <span
                        className={
                          it.category === "CLASSIC"
                            ? "badge-classic"
                            : "badge-specialty"
                        }
                      >
                        {it.category === "CLASSIC" ? "经典" : "特色"}
                      </span>
                    </div>
                    <div className="text-sm text-primary-600 font-semibold">
                      ¥{(it.unitPrice / 100).toFixed(0)}/盒
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="w-8 h-8 rounded-full border border-stone-300 flex items-center justify-center hover:bg-stone-50"
                      onClick={() => updateQty(it.productId, -1)}
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-8 text-center font-medium">{it.quantity}</span>
                    <button
                      className="w-8 h-8 rounded-full border border-stone-300 flex items-center justify-center hover:bg-stone-50"
                      onClick={() => updateQty(it.productId, 1)}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <button
                    className="text-stone-400 hover:text-accent-500 p-2"
                    onClick={() => removeItem(it.productId)}
                    title="删除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              {/* 配送方式选择 */}
              <div className="card p-5">
                <h3 className="font-bold mb-3">配送方式</h3>
                <div className="grid sm:grid-cols-3 gap-3">
                  {(
                    [
                      { key: "PICKUP", name: "自取", desc: "门店自取，免运费" },
                      { key: "DELIVERY", name: "快递", desc: "泡沫箱+5元/5盒，运费自理" },
                      { key: "EXPRESS", name: "闪送", desc: "运费自理，无泡沫箱费" },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => {
                        setDeliveryType(opt.key);
                        setCustomerAckRisk(false);
                      }}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        deliveryType === opt.key
                          ? "border-primary-500 bg-primary-50 ring-2 ring-primary-100"
                          : "border-stone-200 hover:border-stone-300"
                      }`}
                    >
                      <div className="font-medium">{opt.name}</div>
                      <div className="text-xs text-stone-500">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 快递专属提示区 */}
              {deliveryType === "DELIVERY" && (
                <div className="card p-5 space-y-4 border-primary-200">
                  <div className="flex items-center gap-2 text-primary-700">
                    <Truck className="w-5 h-5" />
                    <h3 className="font-bold">快递发货须知</h3>
                  </div>

                  {/* 冷冻时间提示 */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                    <div className="flex items-start gap-2">
                      <Snowflake className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                      <div>
                        <div className="font-medium text-blue-800">冷冻要求</div>
                        <div className="text-blue-700 mt-1">
                          冷冻饺子入库后需满 <b>{FROZEN_REQUIRED_HOURS} 小时</b> 才能发快递，
                          确保饺子充分冷冻。发货时间不会早于冷冻完成时间。
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 发货时间窗口提示 */}
                  <div
                    className={`rounded-lg p-3 text-sm border ${
                      inWindow
                        ? "bg-green-50 border-green-200"
                        : "bg-amber-50 border-amber-200"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <Clock
                        className={`w-4 h-4 mt-0.5 shrink-0 ${
                          inWindow ? "text-green-600" : "text-amber-600"
                        }`}
                      />
                      <div>
                        <div className="font-medium text-stone-800">发货时间窗口</div>
                        <div className="mt-1 text-stone-700">
                          快递发货时间为每天{" "}
                          <b>
                            {DELIVERY_WINDOW_START_HOUR}:00 -{" "}
                            {DELIVERY_WINDOW_END_HOUR}:00
                          </b>
                        </div>
                        {inWindow ? (
                          <div className="text-green-700 mt-1 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> 当前在发货窗口内，今天即可发货
                          </div>
                        ) : (
                          <div className="text-amber-700 mt-1">
                            预计发货时间：
                            {nextWindow.start.toLocaleDateString("zh-CN", {
                              month: "long",
                              day: "numeric",
                            })}{" "}
                            {nextWindow.start.getHours()}:00-
                            {nextWindow.end.getHours()}:00
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 京东快递时效查询 */}
                  <div className="border border-stone-200 rounded-lg p-3">
                    <div className="font-medium text-sm mb-2 text-stone-700">
                      查询京东快递送达时间
                    </div>
                    <div className="flex gap-2">
                      <select
                        className="input !py-2 flex-1"
                        value={province}
                        onChange={(e) => {
                          setProvince(e.target.value);
                          setEtaResult(null);
                          setCustomerAckRisk(false);
                        }}
                      >
                        <option value="">请选择收货省份</option>
                        {PROVINCE_OPTIONS.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                      <button
                        className="btn-secondary !py-2 text-sm"
                        onClick={queryETA}
                        disabled={!province || etaLoading}
                      >
                        {etaLoading ? "查询中..." : "查询时效"}
                      </button>
                    </div>

                    {/* 查询结果 */}
                    {etaResult && (
                      <div
                        className={`mt-3 rounded-lg p-3 text-sm ${
                          !etaResult.supported
                            ? "bg-red-50 border border-red-200"
                            : etaResult.recommendCancel
                            ? "bg-amber-50 border border-amber-200"
                            : "bg-green-50 border border-green-200"
                        }`}
                      >
                        {!etaResult.supported ? (
                          <div className="flex items-start gap-2">
                            <XCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                            <div>
                              <div className="font-medium text-red-800">
                                该地区暂不支持快递配送
                              </div>
                              <div className="text-red-700 mt-1">
                                {etaResult.warning}
                              </div>
                            </div>
                          </div>
                        ) : etaResult.recommendCancel ? (
                          <div className="space-y-3">
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                              <div>
                                <div className="font-medium text-amber-800">
                                  运输超时风险
                                </div>
                                <div className="text-amber-700 mt-1 whitespace-pre-line">
                                  {etaResult.warning}
                                </div>
                                <div className="mt-2 text-stone-700">
                                  预计发货：
                                  {etaResult.shipDate &&
                                    new Date(etaResult.shipDate).toLocaleDateString("zh-CN")}
                                  ｜ 预计送达：
                                  {etaResult.estimatedArrival &&
                                    new Date(etaResult.estimatedArrival).toLocaleDateString("zh-CN")}
                                  ｜ 在途 {etaResult.nightsInTransit} 晚
                                </div>
                              </div>
                            </div>
                            {/* 顾客风险确认 */}
                            <label className="flex items-start gap-2 cursor-pointer bg-white/60 rounded-lg p-2 border border-amber-200">
                              <input
                                type="checkbox"
                                checked={customerAckRisk}
                                onChange={(e) => setCustomerAckRisk(e.target.checked)}
                                className="mt-0.5"
                              />
                              <span className="text-xs text-amber-800">
                                我已了解运输超时可能导致饺子解冻变质的风险，
                                坚持下单并自行承担由此产生的损失。
                              </span>
                            </label>
                          </div>
                        ) : (
                          <div className="flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                            <div>
                              <div className="font-medium text-green-800">
                                预计{etaResult.deliveryDays === 1 ? "次日" : etaResult.deliveryDays + "天后"}送达
                              </div>
                              <div className="text-green-700 mt-1">
                                {etaResult.warning}
                              </div>
                              <div className="mt-1 text-stone-600 text-xs">
                                发货：
                                {etaResult.shipDate &&
                                  new Date(etaResult.shipDate).toLocaleDateString("zh-CN")}
                                ｜ 送达：
                                {etaResult.estimatedArrival &&
                                  new Date(etaResult.estimatedArrival).toLocaleDateString("zh-CN")}
                                ｜ 在途 {etaResult.nightsInTransit} 晚
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 右侧：费用明细 */}
            <aside className="lg:col-span-1">
              <div className="card p-5 sticky top-24">
                <h3 className="font-bold mb-4">订单明细</h3>
                <div className="text-sm text-stone-500 mb-3 space-y-1.5">
                  <div className="flex justify-between">
                    <span>合计 {pricing.totalBoxes} 盒（经典{pricing.classicBoxes} + 特色{pricing.specialtyBoxes}）</span>
                  </div>

                  <div className="border-t border-stone-100 my-3 pt-3 space-y-1.5">
                    {pricing.breakdown.map((b, i) => (
                      <div key={i} className="flex justify-between text-stone-600">
                        <span className="pr-2">
                          ×{b.count} {b.description}
                        </span>
                        <span className="text-stone-700 shrink-0">
                          ¥{formatYuan(b.subtotal)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {pricing.foamBoxCount > 0 && (
                    <div className="flex justify-between border-t border-stone-100 pt-2">
                      <span>泡沫箱 × {pricing.foamBoxCount}</span>
                      <span>¥{formatYuan(pricing.foamBoxAmount)}</span>
                    </div>
                  )}
                </div>

                <div className="border-t border-stone-200 pt-4 mb-4">
                  <div className="flex justify-between items-end">
                    <span className="text-stone-600">应付总额</span>
                    <div className="text-3xl font-bold text-primary-600">
                      ¥{formatYuan(pricing.totalAmount)}
                    </div>
                  </div>
                </div>

                {deliveryBlocked ? (
                  <div className="btn-secondary w-full !py-3 text-base cursor-not-allowed text-stone-400 text-center">
                    {etaResult && !etaResult.supported
                      ? "该地区不支持快递"
                      : "请先确认运输风险"}
                  </div>
                ) : (
                  <Link
                    href="/checkout"
                    className="btn-primary w-full !py-3 text-base"
                  >
                    去结算 <ArrowRight className="w-4 h-4 ml-1" />
                  </Link>
                )}
                <p className="text-xs text-stone-400 mt-3 text-center">
                  💡 系统已自动为你计算最优优惠组合
                </p>
              </div>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}

const PROVINCE_OPTIONS = [
  "北京", "天津", "河北", "山西", "内蒙古",
  "辽宁", "吉林", "黑龙江",
  "上海", "江苏", "浙江", "安徽", "福建", "江西", "山东",
  "河南", "湖北", "湖南",
  "广东", "广西", "海南",
  "重庆", "四川", "贵州", "云南", "西藏",
  "陕西", "甘肃", "青海", "宁夏", "新疆",
];
