import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { isValidPhone } from "@/lib/utils";

/**
 * 单个收货地址操作
 * PUT    /api/addresses/[id]    更新地址
 * DELETE /api/addresses/[id]    删除地址
 */

const addressSchema = z.object({
  name: z.string().min(1, "请输入收件人姓名").max(50),
  phone: z.string().refine((v) => isValidPhone(v), "请输入正确的手机号"),
  province: z.string().min(1, "请选择省份"),
  city: z.string().min(1, "请选择城市"),
  district: z.string().min(1, "请选择区/县"),
  detail: z.string().min(1, "请输入详细地址").max(200),
  isDefault: z.boolean().optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { id } = await params;
  // 确认地址属于当前用户
  const existing = await prisma.address.findUnique({ where: { id } });
  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json({ error: "地址不存在" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = addressSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const { isDefault, ...data } = parsed.data;

  if (isDefault && !existing.isDefault) {
    await prisma.address.updateMany({
      where: { userId: session.user.id, isDefault: true },
      data: { isDefault: false },
    });
  }

  const address = await prisma.address.update({
    where: { id },
    data: { ...data, isDefault },
  });

  return NextResponse.json({ address });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.address.findUnique({ where: { id } });
  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json({ error: "地址不存在" }, { status: 404 });
  }

  await prisma.address.delete({ where: { id } });

  // 删除的是默认地址时，把最新的一条设为默认
  if (existing.isDefault) {
    const next = await prisma.address.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });
    if (next) {
      await prisma.address.update({
        where: { id: next.id },
        data: { isDefault: true },
      });
    }
  }

  return NextResponse.json({ ok: true });
}
