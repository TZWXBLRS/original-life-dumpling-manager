import { NextResponse } from "next/server";
import * as bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

// 临时调试路由：重置管理员和后厨密码
// 使用后请删除此路由
export async function GET() {
  const result: any = {};
  try {
    const adminHash = await bcrypt.hash("sushenghuo107", 10);
    const kitchenHash = await bcrypt.hash("sushenghuo105", 10);

    const admin = await prisma.user.update({
      where: { phone: "15313659956" },
      data: { passwordHash: adminHash, isActive: true },
      select: { id: true, name: true, phone: true, role: true },
    });

    const kitchen = await prisma.user.update({
      where: { phone: "18301576627" },
      data: { passwordHash: kitchenHash, isActive: true },
      select: { id: true, name: true, phone: true, role: true },
    });

    result.admin = admin;
    result.kitchen = kitchen;
    result.ok = true;
  } catch (e: any) {
    result.ok = false;
    result.error = e?.message || String(e);
  }
  return NextResponse.json(result);
}
