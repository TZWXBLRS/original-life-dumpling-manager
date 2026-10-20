"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { calculatePrice, formatYuan } from "@/lib/pricing";
import { useCart } from "@/components/CartProvider";
import { PhoneLoginPanel } from "@/components/PhoneLoginPanel";
import { UserMenu } from "@/components/UserMenu";
import { PROVINCE_OPTIONS, PICKUP_SLOTS } from "@/lib/regions";
import {
  DELIVERY_WINDOW_START_HOUR,
  DELIVERY_WINDOW_END_HOUR,
  isInDeliveryWindow,
  getNextDeliveryWindow,
} from "@/lib/delivery-window";
import type { DeliveryETAResult } from "@/lib/delivery";
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  Clock,
  AlertTriangle,
  Truck,
  CheckCircle2,
  XCircle,
  MapPin,
  User,
  Phone,
  CreditCard,
  Loader2,
  Store,
} from "lucide-react";

// 门店自取地址
const STORE_ADDRESS = "北京昌平路181号院卢卡新天地3号楼底商负107 素生活";

/** 客户端计算北京时间当天的 YYYY-MM-DD（浏览器时区不一定是北京） */
function beijingTodayStr(): string {
  const t = new Date(Date.now() + 8 * 3600 * 1000);
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}-${String(
    t.getUTCDate()
  ).padStart(2, "0")}`;
}

/**
 * 购物车 + 结算 合并单页
 * —— 商品编辑、配送方式、收货信息、费用明细、提交订单全流程集中在此，
 *    不再需要 localStorage 跨页传参，也不再需要单独的 /checkout 页面。
 */
export default function CartPage() {
  const { items, updateQty, removeItem, clearCart, showComboHint } = useCart();

  const [mounted, setMounted] = useState(false);
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);

  const [deliveryType, setDeliveryType] = useState<
    "PICKUP" | "DELIVERY" | "EXPRESS"
  >("PICKUP");
  const [pickupSlot, setPickupSlot] = useState("");
  const [deliveryDate, setDeliveryDate] = useState(beijingTodayStr());
  const [addr, setAddr] = useState({
    province: "",
    city: "",
    district: "",
    detail: "",
  });
  const [receiverName, setReceiverName] = useState("");
  const [receiverPhone, setReceiverPhone] = useState("");
  const [customerAckRisk, setCustomerAckRisk] = useState(false);
  const [note, setNote] = useState("");

  const [etaResult, setEtaResult] = useState<DeliveryETAResult | null>(null);
  const [etaLoading, setEtaLoading] = useState(false);
  const [now, setNow] = useState(new Date());

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{
    orderNo: string;
    totalAmount: number;
    pickupCode: string | null;
    deliveryType: string;
  } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 检查登录状态；已登录则读取顾客资料预填收货信息
  const loadSession = async () => {
    try {
      const s = await fetch("/api/auth/session").then((r) => r.json());
      const logged = Boolean(s?.user);
      setLoggedIn(logged);
      if (logged) {
        const p = await fetch("/api/auth/profile").then((r) => r.json());
        const pf = p?.profile;
        if (pf) {
          if (pf.wechatName) setReceiverName(pf.wechatName);
          setAddr({
            province: pf.province || "",
            city: pf.city || "",
            district: pf.district || "",
            detail: pf.detail || "",
          });
        }
      }
    } catch {
      setLoggedIn(false);
    }
  };

  useEffect(() => {
    loadSession();
  }, []);

  // 每分钟刷新当前时间（发货窗口判断）
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const pricing = calculatePrice(items, deliveryType);
  const inWindow = isInDeliveryWindow(now);
  const nextWindow = getNextDeliveryWindow(now);

  // 选择快递省份后自动查询京东时效
  useEffect(() => {
    if (deliveryType !== "DELIVERY" || !addr.province) {
      setEtaResult(null);
      return;
    }
    let active = true;
    setEtaLoading(true);
    fetch(`/api/delivery/eta?province=${encodeURIComponent(addr.province)}&shipDate=${deliveryDate}`)
      .then((r) => r.json())
      .then((d) => {
        if (active) setEtaResult(d);
      })
      .catch(() => {
        if (active) setEtaResult(null);
      })
      .finally(() => {
        if (active) setEtaLoading(false);
      });
    return () => {
      active = false;
    };
  }, [deliveryType, addr.province, deliveryDate]);

  // 快递是否被阻断（不支持地区 或 超时未确认风险）
  const deliveryBlocked =
    deliveryType === "DELIVERY" &&
    Boolean(
      (etaResult && !etaResult.supported) ||
        (etaResult && etaResult.recommendCancel && !customerAckRisk)
    );

  const submit = async () => {
    setError("");
    if (items.length === 0) {
      setError("购物车为空");
      return;
    }
    if (!loggedIn) {
      setError("请先登录后再提交订单");
      return;
    }
    if (deliveryType === "PICKUP") {
      if (!pickupSlot) {
        setError("请选择自取时段");
        return;
      }
    } else {
      if (
        !addr.province ||
        !addr.city ||
        !addr.district ||
        !addr.detail ||
        !receiverName ||
        !receiverPhone
      ) {
        setError("请填写完整的收货信息（省市区、详细地址、收件人、手机号）");
        return;
      }
      if (!/^1\d{10}$/.test(receiverPhone)) {
        setError("手机号格式不正确");
        return;
      }
      if (deliveryBlocked) {
        setError(
          etaResult && !etaResult.supported
            ? "该地区暂不支持快递配送，请选自取或闪送"
            : "请先勾选确认运输超时风险"
        );
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          deliveryType,
          deliveryDate,
          address:
            deliveryType !== "PICKUP"
              ? {
                  province: addr.province,
                  city: addr.city,
                  district: addr.district,
                  detail: addr.detail,
                  name: receiverName,
                  phone: receiverPhone,
                }
              : undefined,
          pickupSlot: deliveryType === "PICKUP" ? pickupSlot : undefined,
          customerAckRisk,
          note: note || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "下单失败");

      setDone({
        orderNo: data.orderNo,
        totalAmount: data.totalAmount,
        pickupCode: data.pickupCode ?? null,
        deliveryType,
      });
      clearCart();
    } catch (err: any) {
      setError(err?.message || "下单失败");
    } finally {
      setSubmitting(false);
    }
  };

  if (!mounted) return null;

  // ============ 下单成功页 ============
  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 p-4">
        <div className="card w-full max-w-md p-8 text-center">
          <CheckCircle2 className="mx-auto mb-4 h-16 w-16 text-green-500" />
          <h2 className="mb-2 text-2xl font-bold">下单成功 🎉</h2>
          <p className="mb-4 text-stone-500">订单号：{done.orderNo}</p>

          {done.deliveryType === "PICKUP" && done.pickupCode && (
            <div className="mb-4 rounded-lg border border-primary-200 bg-primary-50 p-4">
              <div className="text-xs text-stone-500">取货码（到店出示）</div>
              <div className="text-3xl font-bold tracking-widest text-primary-600">
                {done.pickupCode}
              </div>
              <div className="mt-1 text-xs text-stone-500">{STORE_ADDRESS}</div>
            </div>
          )}

          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-stone-600">
            应付{" "}
            <b className="text-primary-600">¥{formatYuan(done.totalAmount)}</b>
            <br />
            <span className="text-xs text-stone-500">
              （目前为模拟支付，真实收款可接入微信/支付宝商户号）
            </span>
          </div>

          <Link href="/orders?paid=1" className="btn-primary mb-2 block w-full !py-3">
            <CreditCard className="mr-2 inline h-4 w-4" /> 查看订单
          </Link>
          <Link href="/products" className="btn-secondary block w-full">
            继续选购
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="sticky top-0 z-20 bg-white border-b border-stone-200">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🥟</span>
            <span className="font-bold text-primary-700">素生活</span>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/products" className="text-stone-600 hover:text-primary-600">
              继续选购 →
            </Link>
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 py-8">
        <h1 className="mb-6 flex items-center gap-2 text-2xl font-bold">
          <ShoppingCart /> 我的购物车
        </h1>

        {items.length === 0 ? (
          <div className="card p-16 text-center text-stone-400">
            <div className="mb-4 text-6xl">🛒</div>
            <div className="mb-4">购物车是空的</div>
            <Link href="/products" className="btn-primary">
              去选购饺子
            </Link>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-3">
            {/* 左侧：商品 + 配送 + 收货信息 + 备注 */}
            <div className="space-y-4 lg:col-span-2">
              {showComboHint && (
                <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
                  <span className="text-lg">💡</span>
                  <span>再加1盒经典饺子，即可凑够4盒享组合价（4经典¥100）！</span>
                </div>
              )}

              {/* 商品列表 */}
              {items.map((it) => (
                <div key={it.productId} className="card flex items-center gap-4 p-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-3xl">
                    🥟
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
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
                    <div className="text-sm font-semibold text-primary-600">
                      ¥{(it.unitPrice / 100).toFixed(0)}/盒
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-stone-300 hover:bg-stone-50"
                      onClick={() => updateQty(it.productId, -1)}
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-8 text-center font-medium">{it.quantity}</span>
                    <button
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-stone-300 hover:bg-stone-50"
                      onClick={() => updateQty(it.productId, 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <button
                    className="p-2 text-stone-400 hover:text-accent-500"
                    onClick={() => removeItem(it.productId)}
                    title="删除"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}

              {/* 未登录：一键登录 */}
              {loggedIn === false && (
                <div className="card border-primary-200 bg-primary-50/50 p-5">
                  <div className="mb-3 text-sm font-bold text-primary-800">
                    登录后即可下单（手机号一键登录）
                  </div>
                  <PhoneLoginPanel onLoggedIn={loadSession} />
                </div>
              )}

              {/* 配送方式 */}
              <div className="card p-5">
                <h3 className="mb-3 font-bold">配送方式</h3>
                <div className="grid gap-3 sm:grid-cols-3">
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
                      className={`rounded-lg border p-3 text-left transition-all ${
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

              {/* 自取：门店地址 + 时段 */}
              {deliveryType === "PICKUP" && (
                <div className="card space-y-3 p-5">
                  <h3 className="flex items-center gap-2 font-bold">
                    <Store className="h-5 w-5 text-primary-600" /> 自取信息
                  </h3>
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
                    <MapPin className="mr-1 inline h-4 w-4 text-amber-600" />
                    <b>自取地址：</b>
                    {STORE_ADDRESS}
                  </div>
                  <div>
                    <label className="mb-2 block text-sm text-stone-600">
                      <Clock className="mr-1 inline h-4 w-4" /> 选择自取日期
                    </label>
                    <input
                      type="date"
                      className="input !py-2 text-sm"
                      value={deliveryDate}
                      min={beijingTodayStr()}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm text-stone-600">
                      <Clock className="mr-1 inline h-4 w-4" /> 选择自取时段（营业时间：9:30-20:30）
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {PICKUP_SLOTS.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setPickupSlot(s)}
                          className={`rounded-lg border py-2 text-sm ${
                            pickupSlot === s
                              ? "border-primary-500 bg-primary-50 font-medium text-primary-700"
                              : "border-stone-200 hover:border-stone-300"
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 快递 / 闪送：收货信息（来自登录资料可自动带出） */}
              {deliveryType !== "PICKUP" && (
                <div className="card space-y-4 p-5">
                  <h3 className="flex items-center gap-2 font-bold">
                    <MapPin className="h-5 w-5 text-primary-600" /> 收货信息
                  </h3>
                  <div>
                    <label className="mb-2 block text-sm text-stone-600">
                      <Clock className="mr-1 inline h-4 w-4" /> 选择发货日期
                    </label>
                    <input
                      type="date"
                      className="input !py-2 text-sm"
                      value={deliveryDate}
                      min={beijingTodayStr()}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                    />
                    <p className="mt-1 text-xs text-stone-400">
                      {deliveryType === "DELIVERY"
                        ? "快递发货窗口为每天 18:00-20:00"
                        : "闪送按所选日期安排发货"}
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-xs text-stone-500">省份</label>
                      <select
                        className="input !py-2 text-sm"
                        value={addr.province}
                        onChange={(e) => {
                          setAddr({ ...addr, province: e.target.value });
                          setCustomerAckRisk(false);
                        }}
                      >
                        <option value="">请选择</option>
                        {PROVINCE_OPTIONS.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-stone-500">城市</label>
                      <input
                        className="input !py-2 text-sm"
                        value={addr.city}
                        onChange={(e) => setAddr({ ...addr, city: e.target.value })}
                        placeholder="例如：北京"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-stone-500">区/县</label>
                      <input
                        className="input !py-2 text-sm"
                        value={addr.district}
                        onChange={(e) => setAddr({ ...addr, district: e.target.value })}
                        placeholder="例如：昌平区"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-stone-500">详细地址</label>
                    <input
                      className="input !py-2 text-sm"
                      value={addr.detail}
                      onChange={(e) => setAddr({ ...addr, detail: e.target.value })}
                      placeholder="街道 / 楼号 / 门牌号"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs text-stone-500">
                        <User className="mr-1 inline h-3 w-3" />
                        收件人
                      </label>
                      <input
                        className="input !py-2 text-sm"
                        value={receiverName}
                        onChange={(e) => setReceiverName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-stone-500">
                        <Phone className="mr-1 inline h-3 w-3" /> 手机号
                      </label>
                      <input
                        className="input !py-2 text-sm"
                        maxLength={11}
                        value={receiverPhone}
                        onChange={(e) =>
                          setReceiverPhone(e.target.value.replace(/\D/g, ""))
                        }
                      />
                    </div>
                  </div>

                  {/* 快递专属：发货窗口 + 时效查询 + 风险确认 */}
                  {deliveryType === "DELIVERY" && (
                    <div className="space-y-3 border-t border-stone-100 pt-4">
                      <div className="flex items-center gap-2 text-primary-700">
                        <Truck className="h-5 w-5" />
                        <span className="font-semibold">快递发货须知</span>
                      </div>

                      <div
                        className={`rounded-lg border p-3 text-sm ${
                          inWindow
                            ? "border-green-200 bg-green-50"
                            : "border-amber-200 bg-amber-50"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <Clock
                            className={`mt-0.5 h-4 w-4 shrink-0 ${
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
                              <div className="mt-1 flex items-center gap-1 text-green-700">
                                <CheckCircle2 className="h-3.5 w-3.5" /> 当前在发货窗口内，今天即可发货
                              </div>
                            ) : (
                              <div className="mt-1 text-amber-700">
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

                      {/* 时效结果 */}
                      {etaLoading && (
                        <div className="text-xs text-stone-400">正在查询快递时效...</div>
                      )}
                      {etaResult && (
                        <div
                          className={`rounded-lg p-3 text-sm ${
                            !etaResult.supported
                              ? "border border-red-200 bg-red-50"
                              : etaResult.recommendCancel
                              ? "border border-amber-200 bg-amber-50"
                              : "border border-green-200 bg-green-50"
                          }`}
                        >
                          {!etaResult.supported ? (
                            <div className="flex items-start gap-2">
                              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                              <div>
                                <div className="font-medium text-red-800">
                                  该地区暂不支持快递配送
                                </div>
                                <div className="mt-1 text-red-700">{etaResult.warning}</div>
                              </div>
                            </div>
                          ) : etaResult.recommendCancel ? (
                            <div className="space-y-3">
                              <div className="flex items-start gap-2">
                                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                                <div>
                                  <div className="font-medium text-amber-800">运输超时风险</div>
                                  <div className="mt-1 whitespace-pre-line text-amber-700">
                                    {etaResult.warning}
                                  </div>
                                  <div className="mt-2 text-stone-700">
                                    预计发货：
                                    {etaResult.shipDate &&
                                      new Date(etaResult.shipDate).toLocaleDateString("zh-CN")}
                                    ｜ 预计送达：
                                    {etaResult.estimatedArrival &&
                                      new Date(etaResult.estimatedArrival).toLocaleDateString(
                                        "zh-CN"
                                      )}
                                    ｜ 在途 {etaResult.nightsInTransit} 晚
                                  </div>
                                </div>
                              </div>
                              <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-amber-200 bg-white/60 p-2">
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
                              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                              <div>
                                <div className="font-medium text-green-800">
                                  预计
                                  {etaResult.deliveryDays === 1
                                    ? "次日"
                                    : etaResult.deliveryDays + "天后"}
                                  送达
                                </div>
                                <div className="mt-1 text-green-700">{etaResult.warning}</div>
                                <div className="mt-1 text-xs text-stone-600">
                                  发货：
                                  {etaResult.shipDate &&
                                    new Date(etaResult.shipDate).toLocaleDateString("zh-CN")}
                                  ｜ 送达：
                                  {etaResult.estimatedArrival &&
                                    new Date(etaResult.estimatedArrival).toLocaleDateString(
                                      "zh-CN"
                                    )}
                                  ｜ 在途 {etaResult.nightsInTransit} 晚
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* 备注 */}
              <div className="card p-5">
                <h3 className="mb-3 font-bold">订单备注（可选）</h3>
                <textarea
                  className="input"
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="有特殊要求可告诉我们..."
                  maxLength={500}
                />
              </div>
            </div>

            {/* 右侧：费用明细 + 提交 */}
            <aside className="lg:col-span-1">
              <div className="card sticky top-24 p-5">
                <h3 className="mb-4 font-bold">订单明细</h3>
                <div className="mb-3 space-y-1.5 text-sm text-stone-500">
                  <div className="flex justify-between">
                    <span>
                      合计 {pricing.totalBoxes} 盒（经典{pricing.classicBoxes} + 特色
                      {pricing.specialtyBoxes}）
                    </span>
                  </div>
                  <div className="my-3 space-y-1.5 border-t border-stone-100 pt-3">
                    {pricing.breakdown.map((b, i) => (
                      <div key={i} className="flex justify-between text-stone-600">
                        <span className="pr-2">
                          ×{b.count} {b.description}
                        </span>
                        <span className="shrink-0 text-stone-700">
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

                <div className="mb-4 border-t border-stone-200 pt-4">
                  <div className="flex items-end justify-between">
                    <span className="text-stone-600">应付总额</span>
                    <div className="text-3xl font-bold text-primary-600">
                      ¥{formatYuan(pricing.totalAmount)}
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="mb-3 flex items-start gap-2 rounded-lg border border-accent-200 bg-accent-50 p-3 text-sm text-accent-700">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    {error}
                  </div>
                )}

                <button
                  className="btn-primary flex w-full items-center justify-center gap-2 !py-3 text-base disabled:opacity-50"
                  onClick={submit}
                  disabled={submitting || deliveryBlocked}
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CreditCard className="h-4 w-4" />
                  )}
                  {submitting ? "提交中..." : "提交订单"}
                </button>

                {loggedIn === false && (
                  <p className="mt-3 text-center text-xs text-stone-400">
                    请先在上方一键登录后再提交
                  </p>
                )}
                <p className="mt-3 text-center text-xs text-stone-400">
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
