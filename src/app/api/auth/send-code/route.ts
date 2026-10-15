import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { isSmsConfigured, sendSmsCode } from "@/lib/sms";
import { saveCode, genCode, codeCooldownRemaining } from "@/lib/login-code";

/** 查询是否已启用短信验证码（前端据此决定是否显示验证码输入框） */
export async function GET() {
  return NextResponse.json({ smsEnabled: isSmsConfigured() });
}

/**
 * 发送顾客登录验证码
 * POST /api/auth/send-code
 * body: { phone }
 *
 * 未配置短信服务商时返回 { smsEnabled: false }，前端据此跳过验证码步骤，
 * 直接走「手机号一键登录」，保证线上不被阻塞。
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const schema = z.object({
      phone: z.string().regex(/^1\d{10}$/, "请输入正确的11位手机号"),
    });
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }
    const { phone } = parsed.data;

    // 未配置服务商：不启用验证码
    if (!isSmsConfigured()) {
      return NextResponse.json({ ok: true, smsEnabled: false });
    }

    // 门店账号请走后台登录，不发验证码
    const existing = await prisma.user.findUnique({
      where: { phone },
      select: { role: true },
    });
    if (existing && existing.role !== "CUSTOMER") {
      return NextResponse.json(
        { error: "该手机号为门店账号，请使用后台登录" },
        { status: 400 }
      );
    }

    const wait = await codeCooldownRemaining(phone);
    if (wait > 0) {
      return NextResponse.json(
        { error: `请 ${wait} 秒后再获取验证码` },
        { status: 429 }
      );
    }

    const code = genCode();
    await saveCode(phone, code);
    const { dev } = await sendSmsCode(phone, code);

    return NextResponse.json({ ok: true, smsEnabled: true, dev });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "验证码发送失败" },
      { status: 500 }
    );
  }
}
