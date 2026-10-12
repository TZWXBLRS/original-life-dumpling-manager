import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";

const CONFIG_KEYS = [
  "STORE_NAME",
  "STORE_PHONE",
  "PICKUP_ADDRESS",
  "BUSINESS_HOURS",
  "DAILY_LIMIT",
  "FOAM_BOX_PRICE",
  "FOAM_BOX_CAPACITY",
] as const;

/**
 * GET /api/admin/configs
 * 管理员获取系统配置列表
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  const configs = await prisma.systemConfig.findMany({
    where: { key: { in: CONFIG_KEYS as unknown as string[] } },
    orderBy: { key: "asc" },
  });

  return NextResponse.json({ configs });
}

/**
 * PATCH /api/admin/configs
 * 批量或单个更新系统配置
 * body: { updates: [{ key, value }] }
 */
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const schema = z.object({
      updates: z.array(
        z.object({
          key: z.enum(CONFIG_KEYS),
          value: z.string().max(2000),
        })
      ),
    });
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    // 额外校验：DAILY_LIMIT 为正整数，FOAM_BOX_PRICE/CAPACITY 为正整数
    for (const u of parsed.data.updates) {
      if (u.key === "DAILY_LIMIT" || u.key === "FOAM_BOX_PRICE" || u.key === "FOAM_BOX_CAPACITY") {
        const n = Number(u.value);
        if (!Number.isInteger(n) || n < 0) {
          return NextResponse.json(
            { error: `${u.key} 必须是非负整数` },
            { status: 400 }
          );
        }
      }
      if (u.key === "STORE_PHONE" && u.value && !/^1[3-9]\d{9}$/.test(u.value) && !/^\d{3,4}-?\d{7,8}$/.test(u.value)) {
        return NextResponse.json(
          { error: "门店电话格式不正确" },
          { status: 400 }
        );
      }
      if (u.key === "BUSINESS_HOURS") {
        try {
          JSON.parse(u.value);
        } catch {
          return NextResponse.json(
            { error: "营业时间配置必须是合法 JSON" },
            { status: 400 }
          );
        }
      }
    }

    const txs = parsed.data.updates.map((u) =>
      prisma.systemConfig.upsert({
        where: { key: u.key },
        create: { key: u.key, value: u.value, description: defaultDescription(u.key) },
        update: { value: u.value },
      })
    );
    await prisma.$transaction(txs);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "保存失败" },
      { status: 500 }
    );
  }
}

function defaultDescription(key: string): string {
  const map: Record<string, string> = {
    STORE_NAME: "门店名称",
    STORE_PHONE: "门店联系电话",
    PICKUP_ADDRESS: "自取地址",
    BUSINESS_HOURS: "营业时间与自取时段(JSON)",
    DAILY_LIMIT: "每日销售上限（盒）",
    FOAM_BOX_PRICE: "泡沫箱单价（分）",
    FOAM_BOX_CAPACITY: "每个泡沫箱可装盒数",
  };
  return map[key] || "";
}
