import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { formatYuan } from "@/lib/pricing";
import { formatBeijingDateTime, formatBeijingDate, beijingDayStart } from "@/lib/time";
import { AdminShell } from "@/components/AdminShell";
import { ExportCSVButton } from "@/components/ExportCSVButton";
import {
  BarChart3,
  TrendingUp,
  ShoppingBasket,
  Package,
  Wallet,
  CalendarDays,
  ChevronRight,
  Store,
  Truck,
  Zap,
  ChefHat,
} from "lucide-react";

/**
 * 后台 - 销售汇总页（A2）
 * 支持按时间段筛选，汇总订单数/销售额/盒数/客单价，
 * 展示按天销售趋势、口味分布、配送方式分布，并支持导出 CSV。
 */

type RangeKey = "today" | "7d" | "30d" | "custom";

const RANGES: { key: RangeKey; label: string }[] = [
  { key: "today", label: "今日" },
  { key: "7d", label: "近7天" },
  { key: "30d", label: "近30天" },
];

const DELIVERY_LABEL: Record<string, string> = {
  PICKUP: "自取",
  DELIVERY: "快递",
  EXPRESS: "闪送",
};

const STATUS_LABEL: Record<string, string> = {
  PENDING_PAYMENT: "待支付",
  PAID: "已支付",
  PREPARING: "备餐中",
  READY: "待取/发货",
  READY_FOR_PICKUP: "待取",
  SHIPPED: "配送中",
  COMPLETED: "已完成",
  CANCELLED: "已取消",
};

