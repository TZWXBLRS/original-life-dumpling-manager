import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/AdminShell";
import {
  Package,
  ChefHat,
  Clock,
  Store,
  Truck,
  Zap,
} from "lucide-react";

export default async function ProductionDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/admin/login");
  if (session.user.role !== "ADMIN" && session.user.role !== "KITCHEN") {
    redirect("/");
  }

  // 今日开始时间
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);

  // 所有已支付、备餐中、备好的订单（今日 + 未来自取的）
  const whereActive: any = {
    status: { in: ["PAID", "PREPARING", "READY", "READY_FOR_PICKUP", "SHIPPED"] },
  };

  const [orders, products] = await Promise.all([
    prisma.order.findMany({
      where: whereActive,
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        orderNo: true,
        status: true,
        deliveryType: true,
        pickupSlot: true,
        totalBoxes: true,
        createdAt: true,
        items: {
          select: { productName: true, category: true, quantity: true },
        },
        user: { select: { phone: true, name: true } },
        receiverName: true,
        receiverPhone: true,
      },
    }),
    prisma.product.findMany({
      where: { isActive: true },
      select: { id: true, name: true, category: true, stock: true, sortOrder: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  // 按口味统计所有待处理订单
  const productStats: Record<
    string,
    { name: string; category: string; total: number; done: number; preparing: number }
  > = {};
  for (const p of products) {
    productStats[p.name] = {
      name: p.name,
      category: p.category,
      total: 0,
      done: 0,
      preparing: 0,
    };
  }

  // 按配送类型分类
  let pickupCount = 0;
  let expressCount = 0;
  let deliveryCount = 0;
  let totalBoxes = 0;

  for (const order of orders) {
    if (order.deliveryType === "PICKUP") pickupCount++;
    else if (order.deliveryType === "EXPRESS") expressCount++;
    else deliveryCount++;
    totalBoxes += order.totalBoxes;

    for (const it of order.items) {
      if (!productStats[it.productName]) continue;
      productStats[it.productName].total += it.quantity;
      if (order.status === "READY" || order.status === "READY_FOR_PICKUP" || order.status === "SHIPPED" || order.status === "COMPLETED") {
        productStats[it.productName].done += it.quantity;
      } else if (order.status === "PREPARING") {
        productStats[it.productName].preparing += it.quantity;
      }
    }
  }

  const statsList = Object.values(productStats).sort((a, b) => {
    const ca = a.category === "CLASSIC" ? 0 : 1;
    const cb = b.category === "CLASSIC" ? 0 : 1;
    if (ca !== cb) return ca - cb;
    return b.total - a.total;
  });

  const maxBoxes = Math.max(1, ...statsList.map((s) => s.total));

  return (
    <AdminShell role={session.user.role}>
      {/* 主内容 */}
      <main className="flex-1 overflow-auto p-4 md:p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ChefHat className="w-7 h-7 text-primary-600" /> 生产看板
            </h1>
            <p className="text-stone-500 text-sm mt-1">
              待处理订单汇总 · {todayStart.toLocaleDateString("zh-CN")}
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs text-stone-500">最后更新</div>
            <div className="text-sm font-mono">{new Date().toLocaleTimeString("zh-CN")}</div>
          </div>
        </div>

        {/* 汇总卡片 */}
        <div className="grid md:grid-cols-4 gap-5 mb-8">
          <StatCard
            label="待处理订单"
            value={orders.length.toString()}
            suffix="单"
            icon={<Zap className="w-5 h-5 text-amber-600" />}
          />
          <StatCard
            label="待备盒数"
            value={totalBoxes.toString()}
            suffix="盒"
            icon={<Package className="w-5 h-5 text-green-600" />}
          />
          <StatCard
            label="自取 / 闪送 / 快递"
            value={`${pickupCount} / ${expressCount} / ${deliveryCount}`}
            suffix="单"
            icon={<Store className="w-5 h-5 text-primary-600" />}
          />
          <StatCard
            label="在途订单"
            value={(orders.filter((o) => o.status === "SHIPPED").length).toString()}
            suffix="单"
            icon={<Truck className="w-5 h-5 text-blue-600" />}
          />
        </div>

        {/* 按口味备料统计 */}
        <div className="card p-6 mb-8">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <ChefHat className="w-4 h-4 text-primary-600" /> 各口味备货统计
          </h3>
          {statsList.every((s) => s.total === 0) ? (
            <div className="text-sm text-stone-400 py-8 text-center">
              ✅ 当前没有待处理的订单
            </div>
          ) : (
            <div className="space-y-3">
              {statsList.map((s) => {
                const pending = s.total - s.done - s.preparing;
                const pct = (s.total / maxBoxes) * 100;
                const stockInfo = products.find((p) => p.name === s.name);
                return (
                  <div key={s.name}>
                    <div className="flex items-center justify-between mb-1.5 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{s.name}</span>
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded ${
                            s.category === "CLASSIC"
                              ? "bg-stone-100 text-stone-600"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {s.category === "CLASSIC" ? "经典" : "特色"}
                        </span>
                        {stockInfo && (
                          <span className="text-xs text-stone-400">
                            库存 {stockInfo.stock} 盒
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 font-medium">
                        {pending > 0 && (
                          <span className="text-amber-700">待备 {pending}</span>
                        )}
                        {s.preparing > 0 && (
                          <span className="text-indigo-700">备餐中 {s.preparing}</span>
                        )}
                        {s.done > 0 && (
                          <span className="text-green-700">备好 {s.done}</span>
                        )}
                        <span className="text-primary-700 border-l pl-3 border-stone-200">
                          共 {s.total} 盒
                        </span>
                      </div>
                    </div>
                    <div className="h-3 bg-stone-100 rounded-full overflow-hidden flex">
                      {s.done > 0 && (
                        <div
                          className="h-full bg-green-500"
                          style={{ width: `${(s.done / maxBoxes) * 100}%` }}
                        />
                      )}
                      {s.preparing > 0 && (
                        <div
                          className="h-full bg-indigo-500"
                          style={{ width: `${(s.preparing / maxBoxes) * 100}%` }}
                        />
                      )}
                      {pending > 0 && (
                        <div
                          className="h-full bg-amber-400"
                          style={{ width: `${(pending / maxBoxes) * 100}%` }}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 订单明细列表 */}
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
            <h3 className="font-bold">待处理订单明细</h3>
            <Link
              href="/admin/orders"
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              查看全部 →
            </Link>
          </div>
          {orders.length === 0 ? (
            <div className="p-12 text-center text-stone-400 text-sm">
              🎉 当前没有待处理订单
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              {orders.map((o) => (
                <Link
                  key={o.id}
                  href={"/orders/" + o.id}
                  className="block px-6 py-4 hover:bg-stone-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            o.status === "PAID"
                              ? "bg-blue-100 text-blue-700"
                              : o.status === "PREPARING"
                                ? "bg-indigo-100 text-indigo-700"
                                : o.status === "READY" || o.status === "READY_FOR_PICKUP"
                                  ? "bg-teal-100 text-teal-700"
                                  : "bg-cyan-100 text-cyan-700"
                          }`}
                        >
                          {o.status === "PAID"
                            ? "已支付"
                            : o.status === "PREPARING"
                              ? "备餐中"
                              : o.status === "READY" || o.status === "READY_FOR_PICKUP"
                                ? "备好"
                                : "配送中"}
                        </span>
                        <span
                          className={`text-xs ${
                            o.deliveryType === "PICKUP"
                              ? "text-indigo-700"
                              : o.deliveryType === "DELIVERY"
                                ? "text-blue-700"
                                : "text-purple-700"
                          }`}
                        >
                          {o.deliveryType === "PICKUP"
                            ? `自取${o.pickupSlot ? " · " + o.pickupSlot : ""}`
                            : o.deliveryType === "DELIVERY"
                              ? "快递"
                              : "闪送"}
                        </span>
                        <span className="text-xs font-mono text-stone-400 ml-1">
                          {o.orderNo.slice(-8)}
                        </span>
                      </div>
                      <div className="text-xs text-stone-500 mb-2">
                        {o.user.name} {o.user.phone}
                        {o.receiverName && o.receiverName !== o.user.name && ` · 收件人：${o.receiverName} ${o.receiverPhone}`}
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                        {o.items.map((it, i) => (
                          <span key={i} className="text-stone-600">
                            · {it.productName} × {it.quantity}
                          </span>
                        ))}
                        <span className="text-primary-600 font-medium">共 {o.totalBoxes} 盒</span>
                      </div>
                    </div>
                    <div className="text-right text-xs text-stone-400 shrink-0">
                      <div className="flex items-center gap-1 justify-end">
                        <Clock className="w-3 h-3" />
                        {o.createdAt.toLocaleString("zh-CN", {
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </AdminShell>
  );
}

function StatCard({
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
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-stone-500">{label}</span>
        <div className="w-9 h-9 rounded-lg bg-stone-50 flex items-center justify-center">
          {icon}
        </div>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-3xl font-bold">{value}</span>
        <span className="text-stone-400 text-sm">{suffix}</span>
      </div>
    </div>
  );
}
