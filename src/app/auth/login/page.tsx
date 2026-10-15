import { redirect } from "next/navigation";

/**
 * 顾客端登录已统一为「手机号一键登录」（全站右上角 UserMenu）。
 * 原 /auth/login 仅服务门店账号，现独立到 /admin/login，此路由做重定向兜底。
 */
export default function AuthLoginPage() {
  redirect("/admin/login");
}
