import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * 全局中间件：保护后台路由
 * - /admin/* 未登录跳 /auth/login，role 非 ADMIN/KITCHEN 跳首页
 * - /api/admin/* 未登录返回 401，role 不符返回 403
 *
 * 说明：用 getToken 直接读 JWT，不触达数据库，可在 Edge Runtime 运行。
 * 页面级细粒度鉴权仍由 admin/layout.tsx 的 auth() 兜底（防 token 伪造）。
 */
export async function middleware(req: NextRequest) {
  // Auth.js v5 的 session cookie 名随协议变化，salt 必须与 cookie 名一致
  const secure = req.nextUrl.protocol === "https:";
  const salt = secure
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET!,
    salt,
  });

  const { pathname } = req.nextUrl;
  const isAdminPage = pathname.startsWith("/admin");
  const isAdminApi = pathname.startsWith("/api/admin");

  // 未登录
  if (!token) {
    if (isAdminApi) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    const loginUrl = new URL("/auth/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 角色不符
  const role = token.role as string | undefined;
  if (role !== "ADMIN" && role !== "KITCHEN") {
    if (isAdminApi) {
      return NextResponse.json({ error: "权限不足" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
