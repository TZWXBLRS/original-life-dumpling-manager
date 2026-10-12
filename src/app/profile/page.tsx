import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  MapPin,
  Package,
  KeyRound,
  User,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { logout } from "./actions";

/**
 * 用户中心
 * 展示账号信息 + 快捷入口（订单、收货地址、修改密码）
 */
export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login?from=/profile");

  const [addressCount, orderCount] = await Promise.all([
    prisma.address.count({ where: { userId: session.user.id } }),
    prisma.order.count({ where: { userId: session.user.id } }),
  ]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="card p-6 mb-6 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center">
          <User className="w-7 h-7 text-primary-600" />
        </div>
        <div className="flex-1">
          <div className="font-bold text-lg">{session.user.name}</div>
          <div className="text-sm text-stone-500">{session.user.phone}</div>
        </div>
        <span className="text-xs px-2 py-1 rounded-full bg-stone-100 text-stone-600">
          {session.user.role === "ADMIN"
            ? "管理员"
            : session.user.role === "KITCHEN"
            ? "后厨"
            : "顾客"}
        </span>
      </div>

      <div className="space-y-3">
        <ProfileLink
          icon={<Package className="w-5 h-5 text-blue-600" />}
          title="我的订单"
          subtitle={`共 ${orderCount} 单`}
          href="/orders"
        />
        <ProfileLink
          icon={<MapPin className="w-5 h-5 text-green-600" />}
          title="收货地址"
          subtitle={`${addressCount} 个地址`}
          href="/profile/addresses"
        />
        <ProfileLink
          icon={<KeyRound className="w-5 h-5 text-amber-600" />}
          title="修改密码"
          subtitle="定期更换更安全"
          href="/profile/password"
        />
      </div>

      <form action={logout}>
        <button
          type="submit"
          className="mt-6 w-full card p-4 flex items-center justify-center gap-2 text-stone-600 hover:text-accent-600 transition-colors"
        >
          <LogOut className="w-5 h-5" /> 退出登录
        </button>
      </form>

      <Link
        href="/"
        className="block text-center text-sm text-stone-400 hover:text-primary-600 mt-4"
      >
        ← 返回首页
      </Link>
    </div>
  );
}

function ProfileLink({
  icon,
  title,
  subtitle,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="card p-4 flex items-center gap-4 hover:shadow-md transition-shadow"
    >
      <div className="w-10 h-10 rounded-lg bg-stone-50 flex items-center justify-center">
        {icon}
      </div>
      <div className="flex-1">
        <div className="font-medium">{title}</div>
        <div className="text-xs text-stone-400">{subtitle}</div>
      </div>
      <ChevronRight className="w-5 h-5 text-stone-300" />
    </Link>
  );
}
