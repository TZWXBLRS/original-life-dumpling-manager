import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import * as bcrypt from "bcryptjs";

// 合法的用户角色常量（SQLite 不支持 enum，业务代码层校验）
export type UserRole = "CUSTOMER" | "KITCHEN" | "ADMIN";

export const USER_ROLES: Record<UserRole, UserRole> = {
  CUSTOMER: "CUSTOMER",
  KITCHEN: "KITCHEN",
  ADMIN: "ADMIN",
};

declare module "next-auth" {
  interface User {
    role?: UserRole;
    phone?: string;
    openid?: string;
  }
  interface Session {
    user: {
      id: string;
      role: UserRole;
      phone: string;
      name: string;
      openid?: string;
    };
  }
}
declare module "@auth/core/jwt" {
  interface JWT {
    id?: string;
    role?: UserRole;
    phone?: string;
    openid?: string;
  }
}

// ========== 微信登录 Provider（OAuth 2.0 占位）==========
// 真实接入步骤：
// 1. 申请微信开放平台 - 网站应用（需要企业主体、备案域名），获取 AppID / AppSecret
// 2. 域名配置：微信开放平台后台填授权回调域名 = {你的域名}/api/auth/callback/wechat
// 3. 在 .env.local 设置 WECHAT_APP_ID=xxx 和 WECHAT_APP_SECRET=xxx
// 4. 首次微信登录会自动创建一个 CUSTOMER 角色用户（暂不绑定手机号，用户可补填）
function buildWechatProvider() {
  if (!process.env.WECHAT_APP_ID || !process.env.WECHAT_APP_SECRET) {
    return []; // 没配置就不启用，不影响手机号登录
  }
  // 微信开放平台 OAuth2 接入需要企业资质，下面的逻辑是配置好后的处理流程
  // 由于微信登录需要真实域名回调 + 备案，暂不实现具体接口，留好结构
  // 未来可通过 import WeChat from "next-auth/providers/wechat" 直接接入
  return [];
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "手机号密码登录",
      credentials: {
        phone: { label: "手机号", type: "tel" },
        password: { label: "密码", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.phone || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { phone: String(credentials.phone) },
        });

        if (!user || !user.isActive) return null;

        const ok = await bcrypt.compare(
          String(credentials.password),
          user.passwordHash
        );
        if (!ok) return null;

        const validRoles: UserRole[] = ["CUSTOMER", "KITCHEN", "ADMIN"];
        const role = validRoles.includes(user.role as UserRole)
          ? (user.role as UserRole)
          : "CUSTOMER";

        return {
          id: user.id,
          name: user.name,
          phone: user.phone,
          role,
        };
      },
    }),
    ...buildWechatProvider(),
  ],
  pages: {
    signIn: "/auth/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7天免登录
  },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.phone = user.phone;
        // 未接入微信登录前 openid 置空，避免 undefined 被误传
        token.openid = (user as any).openid || "";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
        session.user.phone = token.phone as string;
        const oid = token.openid as string | undefined;
        (session.user as any).openid = oid || undefined;
      }
      return session;
    },
  },
});
