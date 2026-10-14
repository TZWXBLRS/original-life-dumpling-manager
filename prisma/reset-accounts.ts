import { prisma } from "../src/lib/prisma";
import * as bcrypt from "bcryptjs";

/**
 * 账号清理脚本：只保留一个管理员账号，其余账号一律删除。
 *
 * 处理顺序（避免外键约束报错 + 不丢订单数据）：
 *   1. 创建/更新唯一管理员账号（默认 15313659956 / 123456）
 *   2. 把其他账号名下的订单转到管理员名下
 *   3. 把其他账号的库存日志操作人也转到管理员
 *   4. 删除其他所有账号
 *
 * 本地（SQLite file:）与线上（Turso）通用：
 * 按当前环境变量连接 —— DATABASE_URL（本地）或 TURSO_DATABASE_URL/TURSO_AUTH_TOKEN（线上）。
 *
 * 用法：npm run db:reset-accounts
 */
async function main() {
  const adminPhone = process.env.ADMIN_PHONE || "15313659956";
  const adminName = process.env.ADMIN_NAME || "素生活";
  const adminPassword = process.env.ADMIN_PASSWORD || "123456";

  // 1. 唯一管理员账号
  const adminHash = await bcrypt.hash(adminPassword, 10);
  const admin = await prisma.user.upsert({
    where: { phone: adminPhone },
    update: {
      name: adminName,
      role: "ADMIN",
      passwordHash: adminHash,
      isActive: true,
    },
    create: {
      name: adminName,
      phone: adminPhone,
      passwordHash: adminHash,
      role: "ADMIN",
      isActive: true,
    },
  });
  console.log(`✓ 管理员账号：${adminPhone} / ${adminPassword}（role=ADMIN，id=${admin.id}）`);

  // 2. 找出所有其他账号
  const others = await prisma.user.findMany({
    where: { phone: { not: adminPhone } },
    select: { id: true, phone: true, role: true },
  });
  if (others.length === 0) {
    console.log("✓ 没有其他账号，无需删除");
    return;
  }
  const otherIds = others.map((u) => u.id);

  // 3. 订单转到管理员名下（保留订单数据）
  const movedOrders = await prisma.order.updateMany({
    where: { userId: { in: otherIds } },
    data: { userId: admin.id },
  });

  // 4. 库存日志操作人转到管理员
  const movedLogs = await prisma.inventoryLog.updateMany({
    where: { operatorId: { in: otherIds } },
    data: { operatorId: admin.id },
  });

  // 5. 删除其他账号
  const deleted = await prisma.user.deleteMany({
    where: { id: { in: otherIds } },
  });

  console.log(`✓ 转移订单 ${movedOrders.count} 单 → 管理员`);
  console.log(`✓ 转移库存日志 ${movedLogs.count} 条 → 管理员`);
  console.log(
    `✓ 删除其他账号 ${deleted.count} 个：${others
      .map((u) => `${u.phone}(${u.role})`)
      .join("、")}`
  );
}

main()
  .catch((e) => {
    console.error("❌ 账号清理失败:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
