import { NextResponse } from "next/server";
import * as bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

// 临时路由：清空所有业务数据和用户，只保留 admin 15313659956 / 123456
// 使用后立即删除
export async function GET() {
  const result: any = {};
  try {
    // 外键依赖顺序：OrderItem → Order / InventoryLog → User
    const r1 = await prisma.orderItem.deleteMany({});
    result.orderItemsDeleted = r1.count;
    const r2 = await prisma.order.deleteMany({});
    result.ordersDeleted = r2.count;
    const r3 = await prisma.inventoryLog.deleteMany({});
    result.inventoryLogsDeleted = r3.count;
    const r4 = await prisma.user.deleteMany({});
    result.usersDeleted = r4.count;

    // 创建唯一管理员
    const hash = await bcrypt.hash("123456", 10);
    const admin = await prisma.user.create({
      data: {
        name: "管理员",
        phone: "15313659956",
        passwordHash: hash,
        role: "ADMIN",
        isActive: true,
      },
    });

    result.admin = { id: admin.id, phone: admin.phone, role: admin.role, name: admin.name };
    result.verifyHash = await bcrypt.compare("123456", hash);
    result.ok = true;
  } catch (e: any) {
    result.ok = false;
    result.error = e?.message || String(e);
  }
  return NextResponse.json(result);
}
