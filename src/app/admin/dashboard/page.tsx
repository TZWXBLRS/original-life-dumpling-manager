import Link from "next/link";
import {
  LayoutDashboard,
  ShoppingBasket,
  Package,
  Users,
  Settings,
  ChefHat,
  LogOut,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";

/**
 * 后台管理布局（仪表盘、订单、库存、用户、配置）
 * 角色：后厨 / 管理员
 */
export default async function AdminDashboardPage() {
  // TODO: 接入真实数据 & 权限校验（auth() 判断 role === ADMIN 或 KITCHEN）
  const todayOrders = 23;
  const todaySales = 12850; // 分
  const todayBoxes = 47;

  const lowStockItems = [
    { name: "黑松露饺子", stock: 5 },
    { name: "菌菇饺子", stock: 8 },
  ];

  return (
    <div className="min-h-screen flex bg-stone-100">
      {/* 侧边栏 */}
      <aside className="w-60 bg-stone-900 text-stone-200 flex flex-col">
        <div className="p-5 border-b border-stone-800">
          <Link href="/admin/dashboard" className="flex items-center gap-2">
            <span className="text-2xl">🥟</span>
            <div>
              <div className="font-bold text-white">管理后台</div>
              <div className="text-xs text-stone-400">原味生活</div>
            </div>
          </Link>
        </div>
        <nav className="flex-1 p-3 space-y-1 text-sm">
          <NavItem icon={LayoutDashboard} label="仪表盘" href="/admin/dashboard" active />
          <NavItem icon={ShoppingBasket} label="订单管理" href="/admin/orders" />
          <NavItem icon={Package} label="库存管理" href="/admin/inventory" />
          <NavItem
            icon={ChefHat}
            label="生产看板"
            href="/admin/production"
          />
          {/* 仅管理员可见 */}
          <div className="pt-3 mt-3 border-t border-stone-800 text-xs text-stone-500 px-3 pb-1">
            管理员权限
          </div>
          <NavItem icon={Users} label="用户管理" href="/admin/users" />
          <NavItem icon={Settings} label="系统配置" href="/admin/settings" />
        </nav>
        <div className="p-3 border-t border-stone-800 space-y-1">
          <div className="px-3 py-2 text-xs text-stone-400">
            当前登录：管理员
          </div>
          <button className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-stone-800 flex items-center gap-2 text-stone-300">
            <LogOut className="w-4 h-4" /> 退出登录
          </button>
          <Link
            href="/"
            className="block px-3 py-2 rounded-lg text-sm hover:bg-stone-800 flex items-center gap-2 text-stone-300"
          >
            ← 返回顾客端
          </Link>
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 p-8 overflow-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">仪表盘</h1>
          <p className="text-stone-500 text-sm mt-1">
            今日营业概览 · {new Date().toLocaleDateString("zh-CN")}
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
            value={`¥${(todaySales / 100).toFixed(0)}`}
            suffix=""
            icon={<TrendingUp className="w-5 h-5 text-primary-600" />}
          />
          <StatCard
            label="日限进度"
            value={`${todayBoxes}/100`}
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
            <div className="space-y-2 text-sm">
              <ProductionRow name="三鲜饺子" count={12} />
              <ProductionRow name="荠菜饺子" count={8} />
              <ProductionRow name="玉米饺子" count={6} />
              <ProductionRow name="黑松露饺子" count={4} />
              <ProductionRow name="菌菇饺子" count={3} />
              <ProductionRow name="茴香饺子" count={3} />
              <ProductionRow name="酸菜饺子" count={0} muted />
              <ProductionRow name="芹菜饺子" count={0} muted />
            </div>
            <div className="mt-4 pt-4 border-t border-stone-100 flex justify-between text-sm font-medium">
              <span>今日合计需备：</span>
              <span className="text-primary-600">{todayBoxes} 盒</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function NavItem({
  icon: Icon,
  label,
  href,
  active,
}: {
  icon: any;
  label: string;
  href: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
        active
          ? "bg-primary-600 text-white shadow"
          : "hover:bg-stone-800 text-stone-300"
      }`}
    >
      <Icon className="w-4 h-4" /> {label}
    </Link>
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
  muted,
}: {
  name: string;
  count: number;
  muted?: boolean;
}) {
  const pct = Math.min(100, (count / 15) * 100);
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
