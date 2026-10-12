import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { isValidPhone } from "@/lib/utils";

/**
 * 收货地址 CRUD API
 * GET    /api/addresses        列出当前用户的所有地址
 * POST   /api/addresses        新建地址
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

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const list = await prisma.address.findMany({
    where: { userId: session.user.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ list });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
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

  // 设为默认时，先把其他地址的默认标记清掉
  if (isDefault) {
    await prisma.address.updateMany({
      where: { userId: session.user.id, isDefault: true },
      data: { isDefault: false },
    });
  }

  // 若用户还没有任何地址，自动设为默认
  const count = await prisma.address.count({
    where: { userId: session.user.id },
  });

  const address = await prisma.address.create({
    data: {
      ...data,
      userId: session.user.id,
      isDefault: isDefault ?? count === 0,
    },
  });

  return NextResponse.json({ address });
}
