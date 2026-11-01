import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/AdminShell";
import { formatYuan } from "@/lib/pricing";
import { formatBeijingDate, beijingDayStart, beijingDayEnd } from "@/lib/time";
import {
  ShoppingBasket,
  Package,
  ChefHat,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";

/** 库存预警阈值：与「库存管理」页保持一致（低于 10 盒视为预警） */
const LOW_STOCK_THRESHOLD = 10;

/**
 * 后台管理 - 仪表盘
 * 角色：后厨 / 管理员
 *
 * 所有统计值均从数据库实时拉取，「今日」按北京时间自然日计算，
 * 日限进度读取 SystemConfig.DAILY_LIMIT（不再写死）。
 */
export default async function AdminDashboardPage() {
  // 权限校验：仅门店账号（管理员 / 后厨）可进后台，与订单、销售、生产页保持一致
  const session = await auth();
  if (!session?.user?.id) redirect("/admin/login");
  if (session.user.role !== "ADMIN" && session.user.role !== "KITCHEN") {
    redirect("/");
  }

  // 今日（北京时间）左闭右开区间
  const todayStart = beijingDayStart();
  const tomorrowStart = beijingDayEnd();

  const [agg, dailyLimitCfg, lowStockItems, todayOrderList] = await Promise.all([
    // 今日订单数 / 销量 / 销售额（取消单不计入）
    prisma.order.aggregate({
      where: {
        createdAt: { gte: todayStart, lt: tomorrowStart },
        status: { not: "CANCELLED" },
      },
      _count: { id: true },
      _sum: { totalBoxes: true, totalAmount: true },
    }),
    prisma.systemConfig.findUnique({ where: { key: "DAILY_LIMIT" } }),
    prisma.product.findMany({
      where: { isActive: true, stock: { lt: LOW_STOCK_THRESHOLD } },
      orderBy: { stock: "asc" },
      select: { name: true, stock: true },
    }),
    // 今日预订明细（用于口味汇总）
    prisma.order.findMany({
      where: {
        createdAt: { gte: todayStart, lt: tomorrowStart },
        status: { not: "CANCELLED" },
      },
      select: { items: { select: { productName: true, quantity: true } } },
    }),
  ]);

  const todayOrders = agg._count.id;
  const todayBoxes = agg._sum.totalBoxes ?? 0;
  const todaySales = agg._sum.totalAmount ?? 0;
  const dailyLimit = Number(dailyLimitCfg?.value ?? "700") || 700;

  // 今日预订汇总（按口味）
  const flavorMap = new Map<string, number>();
  for (const o of todayOrderList) {
    for (const it of o.items) {
      flavorMap.set(it.productName, (flavorMap.get(it.productName) ?? 0) + it.quantity);
    }
  }
  const flavors = [...flavorMap.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
  const maxFlavorCount = Math.max(1, ...flavors.map((f) => f.count));

  return (
    <AdminShell role={session.user.role}>
      {/* 主内容区 */}
      <main className="p-4 md:p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">仪表盘</h1>
          <p className="text-stone-500 text-sm mt-1">
            今日营业概览 · {formatBeijingDate(new Date())}
          </p>
        </div>

        {/* 数据卡片 */}
        <div className="grid md:grid-cols-4 gap-5 mb-8">
          <StatCard
            label="今日订单"
            value={todayOrders.toString()}
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
          />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* 库存预警 */}
          <div className="card p-6">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" /> 库存预警
            </h3>
            {lowStockItems.length === 0 ? (
              <div className="text-sm text-stone-400 py-8 text-center">
                ✅ 库存充足，暂无预警
              </div>
            ) : (
              <ul className="divide-y divide-stone-100">
                {lowStockItems.map((it) => (
                  <li
                    key={it.name}
                    className="py-3 flex items-center justify-between"
                  >
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
                    count={f.count}
                    max={maxFlavorCount}
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

function ProductionRow({
  name,
  count,
  max,
  muted,
}: {
  name: string;
  count: number;
  max: number;
  muted?: boolean;
}) {
  const pct = Math.min(100, (count / Math.max(1, max)) * 100);
  return (
    <div className={muted ? "opacity-50" : ""}>
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
