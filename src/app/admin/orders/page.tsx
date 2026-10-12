import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  PackageSearch,
  Truck,
  CheckCircle2,
  Clock,
  ChefHat,
  Search,
  ChevronRight,
} from "lucide-react";
import { formatYuan } from "@/lib/pricing";
import { ExportCSVButton } from "@/components/ExportCSVButton";

const STATUS_TEXT: Record<string, { label: string; cls: string }> = {
  PENDING_PAYMENT: { label: "待支付", cls: "bg-amber-100 text-amber-800" },
  PAID: { label: "已支付", cls: "bg-blue-100 text-blue-800" },
  PREPARING: { label: "备餐中", cls: "bg-indigo-100 text-indigo-800" },
  READY: { label: "待取/发货", cls: "bg-teal-100 text-teal-800" },
  SHIPPED: { label: "配送中", cls: "bg-cyan-100 text-cyan-800" },
  COMPLETED: { label: "已完成", cls: "bg-green-100 text-green-800" },
  CANCELLED: { label: "已取消", cls: "bg-stone-100 text-stone-500" },
};

export default async function AdminOrdersPage(props: {
  searchParams: { status?: string; q?: string };
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login");
  if (session.user.role !== "ADMIN" && session.user.role !== "KITCHEN") {
    redirect("/");
  }

  const status = props.searchParams.status;
  const q = props.searchParams.q;

  const where: any = {};
  if (status && status !== "ALL") where.status = status;
  if (q) {
    where.OR = [
      { orderNo: { contains: q } },
      { receiverPhone: { contains: q } },
      { receiverName: { contains: q } },
      {
        user: {
          phone: { contains: q },
        },
      },
    ];
  }

  const [orders, counts] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        orderNo: true,
        status: true,
        createdAt: true,
        deliveryType: true,
        pickupSlot: true,
        pickupCode: true,
        receiverProvince: true,
        receiverCity: true,
        receiverDistrict: true,
        receiverAddress: true,
        receiverName: true,
        receiverPhone: true,
        totalBoxes: true,
        totalAmount: true,
        frozenConfirmRequired: true,
        note: true,
        items: { select: { productName: true, quantity: true } },
        user: { select: { phone: true, name: true } },
      },
      take: 100,
    }),
    prisma.order.groupBy({
      by: ["status"],
      _count: { status: true },
    }),
  ]);

  const countMap: Record<string, number> = {};
  for (const c of counts) countMap[c.status] = c._count.status;
  const totalPending =
    (countMap.PAID || 0) +
    (countMap.PREPARING || 0) +
    (countMap.READY || 0);

  const STATUSES = [
    { key: "ALL", label: "全部", icon: PackageSearch },
    { key: "PAID", label: "已支付", icon: CheckCircle2 },
    { key: "PREPARING", label: "备餐中", icon: ChefHat },
    { key: "READY", label: "待取/发货", icon: Clock },
    { key: "SHIPPED", label: "配送中", icon: Truck },
    { key: "COMPLETED", label: "已完成", icon: CheckCircle2 },
  ];

  const csvRows = orders.map((o) => ({
    orderNo: o.orderNo,
    pickupCode: o.pickupCode || "",
    customerName: o.user.name,
    customerPhone: o.user.phone,
    deliveryType:
      o.deliveryType === "PICKUP"
        ? "自取"
        : o.deliveryType === "DELIVERY"
        ? "快递"
        : "闪送",
    items: o.items.map((it) => `${it.productName}×${it.quantity}`).join("; "),
    totalBoxes: o.totalBoxes,
    totalAmount: o.totalAmount,
    status: STATUS_TEXT[o.status]?.label || o.status,
    createdAt: o.createdAt.toLocaleString("zh-CN"),
    receiverName: o.receiverName || "",
    receiverPhone: o.receiverPhone || "",
    receiverAddress: `${o.receiverProvince || ""}${o.receiverCity || ""}${
      o.receiverDistrict || ""
    }${o.receiverAddress || ""}`,
    note: o.note || "",
  }));

  return (
    <div className="min-h-screen bg-stone-100">
      <header className="bg-white border-b border-stone-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center gap-4">
          <Link href="/admin/dashboard" className="text-stone-500 hover:text-primary-600 text-sm">
            ← 仪表盘
          </Link>
          <h1 className="font-bold text-lg">订单管理</h1>
          <div className="flex-1" />
          {totalPending > 0 && (
            <span className="bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded-full">
              待处理 {totalPending} 单
            </span>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* 搜索 + 筛选 */}
        <form className="card p-4 mb-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              name="q"
              defaultValue={q || ""}
              placeholder="搜索订单号 / 手机号 / 姓名"
              className="input pl-10"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {STATUSES.map((s) => {
              const active = (status || "ALL") === s.key;
              const cnt = s.key === "ALL" ? undefined : countMap[s.key];
              return (
                <Link
                  key={s.key}
                  href={
                    "/admin/orders?status=" +
                    s.key +
                    (q ? "&q=" + encodeURIComponent(q) : "")
                  }
                  className={`px-3 py-2 rounded-lg text-sm border flex items-center gap-1.5 transition-colors ${
                    active
                      ? "bg-primary-50 border-primary-300 text-primary-700 ring-1 ring-primary-200"
                      : "border-stone-200 text-stone-600 hover:border-stone-300"
                  }`}
                >
                  <s.icon className="w-3.5 h-3.5" />
                  {s.label}
                  {cnt !== undefined && cnt > 0 && (
                    <span className="text-xs bg-stone-100 rounded-full px-1.5">
                      {cnt}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </form>

        <div className="mb-4 flex justify-end">
          <ExportCSVButton orders={csvRows} />
        </div>

        {/* 订单列表 */}
        {orders.length === 0 ? (
          <div className="card p-16 text-center text-stone-400">
            <PackageSearch className="w-12 h-12 mx-auto mb-3" />
            暂无符合条件的订单
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-stone-50 text-stone-500 text-xs">
                  <tr>
                    <th className="text-left px-4 py-3">订单</th>
                    <th className="text-left px-4 py-3">顾客</th>
                    <th className="text-left px-4 py-3">配送方式</th>
                    <th className="text-left px-4 py-3">取货码</th>
                    <th className="text-left px-4 py-3">商品</th>
                    <th className="text-right px-4 py-3">金额</th>
                    <th className="text-left px-4 py-3">状态</th>
                    <th className="text-right px-4 py-3">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {orders.map((order) => {
                    const st = STATUS_TEXT[order.status];
                    return (
                      <tr key={order.id} className="hover:bg-stone-50">
                        <td className="px-4 py-3 align-top">
                          <div className="font-mono text-xs text-stone-400">
                            {order.orderNo}
                          </div>
                          <div className="text-xs text-stone-400 mt-1">
                            {order.createdAt.toLocaleString("zh-CN", {
                              month: "2-digit",
                              day: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="font-medium">{order.user.name}</div>
                          <div className="text-xs text-stone-500">
                            {order.user.phone}
                          </div>
                          {order.deliveryType !== "PICKUP" && order.receiverPhone && (
                            <div className="text-xs text-stone-400">
                              收件人：{order.receiverName} {order.receiverPhone}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="text-xs">
                            {order.deliveryType === "PICKUP" && (
                              <span className="text-indigo-700">
                                自取{order.pickupSlot ? ` · ${order.pickupSlot}` : ""}
                              </span>
                            )}
                            {order.deliveryType === "DELIVERY" && (
                              <span className="text-blue-700">快递</span>
                            )}
                            {order.deliveryType === "EXPRESS" && (
                              <span className="text-purple-700">闪送</span>
                            )}
                          </div>
                          {order.deliveryType !== "PICKUP" && order.receiverProvince && (
                            <div className="text-xs text-stone-500 mt-1 max-w-[200px] truncate" title={`${order.receiverProvince}${order.receiverCity}${order.receiverDistrict}${order.receiverAddress}`}>
                              {order.receiverProvince} {order.receiverCity}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 align-top">
                          {order.deliveryType === "PICKUP" && order.pickupCode ? (
                            <span className="font-mono text-sm font-bold text-primary-700 tracking-wider">
                              {order.pickupCode}
                            </span>
                          ) : (
                            <span className="text-xs text-stone-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 align-top max-w-[240px]">
                          <div className="text-xs text-stone-600 space-y-0.5">
                            {order.items.map((it, i) => (
                              <div key={i} className="truncate">
                                · {it.productName} × {it.quantity}
                              </div>
                            ))}
                            <div className="text-stone-400 pt-0.5">
                              共 {order.totalBoxes} 盒
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top text-right font-medium">
                          ¥{formatYuan(order.totalAmount)}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-xs ${st?.cls}`}
                          >
                            {st?.label || order.status}
                          </span>
                          {order.frozenConfirmRequired &&
                            (order.status === "READY" || order.status === "PREPARING" || order.status === "PAID") &&
                            order.deliveryType === "DELIVERY" && (
                              <div className="mt-1 text-xs text-amber-700 whitespace-nowrap">
                                ⚠️ 需冷冻确认
                              </div>
                            )}
                        </td>
                        <td className="px-4 py-3 align-top text-right whitespace-nowrap">
                          <Link
                            href={"/orders/" + order.id}
                            className="text-xs text-stone-600 hover:text-primary-600 inline-flex items-center gap-0.5"
                          >
                            详情 <ChevronRight className="w-3 h-3" />
                          </Link>
                          {order.deliveryType === "DELIVERY" &&
                            (order.status === "PAID" || order.status === "PREPARING" || order.status === "READY") && (
                              <>
                                <br />
                                <Link
                                  href={"/admin/orders/" + order.id + "/ship"}
                                  className="text-xs text-primary-600 hover:text-primary-700 inline-flex items-center gap-0.5 mt-1"
                                >
                                  发货 <Truck className="w-3 h-3" />
                                </Link>
                              </>
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
