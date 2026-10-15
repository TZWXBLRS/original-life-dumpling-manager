import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";

/**
 * 顾客收货资料读写
 * GET  /api/auth/profile → 返回当前登录顾客的微信名与地址（用于下单时预填）
 * PUT  /api/auth/profile → 保存微信名与地址（下单时顺带记住，下次自动带出）
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      wechatName: true,
      addrProvince: true,
      addrCity: true,
      addrDistrict: true,
      addrDetail: true,
    },
  });
  return NextResponse.json({
    profile: {
      wechatName: user?.wechatName || "",
      province: user?.addrProvince || "",
      city: user?.addrCity || "",
      district: user?.addrDistrict || "",
      detail: user?.addrDetail || "",
    },
  });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const schema = z.object({
      wechatName: z.string().max(20).optional(),
      province: z.string().max(20).optional(),
      city: z.string().max(20).optional(),
      district: z.string().max(20).optional(),
      detail: z.string().max(200).optional(),
    });
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "参数错误" }, { status: 400 });
    }
    const { wechatName, province, city, district, detail } = parsed.data;

    const data: Record<string, string> = {};
    if (wechatName !== undefined) data.wechatName = wechatName;
    if (province !== undefined) data.addrProvince = province;
    if (city !== undefined) data.addrCity = city;
    if (district !== undefined) data.addrDistrict = district;
    if (detail !== undefined) data.addrDetail = detail;
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ ok: true });
    }

    await prisma.user.update({ where: { id: session.user.id }, data });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "保存失败" },
      { status: 500 }
    );
  }
}
