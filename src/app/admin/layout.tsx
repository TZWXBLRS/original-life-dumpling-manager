import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AdminSidebar } from "./_components/AdminSidebar";

/**
 * 后台管理路由组共享布局
 * - 鉴权：仅 ADMIN / KITCHEN 可访问，其余跳登录或 403
 * - 共享侧边栏：所有 /admin/* 子页面复用，避免每个 page 内联复制
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/login?callbackUrl=/admin/dashboard");
  }
  if (session.user.role !== "ADMIN" && session.user.role !== "KITCHEN") {
    redirect("/");
  }

  return (
    <div className="min-h-screen flex bg-stone-100">
      <AdminSidebar role={session.user.role} />
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  );
}
