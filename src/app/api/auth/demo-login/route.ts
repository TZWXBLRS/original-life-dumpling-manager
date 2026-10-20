import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as bcrypt from "bcryptjs";
import { z } from "zod";
import { isSmsConfigured } from "@/lib/sms";
import { verifyCode, clearCode } from "@/lib/login-code";

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
 * 顾客一键登录 API（顾客端唯一的登录入口）
 * POST /api/auth/demo-login
 * body: { phone, code?, wechatName, address? }
 *
 * 流程：
 *  1. 校验手机号格式；拒绝门店账号（管理员/后厨）从顾客入口登录
 *  2. 若已配置短信服务商 → 必须携带正确且未过期的验证码
 *  3. wechatName 为必填（顾客微信名/昵称）
 *  4. upsert 一个 CUSTOMER 用户，并写入微信名与收货地址资料
 *  5. 返回 phone + password，前端用 NextAuth `signIn("credentials")` 完成登录
 *
 * 真实接入微信小程序后此接口可移除，改为：
 *   小程序 wx.login() → 后端 code2session 换 openid → 自动建账
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const schema = z.object({
      phone: z.string().regex(/^1\d{10}$/, "请输入正确的11位手机号"),
      code: z.string().optional(),
      wechatName: z.string().trim().min(1, "请输入微信名/昵称").max(20),
      address: z
        .object({
          province: z.string().max(20).optional(),
          city: z.string().max(20).optional(),
          district: z.string().max(20).optional(),
          detail: z.string().max(200).optional(),
        })
        .optional(),
    });
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }
    const { phone, code, wechatName, address } = parsed.data;

    // 拒绝门店账号通过顾客入口登录（避免误改门店账号密码）
    const existing = await prisma.user.findUnique({
      where: { phone },
      select: { id: true, role: true, name: true },
    });
    if (existing && existing.role !== "CUSTOMER") {
      return NextResponse.json(
        { error: "该手机号为门店账号，请使用后台登录" },
        { status: 400 }
      );
    }

    // 配置了短信服务商 → 必须验证码
    if (isSmsConfigured()) {
      if (!code) {
        return NextResponse.json({ error: "请输入验证码" }, { status: 400 });
      }
      const okCode = await verifyCode(phone, code);
      if (!okCode) {
        return NextResponse.json(
          { error: "验证码错误或已过期" },
          { status: 400 }
        );
      }
    }

    const demoHash = await getDemoHash();
    const name = wechatName;

    // 只写入用户实际填了的内容（wechatName 必填，地址可选）
    const profileData = {
      wechatName,
      ...(address?.province ? { addrProvince: address.province } : {}),
      ...(address?.city ? { addrCity: address.city } : {}),
      ...(address?.district ? { addrDistrict: address.district } : {}),
      ...(address?.detail ? { addrDetail: address.detail } : {}),
    };

    const user = await prisma.user.upsert({
      where: { phone },
      update: {
        passwordHash: demoHash,
        isActive: true,
        // 不修改 role，避免覆盖已有顾客资料
        ...profileData,
      },
      create: {
        name,
        phone,
        passwordHash: demoHash,
        role: "CUSTOMER",
        isActive: true,
        ...profileData,
      },
      select: { id: true, name: true, phone: true, role: true },
    });

    // 验证码用掉即作废
    if (isSmsConfigured()) await clearCode(phone);

    return NextResponse.json({
      ok: true,
      // 演示模式：返回固定密码，前端调 signIn("credentials") 完成登录
      phone: user.phone,
      password: DEMO_PASSWORD,
      user: { id: user.id, name: user.name, role: user.role },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "登录失败" },
      { status: 500 }
    );
  }
}
