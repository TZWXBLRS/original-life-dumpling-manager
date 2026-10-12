"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  calculatePrice,
  formatYuan,
  type CartItem,
} from "@/lib/pricing";
import {
  ArrowLeft,
  CreditCard,
  MapPin,
  User,
  Phone,
  Clock,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Store,
} from "lucide-react";

// 自取时段（和 seed 默认同步）
const PICKUP_SLOTS = [
  "09:30-11:30",
  "11:30-13:30",
  "13:30-15:30",
  "15:30-17:30",
  "17:30-19:30",
  "19:30-20:30",
];

const PROVINCE_OPTIONS = [
  "北京","天津","河北","山西","内蒙古","辽宁","吉林","黑龙江",
  "上海","江苏","浙江","安徽","福建","江西","山东",
  "河南","湖北","湖南","广东","广西","海南",
  "重庆","四川","贵州","云南","西藏",
  "陕西","甘肃","青海","宁夏","新疆",
];

export default function CheckoutPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState<CartItem[]>([]);
  const [deliveryType, setDeliveryType] = useState<
    "PICKUP" | "DELIVERY" | "EXPRESS"
  >("PICKUP");

  // 自取
  const [pickupSlot, setPickupSlot] = useState("");

  // 地址
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [detail, setDetail] = useState("");
  const [receiverName, setReceiverName] = useState("");
  const [receiverPhone, setReceiverPhone] = useState("");

  const [customerAckRisk, setCustomerAckRisk] = useState(false);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);
  const [orderNo, setOrderNo] = useState("");
  const [orderId, setOrderId] = useState("");

  // 读取 localStorage 里的购物车
  useEffect(() => {
    setMounted(true);
    const cart = localStorage.getItem("cart");
    const dt = localStorage.getItem("deliveryType");
    if (cart) {
      try {
        const arr = JSON.parse(cart);
        if (Array.isArray(arr) && arr.length > 0) setItems(arr);
      } catch {}
    } else {
      // 没有购物车就放默认演示数据，方便走流程
      setItems([
        {
          productId: "default-1",
          productName: "三鲜饺子",
          category: "CLASSIC",
          quantity: 3,
          unitPrice: 3300,
        },
        {
          productId: "default-2",
          productName: "菌菇饺子",
          category: "SPECIALTY",
          quantity: 1,
          unitPrice: 3800,
        },
      ]);
    }
    if (dt === "DELIVERY" || dt === "EXPRESS" || dt === "PICKUP") {
      setDeliveryType(dt);
    }
  }, []);

  const pricing = calculatePrice(items, deliveryType);

  const submit = async () => {
    setError("");
    if (items.length === 0) {
      setError("购物车为空");
      return;
    }
    // 地址校验
    if (deliveryType !== "PICKUP") {
      if (!province || !city || !district || !detail || !receiverName || !receiverPhone) {
        setError("请填写完整的收货信息（省市区、详细地址、收件人、手机号）");
        return;
      }
      if (!/^1\d{10}$/.test(receiverPhone)) {
        setError("手机号格式不正确");
        return;
      }
    } else {
      if (!pickupSlot) {
        setError("请选择自取时段");
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
          address:
            deliveryType !== "PICKUP"
              ? { province, city, district, detail, name: receiverName, phone: receiverPhone }
              : undefined,
          pickupSlot: deliveryType === "PICKUP" ? pickupSlot : undefined,
          customerAckRisk,
          note,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setOrderNo(data.orderNo);
      setOrderId(data.orderId);
      setOk(true);
      // 清空购物车
      localStorage.removeItem("cart");
    } catch (err: any) {
      setError(err.message || "下单失败");
    } finally {
      setSubmitting(false);
    }
  };

  // 下单成功：模拟支付——调用 status API 把订单推进到 PAID，再跳转订单列表
  const pay = async () => {
    if (!orderId) return;
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "PAY", paymentMethod: "MANUAL" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "支付失败");
      router.push("/orders?paid=1");
    } catch (err: any) {
      setError(err.message || "支付失败");
    }
  };

  if (!mounted) return null;

  if (ok) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 p-4">
        <div className="card max-w-md w-full p-8 text-center">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">下单成功 🎉</h2>
          <p className="text-stone-500 mb-4">订单号：{orderNo}</p>
          <div className="text-stone-600 text-sm mb-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
            应付 <b className="text-primary-600">¥{formatYuan(pricing.totalAmount)}</b>
            <br />
            <span className="text-xs text-stone-500">（目前为模拟支付，真实收款可接入微信/支付宝商户号）</span>
          </div>
          <button onClick={pay} className="btn-primary w-full !py-3 mb-2">
            <CreditCard className="w-4 h-4 mr-2" /> 立即支付（模拟）
          </button>
          <Link href="/orders" className="btn-secondary w-full block">
            查看订单
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-white border-b border-stone-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center gap-4">
          <Link href="/cart" className="text-stone-500 hover:text-primary-600 flex items-center gap-1 text-sm">
            <ArrowLeft className="w-4 h-4" /> 返回购物车
          </Link>
          <h1 className="font-bold text-lg">确认订单</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* 配送信息 */}
          <div className="card p-5">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              {deliveryType === "PICKUP" ? (
                <Store className="w-5 h-5 text-primary-600" />
              ) : (
                <MapPin className="w-5 h-5 text-primary-600" />
              )}
              配送方式
            </h3>
            <div className="grid sm:grid-cols-3 gap-3 mb-5">
              {(
                [
                  { key: "PICKUP", name: "自取", desc: "门店自取免运费" },
                  { key: "DELIVERY", name: "快递", desc: "泡沫箱¥5/5盒" },
                  { key: "EXPRESS", name: "闪送", desc: "无泡沫箱费" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setDeliveryType(opt.key)}
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

            {deliveryType === "PICKUP" ? (
              <div className="space-y-3">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
                  <MapPin className="w-4 h-4 inline mr-1 text-amber-600" />
                  <b>自取地址：</b>北京昌平路181号院卢卡新天地3号楼底商负107 素生活
                </div>
                <div>
                  <label className="block text-sm text-stone-600 mb-2">
                    <Clock className="w-4 h-4 inline mr-1" /> 选择自取时段（营业时间：9:30-20:30）
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {PICKUP_SLOTS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setPickupSlot(s)}
                        className={`py-2 rounded-lg text-sm border ${
                          pickupSlot === s
                            ? "border-primary-500 bg-primary-50 text-primary-700 font-medium"
                            : "border-stone-200 hover:border-stone-300"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-stone-500 mb-1">省份</label>
                    <select
                      className="input !py-2 text-sm"
                      value={province}
                      onChange={(e) => setProvince(e.target.value)}
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
                    <label className="block text-xs text-stone-500 mb-1">城市</label>
                    <input
                      className="input !py-2 text-sm"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="例如：北京"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-stone-500 mb-1">区/县</label>
                    <input
                      className="input !py-2 text-sm"
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      placeholder="例如：昌平区"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-stone-500 mb-1">详细地址</label>
                  <input
                    className="input !py-2 text-sm"
                    value={detail}
                    onChange={(e) => setDetail(e.target.value)}
                    placeholder="街道 / 楼号 / 门牌号"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-stone-500 mb-1">
                      <User className="w-3 h-3 inline mr-1" />
                      收件人
                    </label>
                    <input
                      className="input !py-2 text-sm"
                      value={receiverName}
                      onChange={(e) => setReceiverName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-stone-500 mb-1">
                      <Phone className="w-3 h-3 inline mr-1" /> 手机号
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
                {deliveryType === "DELIVERY" && (
                  <label className="flex items-start gap-2 cursor-pointer bg-amber-50 rounded-lg p-3 border border-amber-200 text-xs text-amber-800">
                    <input
                      type="checkbox"
                      checked={customerAckRisk}
                      onChange={(e) => setCustomerAckRisk(e.target.checked)}
                      className="mt-0.5"
                    />
                    <span>
                      我已了解快递保鲜期限制（泡沫箱安全保鲜1晚），
                      如因距离过远导致在途超时变质，我自行承担损失。
                      <br />
                      <span className="text-stone-500">
                        （如快递到你的省份超过1天，建议选自取或闪送）
                      </span>
                    </span>
                  </label>
                )}
              </div>
            )}
          </div>

          {/* 商品清单 */}
          <div className="card p-5">
            <h3 className="font-bold mb-3">商品清单</h3>
            <div className="divide-y divide-stone-100">
              {items.map((it) => (
                <div key={it.productId} className="py-2 flex items-center justify-between">
                  <div>
                    <div className="font-medium">{it.productName}</div>
                    <div className="text-xs text-stone-500">
                      ¥{it.unitPrice / 100}/盒 × {it.quantity}
                    </div>
                  </div>
                  <div className="font-medium">¥{(it.unitPrice * it.quantity) / 100}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 备注 */}
          <div className="card p-5">
            <h3 className="font-bold mb-3">订单备注（可选）</h3>
            <textarea
              className="input"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="有特殊要求可告诉我们..."
              maxLength={500}
            />
          </div>

          {error && (
            <div className="bg-accent-50 border border-accent-200 rounded-lg p-3 text-sm text-accent-700 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              {error}
            </div>
          )}
        </div>

        {/* 右侧费用 */}
        <aside className="lg:col-span-1">
          <div className="card p-5 sticky top-24">
            <h3 className="font-bold mb-3">费用明细</h3>
            <div className="text-sm text-stone-500 mb-3 space-y-1.5">
              <div className="border-b border-stone-100 pb-2 space-y-1">
                {pricing.breakdown.map((b, i) => (
                  <div key={i} className="flex justify-between">
                    <span>
                      ×{b.count} {b.description}
                    </span>
                    <span className="text-stone-700">¥{formatYuan(b.subtotal)}</span>
                  </div>
                ))}
              </div>
              {pricing.foamBoxCount > 0 && (
                <div className="flex justify-between">
                  <span>泡沫箱 × {pricing.foamBoxCount}</span>
                  <span>¥{formatYuan(pricing.foamBoxAmount)}</span>
                </div>
              )}
            </div>
            <div className="border-t border-stone-200 pt-3 mb-4">
              <div className="flex justify-between items-end">
                <span className="text-stone-600">合计 {pricing.totalBoxes} 盒</span>
                <div className="text-3xl font-bold text-primary-600">
                  ¥{formatYuan(pricing.totalAmount)}
                </div>
              </div>
            </div>
            <button
              className="btn-primary w-full !py-3 flex items-center justify-center gap-2"
              onClick={submit}
              disabled={submitting}
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CreditCard className="w-4 h-4" />
              )}
              {submitting ? "下单中..." : "提交订单"}
            </button>
            <p className="text-xs text-stone-400 mt-3 text-center">
              提交订单即表示你同意以上配送信息
            </p>
          </div>
        </aside>
      </main>
    </div>
  );
}
