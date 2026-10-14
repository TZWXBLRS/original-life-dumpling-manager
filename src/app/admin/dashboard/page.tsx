import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { formatYuan } from "@/lib/pricing";
import { beijingDayRange, formatDate } from "@/lib/date";
import { AdminShell } from "@/components/AdminShell";
import {
  ShoppingBasket,
  Package,
  ChefHat,
  TrendingUp,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";

const PENDING_STATUSES = ["PAID", "PREPARING", "READY", "READY_FOR_PICKUP", "SHIPPED"];
const LOW_STOCK_THRESHOLD = 10;

/**
 * 后台 - 仪表盘
 * 全部指标来自数据库实时统计（北京时间自然日），不再使用占位数据。
 * 角色：后厨 / 管理员
 */
export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login");
  if (session.user.role !== "ADMIN" && session.user.role !== "KITCHEN") {
    redirect("/");
  }

  // 北京时间「今日」区间 [start, end)
  const { start: dayStart, end: dayEnd } = beijingDayRange();

  const [todayOrders, lowStockProducts, limitCfg, pendingCount] = await Promise.all([
    // 今日订单（含明细），取消订单不计入
    prisma.order.findMany({
      where: {
        createdAt: { gte: dayStart, lt: dayEnd },
        status: { not: "CANCELLED" },
      },
      select: {
        totalBoxes: true,
        totalAmount: true,
        items: { select: { productName: true, category: true, quantity: true } },
      },
    }),
    // 库存预警：库存低于阈值的在售商品
    prisma.product.findMany({
      where: { isActive: true, stock: { lte: LOW_STOCK_THRESHOLD } },
      orderBy: { stock: "asc" },
      select: { id: true, name: true, stock: true },
      take: 8,
    }),
    prisma.systemConfig.findUnique({ where: { key: "DAILY_LIMIT" } }),
    prisma.order.count({
      where: { status: { in: PENDING_STATUSES } },
    }),
  ]);

  // ===== 今日汇总 =====
  const todayOrderCount = todayOrders.length;
  let todaySales = 0;
  let todayBoxes = 0;
  const flavorMap = new Map<string, { name: string; category: string; qty: number }>();
  for (const o of todayOrders) {
    todaySales += o.totalAmount;
    todayBoxes += o.totalBoxes;
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
  const flavors = [...flavorMap.values()].sort((a, b) => b.qty - a.qty);
  const maxFlavorQty = Math.max(1, ...flavors.map((f) => f.qty));

  const dailyLimit = Number(limitCfg?.value ?? "100");
  const limitPct = dailyLimit > 0 ? Math.min(100, (todayBoxes / dailyLimit) * 100) : 0;

  return (
    <AdminShell role={session.user.role}>
      <main className="p-4 md:p-8">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">仪表盘</h1>
            <p className="text-stone-500 text-sm mt-1">
              今日营业概览 · {formatDate(new Date())}
            </p>
          </div>
          <Link
            href="/admin/production"
            className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
          >
            生产看板（待处理 {pendingCount} 单）
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* 数据卡片 */}
        <div className="grid md:grid-cols-4 gap-5 mb-8">
          <StatCard
            label="今日订单"
            value={todayOrderCount.toString()}
            suffix="单"
            icon={<ShoppingBasket className="w-5 h-5 text-blue-600" />}
          />
          <StatCard
            label="今日销量"
            value={todayBoxes.toString()}
            suffix="盒"
            icon={<Package className="w-5 h-5 text-green-600" />}
          />
          <StatCard
            label="今日销售额"
            value={`¥${formatYuan(todaySales)}`}
            suffix=""
            icon={<TrendingUp className="w-5 h-5 text-primary-600" />}
          />
          <StatCard
            label="日限进度"
            value={`${todayBoxes}/${dailyLimit}`}
            suffix="盒"
            icon={<AlertTriangle className="w-5 h-5 text-amber-600" />}
          >
            <div className="mt-2 h-1.5 bg-stone-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  limitPct >= 100 ? "bg-accent-500" : "bg-primary-400"
                }`}
                style={{ width: `${limitPct}%` }}
              />
            </div>
          </StatCard>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* 库存预警 */}
          <div className="card p-6">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" /> 库存预警
            </h3>
            {lowStockProducts.length === 0 ? (
              <div className="text-sm text-stone-400 py-8 text-center">
                ✅ 库存充足，暂无预警
              </div>
            ) : (
              <ul className="divide-y divide-stone-100">
                {lowStockProducts.map((it) => (
                  <li key={it.id} className="py-3 flex items-center justify-between">
                    <span>{it.name}</span>
                    <span className="text-accent-600 font-medium">
                      仅剩 {it.stock} 盒
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* 今日生产汇总（给后厨看） */}
          <div className="card p-6">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <ChefHat className="w-4 h-4 text-primary-600" /> 今日预订汇总
            </h3>
            {flavors.length === 0 ? (
              <div className="text-sm text-stone-400 py-8 text-center">
                今日暂无预订
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                {flavors.map((f) => (
                  <ProductionRow
                    key={f.name}
                    name={f.name}
                    count={f.qty}
                    max={maxFlavorQty}
                  />
                ))}
              </div>
            )}
            <div className="mt-4 pt-4 border-t border-stone-100 flex justify-between text-sm font-medium">
              <span>今日合计需备：</span>
              <span className="text-primary-600">{todayBoxes} 盒</span>
            </div>
          </div>
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
  children,
}: {
  label: string;
  value: string;
  suffix: string;
  icon: React.ReactNode;
  children?: React.ReactNode;
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
      {children}
    </div>
  );
}

function ProductionRow({
  name,
  count,
  max,
}: {
  name: string;
  count: number;
  max: number;
}) {
  const pct = Math.min(100, (count / max) * 100);
  return (
    <div className={count === 0 ? "opacity-50" : ""}>
      <div className="flex justify-between mb-1">
        <span>{name}</span>
        <span className="font-medium">{count} 盒</span>
      </div>
      <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-primary-400 rounded-full"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
