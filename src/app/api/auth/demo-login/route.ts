import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as bcrypt from "bcryptjs";
import { z } from "zod";

// 演示模式固定密码 - 真实接入微信小程序静默登录后此接口可移除
const DEMO_PASSWORD = "demo123456";

// 演示模式 passwordHash（首次调用时计算并缓存）
let cachedDemoHash: string | null = null;
async function getDemoHash() {
  if (cachedDemoHash) return cachedDemoHash;
  cachedDemoHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  return cachedDemoHash;
}

/**
 * 演示模式登录 API
 * POST /api/auth/demo-login
 * body: { phone, name? }
 *
 * 演示阶段绕过注册/登录，输入手机号即可：
 * 1. 校验手机号格式
 * 2. 拒绝门店账号（管理员/后厨）通过此入口登录
 * 3. upsert 一个 CUSTOMER 用户（passwordHash 设为演示固定密码的 hash）
 * 4. 返回 phone + password，前端用 NextAuth `signIn("credentials")` 登录
 *
 * 真实接入微信小程序后此接口可移除，改为：
 *   小程序 wx.login() → 后端 code2session 换 openid → 自动建账
 *   + <button open-type="phoneOneClickLogin"> 一键授权手机号
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const schema = z.object({
      phone: z.string().regex(/^1\d{10}$/, "请输入正确的11位手机号"),
      name: z.string().min(1).max(20).optional(),
    });
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }
    const { phone } = parsed.data;
    const name = parsed.data.name || `顾客${phone.slice(-4)}`;

    // 拒绝门店账号通过演示入口登录（避免误改门店账号密码）
    const existing = await prisma.user.findUnique({
      where: { phone },
      select: { id: true, role: true, name: true },
    });
    if (existing && existing.role !== "CUSTOMER") {
      return NextResponse.json(
        { error: "该手机号为门店账号，请使用登录页登录" },
        { status: 400 }
      );
    }

    const demoHash = await getDemoHash();

    const user = await prisma.user.upsert({
      where: { phone },
      update: {
        passwordHash: demoHash,
        isActive: true,
        // 不修改 role/name，避免覆盖已有顾客的资料
      },
      create: {
        name,
        phone,
        passwordHash: demoHash,
        role: "CUSTOMER",
        isActive: true,
      },
      select: { id: true, name: true, phone: true, role: true },
    });

    return NextResponse.json({
      ok: true,
      // 演示模式：返回固定密码，前端调 signIn("credentials") 完成登录
      phone: user.phone,
      password: DEMO_PASSWORD,
      user: { id: user.id, name: user.name, role: user.role },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "演示登录失败" },
      { status: 500 }
    );
  }
}
