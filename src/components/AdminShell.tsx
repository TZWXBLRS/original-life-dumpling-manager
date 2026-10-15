"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  ShoppingBasket,
  Package,
  Users,
  Settings,
  ChefHat,
  LogOut,
  Menu,
  X,
  BarChart3,
} from "lucide-react";

/**
 * 后台通用外壳：桌面端固定侧边栏，移动端收起为抽屉 + 顶栏。
 * 用法：各后台页面把自己的 <main> 作为 children 传进来即可。
 */

const MAIN_NAV = [
  { icon: LayoutDashboard, label: "仪表盘", href: "/admin/dashboard" },
  { icon: ShoppingBasket, label: "订单管理", href: "/admin/orders" },
  { icon: BarChart3, label: "销售汇总", href: "/admin/sales" },
  { icon: Package, label: "库存管理", href: "/admin/inventory" },
  { icon: ChefHat, label: "生产看板", href: "/admin/production" },
];

const ADMIN_NAV = [
  { icon: Users, label: "用户管理", href: "/admin/users" },
  { icon: Settings, label: "系统配置", href: "/admin/settings" },
];

export function AdminShell({
  children,
  role,
}: {
  children: React.ReactNode;
  role?: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname() || "";
  const router = useRouter();

  // 客户端二次校验：非门店账号（顾客）不应停留在后台，统一弹回后台登录页。
  // 服务端页面（仪表盘/订单/销售/生产）已有 auth() 校验，这里是给纯客户端
  // 页面（库存/用户/配置）兜底，保证所有后台页面权限行为一致。
  useEffect(() => {
    let active = true;
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => {
        if (!active) return;
        const role = d?.user?.role;
        if (role !== "ADMIN" && role !== "KITCHEN") router.replace("/admin/login");
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [router]);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <div className="min-h-screen bg-stone-100 md:flex">
      {/* 移动端顶栏 */}
      <div className="sticky top-0 z-30 flex h-14 items-center gap-3 bg-stone-900 px-4 text-white md:hidden">
        <button
          type="button"
          aria-label="打开菜单"
          className="-ml-1.5 rounded-lg p-1.5 hover:bg-stone-800"
          onClick={() => setOpen(true)}
        >
          <Menu className="w-5 h-5" />
        </button>
        <span className="text-lg">🥟</span>
        <span className="font-bold">管理后台</span>
      </div>

      {/* 抽屉遮罩 */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* 侧边栏：桌面固定常显，移动端抽屉 */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-60 flex-col bg-stone-900 text-stone-200 transition-transform duration-200 md:static md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-stone-800 p-5">
          <Link
            href="/admin/dashboard"
            className="flex items-center gap-2"
            onClick={() => setOpen(false)}
          >
            <span className="text-2xl">🥟</span>
            <div>
              <div className="font-bold text-white">管理后台</div>
              <div className="text-xs text-stone-400">素生活</div>
            </div>
          </Link>
          <button
            type="button"
            aria-label="关闭菜单"
            className="rounded-lg p-1.5 hover:bg-stone-800 md:hidden"
            onClick={() => setOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3 text-sm">
          {MAIN_NAV.map((n) => (
            <NavItem
              key={n.href}
              icon={n.icon}
              label={n.label}
              href={n.href}
              active={isActive(n.href)}
              onClick={() => setOpen(false)}
            />
          ))}
          <div className="mt-3 border-t border-stone-800 px-3 pb-1 pt-3 text-xs text-stone-500">
            管理员权限
          </div>
          {ADMIN_NAV.map((n) => (
            <NavItem
              key={n.href}
              icon={n.icon}
              label={n.label}
              href={n.href}
              active={isActive(n.href)}
              onClick={() => setOpen(false)}
            />
          ))}
        </nav>

        <div className="space-y-1 border-t border-stone-800 p-3">
          <div className="px-3 py-2 text-xs text-stone-400">
            当前登录：{role === "KITCHEN" ? "后厨" : "管理员"}
          </div>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/admin/login" })}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-stone-300 hover:bg-stone-800"
          >
            <LogOut className="w-4 h-4" /> 退出登录
          </button>
          <Link
            href="/"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-stone-300 hover:bg-stone-800"
          >
            ← 返回顾客端
          </Link>
        </div>
      </aside>

      {/* 页面主内容（各页面传入的 <main>） */}
      {children}
    </div>
  );
}

function NavItem({
  icon: Icon,
  label,
  href,
  active,
  onClick,
}: {
  icon: any;
  label: string;
  href: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
        active
          ? "bg-primary-600 text-white shadow"
          : "text-stone-300 hover:bg-stone-800"
      }`}
    >
      <Icon className="w-4 h-4" /> {label}
    </Link>
  );
}