/** 将日期归到「北京时间」的自然日 key（YYYY-MM-DD） */
function beijingDayKey(d: Date): string {
  const t = new Date(d.getTime() + 8 * 3600 * 1000);
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}-${String(
    t.getUTCDate()
  ).padStart(2, "0")}`;
}

function resolveRange(range: RangeKey, startDate?: string, endDate?: string) {
  // 「今日」以北京时间自然日为准（Cloudflare 运行时本地时区为 UTC）
  const todayStart = beijingDayStart();

  let from = new Date(todayStart);
  let to = new Date();

  if (range === "today") {
    from = todayStart;
    to = new Date();
  } else if (range === "7d") {
    from = new Date(todayStart.getTime() - 6 * 24 * 3600 * 1000);
  } else if (range === "30d") {
    from = new Date(todayStart.getTime() - 29 * 24 * 3600 * 1000);
  } else if (range === "custom") {
    if (startDate) {
      const s = new Date(`${startDate}T00:00:00+08:00`);
      if (!isNaN(s.getTime())) from = s;
    }
    if (endDate) {
      const e = new Date(`${endDate}T23:59:59.999+08:00`);
      if (!isNaN(e.getTime())) to = e;
    }
  }

  return { from, to };
}

export default async function AdminSalesPage(props: {
  searchParams: { range?: string; startDate?: string; endDate?: string };
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/admin/login");
  if (session.user.role !== "ADMIN" && session.user.role !== "KITCHEN") {
    redirect("/");
  }

  const range: RangeKey =
    props.searchParams.range === "today" ||
    props.searchParams.range === "30d" ||
    props.searchParams.range === "custom"
      ? (props.searchParams.range as RangeKey)
      : "7d";
  const { from, to } = resolveRange(
    range,
    props.searchParams.startDate,
    props.searchParams.endDate
  );

  // 拉取范围内订单（含明细），取消订单不计入统计
  const orders = await prisma.order.findMany({
    where: { createdAt: { gte: from, lte: to }, status: { not: "CANCELLED" } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      orderNo: true,
      status: true,
      createdAt: true,
      deliveryType: true,
      totalBoxes: true,
      classicBoxes: true,
      specialtyBoxes: true,
      totalAmount: true,
      receiverName: true,
      receiverPhone: true,
      items: { select: { productName: true, category: true, quantity: true } },
      user: { select: { name: true, phone: true } },
    },
  });

  // ============ 汇总计算 ============
  const orderCount = orders.length;
  let salesAmount = 0;
  let totalBoxes = 0;
  let classicBoxes = 0;
  let specialtyBoxes = 0;

  const deliveryMap: Record<string, { count: number; amount: number }> = {
    PICKUP: { count: 0, amount: 0 },
    DELIVERY: { count: 0, amount: 0 },
    EXPRESS: { count: 0, amount: 0 },
  };
  const flavorMap = new Map<
    string,
    { name: string; category: string; qty: number }
  >();

  for (const o of orders) {
    salesAmount += o.totalAmount;
    totalBoxes += o.totalBoxes;
    classicBoxes += o.classicBoxes;
    specialtyBoxes += o.specialtyBoxes;
    const d = deliveryMap[o.deliveryType] || { count: 0, amount: 0 };
    d.count += 1;
    d.amount += o.totalAmount;
    deliveryMap[o.deliveryType] = d;
    for (const it of o.items) {
      const f = flavorMap.get(it.productName) || {
        name: it.productName,
        category: it.category,
        qty: 0,
      };
      f.qty += it.quantity;
      flavorMap.set(it.productName, f);
    }
  }

  const avgOrderValue = orderCount > 0 ? salesAmount / orderCount : 0;
  const avgBoxPrice = totalBoxes > 0 ? salesAmount / totalBoxes : 0;

  const flavors = [...flavorMap.values()].sort((a, b) => b.qty - a.qty);
  const maxFlavorQty = Math.max(1, ...flavors.map((f) => f.qty));

  // 按天聚合（补齐区间内没有订单的日期）
  const dayKeys: string[] = [];
  {
    const cursor = new Date(from);
    cursor.setHours(0, 0, 0, 0);
    const end = new Date(to);
    // 最多补齐 62 天，防止异常区间
    let guard = 0;
    while (cursor <= end && guard < 62) {
      dayKeys.push(beijingDayKey(cursor));
      cursor.setDate(cursor.getDate() + 1);
      guard++;
    }
  }
  const dayMap = new Map<string, { amount: number; boxes: number; count: number }>();
  for (const k of dayKeys) dayMap.set(k, { amount: 0, boxes: 0, count: 0 });
  for (const o of orders) {
    const k = beijingDayKey(o.createdAt);
    if (!dayMap.has(k)) dayMap.set(k, { amount: 0, boxes: 0, count: 0 });
    const rec = dayMap.get(k)!;
    rec.amount += o.totalAmount;
    rec.boxes += o.totalBoxes;
    rec.count += 1;
  }
  const days = [...dayMap.entries()].map(([key, v]) => ({ key, ...v }));
  const maxDayAmount = Math.max(1, ...days.map((d) => d.amount));

  const rangeText = `${from.toLocaleDateString("zh-CN")} ~ ${to.toLocaleDateString(
    "zh-CN"
  )}`;

  const csvRows = orders.slice(0, 500).map((o) => ({
    orderNo: o.orderNo,
    pickupCode: "",
    customerName: o.user.name,
    customerPhone: o.user.phone,
    deliveryType: DELIVERY_LABEL[o.deliveryType] || o.deliveryType,
    items: o.items.map((it) => `${it.productName}×${it.quantity}`).join("; "),
    itemsDetail: o.items.map((it) => ({
      name: it.productName,
      category: it.category,
      quantity: it.quantity,
    })),
    totalBoxes: o.totalBoxes,
    totalAmount: o.totalAmount,
    status: STATUS_LABEL[o.status] || o.status,
    createdAt: formatBeijingDateTime(o.createdAt),
    receiverName: o.receiverName || "",
    receiverPhone: o.receiverPhone || "",
    receiverAddress: "",
    note: "",
  }));

  return (
    <AdminShell role={session.user.role}>
      <main className="flex-1 overflow-auto p-4 md:p-8">
        {/* 标题 + 时间段筛选 */}
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <BarChart3 className="w-7 h-7 text-primary-600" /> 销售汇总
            </h1>
            <p className="mt-1 text-sm text-stone-500">
              统计区间：{rangeText} · 共 {orderCount} 单
            </p>
          </div>
          <ExportCSVButton orders={csvRows} />
        </div>

        {/* 时间段选择 */}
        <div className="card mb-4 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {RANGES.map((r) => (
                <Link
                  key={r.key}
                  href={`/admin/sales?range=${r.key}`}
                  className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                    range === r.key
                      ? "border-primary-300 bg-primary-50 text-primary-700 ring-1 ring-primary-200"
                      : "border-stone-200 text-stone-600 hover:border-stone-300"
                  }`}
                >
                  {r.label}
                </Link>
              ))}
              <Link
                href={`/admin/sales?range=custom${
                  props.searchParams.startDate
                    ? `&startDate=${props.searchParams.startDate}`
                    : ""
                }${
                  props.searchParams.endDate
                    ? `&endDate=${props.searchParams.endDate}`
                    : ""
                }`}
                className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                  range === "custom"
                    ? "border-primary-300 bg-primary-50 text-primary-700 ring-1 ring-primary-200"
                    : "border-stone-200 text-stone-600 hover:border-stone-300"
                }`}
              >
                自定义
              </Link>
            </div>

            <form
              method="get"
              action="/admin/sales"
              className="flex flex-wrap items-center gap-2 text-sm"
            >
              <input type="hidden" name="range" value="custom" />
              <CalendarDays className="w-4 h-4 text-stone-400" />
              <input
                type="date"
                name="startDate"
                defaultValue={props.searchParams.startDate || ""}
                className="input !w-40 !py-2"
              />
              <span className="text-stone-400">至</span>
              <input
                type="date"
                name="endDate"
                defaultValue={props.searchParams.endDate || ""}
                className="input !w-40 !py-2"
              />
              <button type="submit" className="btn-primary !py-2">
                查询
              </button>
            </form>
          </div>
        </div>

        {/* 核心指标 */}
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <MetricCard
            label="订单数"
            value={orderCount.toString()}
            suffix="单"
            icon={<ShoppingBasket className="w-5 h-5 text-blue-600" />}
          />
          <MetricCard
            label="销售额"
            value={`¥${formatYuan(salesAmount)}`}
            suffix=""
            icon={<Wallet className="w-5 h-5 text-primary-600" />}
          />
          <MetricCard
            label="销售盒数"
            value={totalBoxes.toString()}
            suffix="盒"
            icon={<Package className="w-5 h-5 text-green-600" />}
          />
          <MetricCard
            label="客单价"
            value={`¥${formatYuan(Math.round(avgOrderValue))}`}
            suffix=""
            icon={<TrendingUp className="w-5 h-5 text-amber-600" />}
          />
        </div>

        {/* 销售趋势 */}
        <div className="card mb-6 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-bold">
              <TrendingUp className="w-4 h-4 text-primary-600" /> 销售趋势（按天）
            </h3>
            <span className="text-xs text-stone-400">
              柱高 = 当日销售额 · 均盒价 ¥{formatYuan(Math.round(avgBoxPrice))}
            </span>
          </div>
          {orderCount === 0 ? (
            <div className="py-10 text-center text-sm text-stone-400">
              该区间暂无订单数据
            </div>
          ) : (
            <div className="flex items-end gap-1.5 overflow-x-auto pb-1" style={{ height: 180 }}>
              {days.map((d) => {
                const h = Math.round((d.amount / maxDayAmount) * 130);
                const isToday = d.key === beijingDayKey(new Date());
                return (
                  <div
                    key={d.key}
                    className="flex min-w-[36px] flex-1 flex-col items-center justify-end gap-1"
                    title={`${d.key} · ${d.count}单 · ${d.boxes}盒 · ¥${formatYuan(
                      d.amount
                    )}`}
                  >
                    <span className="text-[10px] text-stone-400">
                      {d.amount > 0 ? `¥${(d.amount / 100).toFixed(0)}` : ""}
                    </span>
                    <div
                      className={`w-full rounded-t ${
                        isToday ? "bg-primary-500" : "bg-primary-300"
                      }`}
                      style={{ height: Math.max(d.amount > 0 ? 4 : 1, h) }}
                    />
                    <span className="whitespace-nowrap text-[10px] text-stone-400">
                      {d.key.slice(5)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* 口味分布 */}
          <div className="card p-5">
            <h3 className="mb-4 flex items-center gap-2 font-bold">
              <ChefHat className="w-4 h-4 text-primary-600" /> 口味销量分布
            </h3>
            {flavors.length === 0 ? (
              <div className="py-8 text-center text-sm text-stone-400">
                暂无数据
              </div>
            ) : (
              <div className="space-y-3">
                {flavors.map((f) => {
                  const pct = (f.qty / maxFlavorQty) * 100;
                  return (
                    <div key={f.name}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <span className="font-medium">{f.name}</span>
                          <span
                            className={
                              f.category === "CLASSIC"
                                ? "badge-classic"
                                : "badge-specialty"
                            }
                          >
                            {f.category === "CLASSIC" ? "经典" : "特色"}
                          </span>
                        </span>
                        <span className="font-medium text-stone-600">
                          {f.qty} 盒
                        </span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-stone-100">
                        <div
                          className={`h-full rounded-full ${
                            f.category === "CLASSIC"
                              ? "bg-primary-400"
                              : "bg-amber-400"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 配送方式 + 品类占比 */}
          <div className="space-y-6">
            <div className="card p-5">
              <h3 className="mb-4 flex items-center gap-2 font-bold">
                <Truck className="w-4 h-4 text-primary-600" /> 配送方式分布
              </h3>
              <div className="mb-4 flex h-3 overflow-hidden rounded-full bg-stone-100">
                {(["PICKUP", "DELIVERY", "EXPRESS"] as const).map((k, i) => {
                  const pct =
                    orderCount > 0
                      ? (deliveryMap[k].count / orderCount) * 100
                      : 0;
                  const colors = [
                    "bg-primary-500",
                    "bg-blue-500",
                    "bg-purple-500",
                  ];
                  return pct > 0 ? (
                    <div
                      key={k}
                      className={colors[i]}
                      style={{ width: `${pct}%` }}
                    />
                  ) : null;
                })}
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                {(
                  [
                    { key: "PICKUP", icon: Store, color: "text-primary-600" },
                    { key: "DELIVERY", icon: Truck, color: "text-blue-600" },
                    { key: "EXPRESS", icon: Zap, color: "text-purple-600" },
                  ] as const
                ).map((d) => {
                  const rec = deliveryMap[d.key];
                  return (
                    <div key={d.key} className="rounded-lg border border-stone-100 p-3">
                      <d.icon className={`mx-auto mb-1 w-4 h-4 ${d.color}`} />
                      <div className="text-sm font-bold">{rec.count} 单</div>
                      <div className="text-xs text-stone-400">
                        {DELIVERY_LABEL[d.key]} · ¥{formatYuan(rec.amount)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="card p-5">
              <h3 className="mb-4 flex items-center gap-2 font-bold">
                <Package className="w-4 h-4 text-primary-600" /> 品类占比
              </h3>
              <div className="mb-4 flex h-3 overflow-hidden rounded-full bg-stone-100">
                <div
                  className="bg-primary-500"
                  style={{
                    width: `${
                      totalBoxes > 0 ? (classicBoxes / totalBoxes) * 100 : 0
                    }%`,
                  }}
                />
                <div
                  className="bg-amber-400"
                  style={{
                    width: `${
                      totalBoxes > 0 ? (specialtyBoxes / totalBoxes) * 100 : 0
                    }%`,
                  }}
                />
              </div>
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="rounded-lg border border-stone-100 p-3">
                  <div className="text-sm font-bold text-primary-700">
                    {classicBoxes} 盒
                  </div>
                  <div className="text-xs text-stone-400">经典口味</div>
                </div>
                <div className="rounded-lg border border-stone-100 p-3">
                  <div className="text-sm font-bold text-amber-700">
                    {specialtyBoxes} 盒
                  </div>
                  <div className="text-xs text-stone-400">特色口味</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 订单明细 */}
        <div className="card mt-6 overflow-hidden">
          <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
            <h3 className="font-bold">区间订单明细</h3>
            <Link
              href="/admin/orders"
              className="flex items-center gap-0.5 text-sm text-primary-600 hover:text-primary-700"
            >
              去订单管理 <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          {orders.length === 0 ? (
            <div className="p-12 text-center text-sm text-stone-400">
              该区间暂无订单
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-stone-50 text-xs text-stone-500">
                  <tr>
                    <th className="px-4 py-3 text-left">订单号</th>
                    <th className="px-4 py-3 text-left">顾客</th>
                    <th className="px-4 py-3 text-left">配送</th>
                    <th className="px-4 py-3 text-left">商品</th>
                    <th className="px-4 py-3 text-right">盒数</th>
                    <th className="px-4 py-3 text-right">金额</th>
                    <th className="px-4 py-3 text-left">下单时间</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {orders.slice(0, 100).map((o) => (
                    <tr key={o.id} className="hover:bg-stone-50">
                      <td className="px-4 py-3 font-mono text-xs text-stone-400">
                        {o.orderNo.slice(-10)}
                      </td>
                      <td className="px-4 py-3">
                        <div>{o.user.name}</div>
                        <div className="text-xs text-stone-400">
                          {o.user.phone}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {DELIVERY_LABEL[o.deliveryType] || o.deliveryType}
                      </td>
                      <td className="px-4 py-3 text-xs text-stone-600">
                        {o.items
                          .map((it) => `${it.productName}×${it.quantity}`)
                          .join("、")}
                      </td>
                      <td className="px-4 py-3 text-right">{o.totalBoxes}</td>
                      <td className="px-4 py-3 text-right font-medium">
                        ¥{formatYuan(o.totalAmount)}
                      </td>
                      <td className="px-4 py-3 text-xs text-stone-400">
                        {o.createdAt.toLocaleString("zh-CN", {
                          timeZone: "Asia/Shanghai",
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </AdminShell>
  );
}

function MetricCard({
  label,
  value,
  suffix,
  icon,
}: {
  label: string;
  value: string;
  suffix: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="card p-4 md:p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm text-stone-500">{label}</span>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-stone-50">
          {icon}
        </div>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold md:text-3xl">{value}</span>
        <span className="text-sm text-stone-400">{suffix}</span>
      </div>
    </div>
  );
}
