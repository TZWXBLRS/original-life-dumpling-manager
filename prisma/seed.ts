import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// 合法值常量（代替 Prisma enum，因为 SQLite 不支持）
const USER_ROLE = {
  CUSTOMER: "CUSTOMER",
  KITCHEN: "KITCHEN",
  ADMIN: "ADMIN",
} as const;

const PRODUCT_CATEGORY = {
  CLASSIC: "CLASSIC",
  SPECIALTY: "SPECIALTY",
} as const;

async function main() {
  console.log("🌱 开始初始化数据库（素生活正式配置）...");

  // ========= 1. 创建/更新 管理员账号 =========
  // 注意：手机号必须唯一，一个手机号不能同时是两个角色。
  // 管理员：15313659956 / sushenghuo107
  // 后厨：18301576627 / sushenghuo105
  const adminName = process.env.ADMIN_NAME || "素生活";
  const adminPhone = process.env.ADMIN_PHONE || "15313659956";
  const adminPassword = process.env.ADMIN_PASSWORD || "sushenghuo107";
  const adminHash = await bcrypt.hash(adminPassword, 10);

  await prisma.user.upsert({
    where: { phone: adminPhone },
    update: {
      name: adminName,
      role: USER_ROLE.ADMIN,
      passwordHash: adminHash,
      isActive: true,
    },
    create: {
      name: adminName,
      phone: adminPhone,
      passwordHash: adminHash,
      role: USER_ROLE.ADMIN,
    },
  });
  console.log(`  ✓ 管理员账号: ${adminPhone} / ${adminPassword} (${adminName})`);

  // ========= 2. 创建/更新 后厨账号 =========
  const kitchenName = process.env.KITCHEN_NAME || "素生活后厨";
  // 后厨：18301576627 / sushenghuo105（独立于管理员手机号）
  const kitchenPhone = process.env.KITCHEN_PHONE || "18301576627";
  const kitchenPassword = process.env.KITCHEN_PASSWORD || "sushenghuo105";
  const kitchenHash = await bcrypt.hash(kitchenPassword, 10);

  await prisma.user.upsert({
    where: { phone: kitchenPhone },
    update: {
      name: kitchenName,
      role: USER_ROLE.KITCHEN,
      passwordHash: kitchenHash,
      isActive: true,
    },
    create: {
      name: kitchenName,
      phone: kitchenPhone,
      passwordHash: kitchenHash,
      role: USER_ROLE.KITCHEN,
    },
  });
  console.log(`  ✓ 后厨账号: ${kitchenPhone} / ${kitchenPassword} (${kitchenName})`);

  // ========= 3. 初始化商品（饺子口味） =========
  // 初始冷冻时间设为24小时前，确保可发货
  const frozenTime = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const products = [
    {
      name: "荠菜饺子",
      category: PRODUCT_CATEGORY.CLASSIC,
      unitPrice: 3300,
      description: "新鲜荠菜，清香可口（每盒20只）",
      sortOrder: 1,
      stock: 50,
      lastFrozenAt: frozenTime,
    },
    {
      name: "酸菜饺子",
      category: PRODUCT_CATEGORY.CLASSIC,
      unitPrice: 3300,
      description: "东北酸菜风味，酸爽开胃（每盒20只）",
      sortOrder: 2,
      stock: 50,
      lastFrozenAt: frozenTime,
    },
    {
      name: "三鲜饺子",
      category: PRODUCT_CATEGORY.CLASSIC,
      unitPrice: 3300,
      description: "素三鲜组合，三种时蔬鲜香搭配（每盒20只）",
      sortOrder: 3,
      stock: 50,
      lastFrozenAt: frozenTime,
    },
    {
      name: "茴香饺子",
      category: PRODUCT_CATEGORY.CLASSIC,
      unitPrice: 3300,
      description: "北方特色茴香口味，回味悠长（每盒20只）",
      sortOrder: 4,
      stock: 50,
      lastFrozenAt: frozenTime,
    },
    {
      name: "芹菜饺子",
      category: PRODUCT_CATEGORY.CLASSIC,
      unitPrice: 3300,
      description: "新鲜芹菜，清爽不腻（每盒20只）",
      sortOrder: 5,
      stock: 50,
      lastFrozenAt: frozenTime,
    },
    {
      name: "玉米饺子",
      category: PRODUCT_CATEGORY.CLASSIC,
      unitPrice: 3300,
      description: "甜玉米粒，老少皆宜（每盒20只）",
      sortOrder: 6,
      stock: 50,
      lastFrozenAt: frozenTime,
    },
    {
      name: "黑松露饺子",
      category: PRODUCT_CATEGORY.SPECIALTY,
      unitPrice: 3800,
      description: "珍稀黑松露，高端风味（每盒12只）",
      sortOrder: 7,
      stock: 20,
      lastFrozenAt: frozenTime,
    },
    {
      name: "菌菇饺子",
      category: PRODUCT_CATEGORY.SPECIALTY,
      unitPrice: 3800,
      description: "多种野生菌菇混合，鲜美无比（每盒20只）",
      sortOrder: 8,
      stock: 20,
      lastFrozenAt: frozenTime,
    },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { name: p.name },
      update: { ...p },
      create: { ...p },
    });
  }
  console.log(
    `  ✓ 初始化 ${products.length} 种口味（经典6种×20只/盒 + 特色黑松露12只/盒, 菌菇20只/盒）`
  );

  // ========= 4. 初始化系统配置 =========
  const pickupAddress =
    process.env.PICKUP_ADDRESS ||
    "北京昌平路181号院卢卡新天地3号楼底商负107 素生活";
  const businessHours =
    process.env.BUSINESS_HOURS_JSON ||
    JSON.stringify({
      weekdays: "9:30-20:30",
      weekend: "9:30-20:30",
      holidays: "9:30-20:30（节假日正常营业）",
      pickupSlots: [
        "09:30-11:30",
        "11:30-13:30",
        "13:30-15:30",
        "15:30-17:30",
        "17:30-19:30",
        "19:30-20:30",
      ],
    });
  const dailyLimit = process.env.DAILY_LIMIT || "100";
  const storePhone = process.env.STORE_PHONE || "18301576627";
  const storeName = process.env.STORE_NAME || "素生活·原味生活饺子馆";

  const configs = [
    { key: "PICKUP_ADDRESS", value: pickupAddress, description: "自取地址" },
    {
      key: "BUSINESS_HOURS",
      value: businessHours,
      description: "营业时间与自取时段",
    },
    { key: "DAILY_LIMIT", value: dailyLimit, description: "每日销售上限（盒）" },
    { key: "FOAM_BOX_PRICE", value: "500", description: "泡沫箱单价（分）" },
    { key: "FOAM_BOX_CAPACITY", value: "5", description: "每个泡沫箱可装盒数" },
    { key: "STORE_PHONE", value: storePhone, description: "门店联系电话" },
    { key: "STORE_NAME", value: storeName, description: "门店名称" },
  ];

  for (const cfg of configs) {
    await prisma.systemConfig.upsert({
      where: { key: cfg.key },
      update: { value: cfg.value, description: cfg.description },
      create: cfg,
    });
  }
  console.log(`  ✓ 门店信息：${storeName}`);
  console.log(`  ✓ 自取地址：${pickupAddress}`);
  console.log(`  ✓ 营业时间：9:30-20:30（节假日正常营业）`);
  console.log(`  ✓ 联系电话：${storePhone}`);
  console.log(`  ✓ 每日限购 ${dailyLimit} 盒`);

  console.log("\n🎉 数据库初始化完成（素生活正式配置已生效）！");
}

main()
  .catch((e) => {
    console.error("❌ 初始化失败:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
