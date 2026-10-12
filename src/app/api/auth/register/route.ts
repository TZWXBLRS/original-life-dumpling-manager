import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as bcrypt from "bcryptjs";
import { z } from "zod";
import { isValidPhone } from "@/lib/utils";

/**
 * 顾客注册 API
 * POST /api/auth/register
 * body: { phone, password, name }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const schema = z.object({
      phone: z
        .string()
        .refine((v) => isValidPhone(v), "请输入正确的11位手机号"),
      password: z
        .string()
        .min(6, "密码至少6位")
        .max(32, "密码不能超过32位"),
      name: z.string().min(1, "请输入姓名/昵称").max(20),
    });
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }
    const { phone, password, name } = parsed.data;

    // 检查手机号是否已被使用
    const exists = await prisma.user.findUnique({ where: { phone } });
    if (exists) {
      return NextResponse.json(
        { error: "该手机号已注册，请直接登录" },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name,
        phone,
        passwordHash,
        role: "CUSTOMER",
        isActive: true,
      },
    });

    return NextResponse.json({
      ok: true,
      user: { id: user.id, name: user.name, phone: user.phone },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "注册失败，请稍后重试" },
      { status: 500 }
    );
  }
}
