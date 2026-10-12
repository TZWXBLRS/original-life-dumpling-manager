"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingBasket,
  Package,
  Users,
  Settings,
  ChefHat,
  LogOut,
} from "lucide-react";
import type { UserRole } from "@/lib/auth";
import { signOut } from "next-auth/react";

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "仪表盘", href: "/admin/dashboard" },
  { icon: ShoppingBasket, label: "订单管理", href: "/admin/orders" },
  { icon: Package, label: "库存管理", href: "/admin/inventory" },
  { icon: ChefHat, label: "生产看板", href: "/admin/production" },
] as const;

const ADMIN_ITEMS = [
  { icon: Users, label: "用户管理", href: "/admin/users" },
  { icon: Settings, label: "系统配置", href: "/admin/settings" },
] as const;

/**
 * 后台侧边栏（客户端组件，用 usePathname 高亮当前页）
 */
export function AdminSidebar({ role }: { role: UserRole }) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
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
        {NAV_ITEMS.map((it) => (
          <NavItem key={it.href} {...it} active={isActive(it.href)} />
        ))}
        {role === "ADMIN" && (
          <>
            <div className="pt-3 mt-3 border-t border-stone-800 text-xs text-stone-500 px-3 pb-1">
              管理员权限
            </div>
            {ADMIN_ITEMS.map((it) => (
              <NavItem key={it.href} {...it} active={isActive(it.href)} />
            ))}
          </>
        )}
      </nav>

      <div className="p-3 border-t border-stone-800 space-y-1 text-xs">
        <div className="px-3 py-2 text-stone-400">
          当前登录：{role === "ADMIN" ? "管理员" : "后厨"}
        </div>
        <button
          onClick={() => signOut()}
          className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-stone-800 flex items-center gap-2 text-stone-300"
        >
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
