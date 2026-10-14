import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * 后台访问守卫（服务端）
 * - 拦截 /admin/*：未登录或角色不是 ADMIN / KITCHEN 时，重定向到登录页
 * - 仅校验 NextAuth 的 JWT，不引入 Prisma，保证 edge / workerd 运行时可用
 * - /api/admin/* 不在 matcher 内，仍由各接口自身的 auth() 做权限校验
 */
async function readSessionToken(req: NextRequest, secret: string) {
  // 生产（https）用 __Secure- 前缀 cookie，本地（http）用无前缀 cookie；
  // 两种都试一遍，避免协议判断失误导致已登录用户被误拦。
  // salt 必须与 cookie 名一致（否则无法解密 JWT）。
  const secureToken = await getToken({
    req,
    secret,
    secureCookie: true,
    salt: "__Secure-authjs.session-token",
  });
  if (secureToken) return secureToken;
  return getToken({
    req,
    secret,
    secureCookie: false,
    salt: "authjs.session-token",
  });
}

export async function middleware(req: NextRequest) {
  const secret = process.env.NEXTAUTH_SECRET;
  const token = secret ? await readSessionToken(req, secret) : null;

  const role = token?.role as string | undefined;
  const allowed = role === "ADMIN" || role === "KITCHEN";

  if (!token || !allowed) {
    const loginUrl = new URL("/auth/login", req.url);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
