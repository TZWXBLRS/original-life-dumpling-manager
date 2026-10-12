import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import * as bcrypt from "bcryptjs";
import { z } from "zod";

/**
 * 修改密码 API
 * POST /api/auth/change-password
 * body: { oldPassword, newPassword }
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const body = await req.json();
  const schema = z.object({
    oldPassword: z.string().min(1, "请输入原密码"),
    newPassword: z
      .string()
      .min(6, "新密码至少6位")
      .max(32, "新密码不能超过32位"),
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const { oldPassword, newPassword } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });
  if (!user?.passwordHash) {
    return NextResponse.json({ error: "账号不支持密码登录" }, { status: 400 });
  }

  const ok = await bcrypt.compare(oldPassword, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "原密码不正确" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  return NextResponse.json({ ok: true });
}
