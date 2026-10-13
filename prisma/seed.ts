import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { calculatePrice, type CartItem } from "../src/lib/pricing";

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
  const products = [
    {
      name: "荠菜饺子",
      category: PRODUCT_CATEGORY.CLASSIC,
      unitPrice: 3300,
      description: "新鲜荠菜，清香可口（每盒20只）",
      sortOrder: 1,
      stock: 50,
    },
    {
      name: "酸菜饺子",
      category: PRODUCT_CATEGORY.CLASSIC,
      unitPrice: 3300,
      description: "东北酸菜风味，酸爽开胃（每盒20只）",
      sortOrder: 2,
      stock: 50,
    },
    {
      name: "三鲜饺子",
      category: PRODUCT_CATEGORY.CLASSIC,
      unitPrice: 3300,
      description: "素三鲜组合，三种时蔬鲜香搭配（每盒20只）",
      sortOrder: 3,
      stock: 50,
    },
    {
      name: "茴香饺子",
      category: PRODUCT_CATEGORY.CLASSIC,
      unitPrice: 3300,
      description: "北方特色茴香口味，回味悠长（每盒20只）",
      sortOrder: 4,
      stock: 50,
    },
    {
      name: "芹菜饺子",
      category: PRODUCT_CATEGORY.CLASSIC,
      unitPrice: 3300,
      description: "新鲜芹菜，清爽不腻（每盒20只）",
      sortOrder: 5,
      stock: 50,
    },
    {
      name: "玉米饺子",
      category: PRODUCT_CATEGORY.CLASSIC,
      unitPrice: 3300,
      description: "甜玉米粒，老少皆宜（每盒20只）",
      sortOrder: 6,
      stock: 50,
    },
    {
      name: "黑松露饺子",
      category: PRODUCT_CATEGORY.SPECIALTY,
      unitPrice: 3800,
      description: "珍稀黑松露，高端风味（每盒12只）",
      sortOrder: 7,
      stock: 20,
    },
    {
      name: "菌菇饺子",
      category: PRODUCT_CATEGORY.SPECIALTY,
      unitPrice: 3800,
      description: "多种野生菌菇混合，鲜美无比（每盒20只）",
      sortOrder: 8,
      stock: 20,
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

  // ========= 5. 演示订单数据（demo 阶段专用）=========
  // 演示模式下顾客通过 /api/auth/demo-login 用手机号 upsert 出 CUSTOMER 用户，
  // 这里同步预建一个演示顾客，让后台能立刻看到订单数据用于汇总演示。
  await seedDemoOrders();
  console.log("\n🎉 数据库初始化完成（素生活正式配置已生效）！");
}

/**
 * 演示订单数据 - 仅 demo 阶段使用
 * 真实上线后可移除或改为仅在 DATABASE_URL 为 demo 时执行
 *
 * 覆盖维度：
 *  - 配送方式：自取 / 快递 / 闪送
 *  - 订单状态：PAID / PREPARING / READY / SHIPPED / COMPLETED
 *  - 商品组合：经典单类 / 特色单类 / 经典+特色混拼
 *  - 创建时间：跨今日多个时段（便于测试日期范围筛选）
 */
async function seedDemoOrders() {
  // 1. upsert 演示顾客用户
  // 注意：手机号要避开 ADMIN_PHONE/KITCHEN_PHONE 默认值，避免角色冲突
  const demoPhone = "13800138888";
  const demoPasswordHash = await bcrypt.hash("demo123456", 10);
  const demoUser = await prisma.user.upsert({
    where: { phone: demoPhone },
    update: { name: "演示顾客", isActive: true, passwordHash: demoPasswordHash },
    create: {
      name: "演示顾客",
      phone: demoPhone,
      passwordHash: demoPasswordHash,
      role: USER_ROLE.CUSTOMER,
      isActive: true,
    },
  });

  // 取所有产品用于构造订单项
  const allProducts = await prisma.product.findMany();
  const byName = (n: string) => allProducts.find((p) => p.name === n)!;
  const classic = (n: string): CartItem => {
    const p = byName(n);
    return {
      productId: p.id,
      productName: p.name,
      category: "CLASSIC",
      quantity: 1,
      unitPrice: p.unitPrice,
    };
  };
  const specialty = (n: string): CartItem => {
    const p = byName(n);
    return {
      productId: p.id,
      productName: p.name,
      category: "SPECIALTY",
      quantity: 1,
      unitPrice: p.unitPrice,
    };
  };

  // 用真实定价算法计算每单的金额、盒数、价格明细
  type DraftOrder = {
    items: CartItem[];
    deliveryType: "PICKUP" | "DELIVERY" | "EXPRESS";
    status: "PAID" | "PREPARING" | "READY" | "SHIPPED" | "COMPLETED";
    pickupSlot?: string;
    address?: {
      name: string;
      phone: string;
      province: string;
      city: string;
      district: string;
      detail: string;
    };
    note?: string;
    hoursAgo: number; // 多少小时前下单
  };

  const drafts: DraftOrder[] = [
    // 单1：自取 4 盒经典，规则A ¥100，COMPLETED
    {
      items: [classic("荠菜饺子"), classic("三鲜饺子"), classic("茴香饺子"), classic("芹菜饺子")],
      deliveryType: "PICKUP",
      status: "COMPLETED",
      pickupSlot: "09:30-11:30",
      note: "周末家庭聚餐",
      hoursAgo: 8,
    },
    // 单2：自取 3 盒特色，规则B ¥100，PAID
    {
      items: [specialty("黑松露饺子"), specialty("黑松露饺子"), specialty("菌菇饺子")],
      deliveryType: "PICKUP",
      status: "PAID",
      pickupSlot: "17:30-19:30",
      note: "节日礼物送朋友",
      hoursAgo: 2,
    },
    // 单3：快递 6 盒混拼，规则C ¥168，泡沫箱 2 个 ¥10，total ¥178，PREPARING
    {
      items: [
        classic("荠菜饺子"), classic("酸菜饺子"), classic("三鲜饺子"),
        classic("茴香饺子"), classic("芹菜饺子"),
        specialty("黑松露饺子"),
      ],
      deliveryType: "DELIVERY",
      status: "PREPARING",
      address: {
        name: "张先生",
        phone: "13900000001",
        province: "北京",
        city: "北京市",
        district: "朝阳区",
        detail: "建国路88号 SOHO 现代城 A 座 1502",
      },
      note: "请放快递柜，电话联系",
      hoursAgo: 5,
    },
    // 单4：快递 4 盒经典，规则A ¥100，泡沫箱 1 个 ¥5，total ¥105，SHIPPED
    {
      items: [classic("玉米饺子"), classic("玉米饺子"), classic("玉米饺子"), classic("玉米饺子")],
      deliveryType: "DELIVERY",
      status: "SHIPPED",
      address: {
        name: "李女士",
        phone: "13900000002",
        province: "北京",
        city: "北京市",
        district: "海淀区",
        detail: "中关村大街1号 海龙大厦 18 层",
      },
      note: "周末送达",
      hoursAgo: 7,
    },
    // 单5：闪送 3 经典 + 1 特色，¥33*3+¥38=¥137，COMPLETED
    {
      items: [
        classic("荠菜饺子"), classic("酸菜饺子"), classic("三鲜饺子"),
        specialty("菌菇饺子"),
      ],
      deliveryType: "EXPRESS",
      status: "COMPLETED",
      address: {
        name: "王女士",
        phone: "13900000003",
        province: "北京",
        city: "北京市",
        district: "西城区",
        detail: "金融街18号 通泰大厦 B 座 6 层",
      },
      note: "加急送当日午餐",
      hoursAgo: 6,
    },
    // 单6：自取 6 盒混拼，规则C ¥168，PAID
    {
      items: [
        classic("荠菜饺子"), classic("三鲜饺子"), classic("茴香饺子"), classic("芹菜饺子"),
        specialty("黑松露饺子"), specialty("菌菇饺子"),
      ],
      deliveryType: "PICKUP",
      status: "PAID",
      pickupSlot: "13:30-15:30",
      note: "公司团建下午茶",
      hoursAgo: 1,
    },
    // 单7：快递 5 经典，规则A(¥100)+1经典(¥33)=¥133，泡沫箱 1 ¥5，total ¥138，READY
    {
      items: [
        classic("酸菜饺子"), classic("三鲜饺子"), classic("茴香饺子"), classic("芹菜饺子"),
        classic("玉米饺子"),
      ],
      deliveryType: "DELIVERY",
      status: "READY",
      address: {
        name: "陈先生",
        phone: "13900000004",
        province: "北京",
        city: "北京市",
        district: "东城区",
        detail: "东直门外大街20号 东方银座 A 座 9 层",
      },
      note: "工作日上班时间送达",
      hoursAgo: 3,
    },
    // 单8：闪送 2 特色，2×¥38=¥76，SHIPPED
    {
      items: [specialty("黑松露饺子"), specialty("黑松露饺子")],
      deliveryType: "EXPRESS",
      status: "SHIPPED",
      address: {
        name: "刘先生",
        phone: "13900000005",
        province: "北京",
        city: "北京市",
        district: "丰台区",
        detail: "南三环西路16号 凯瑞大厦 12 层",
      },
      note: "急送当日客户答谢",
      hoursAgo: 4,
    },
  ];

  // 清空旧演示订单（按 phone 找出 demoUser 的所有订单删掉，避免重复 seed 累积）
  await prisma.order.deleteMany({ where: { userId: demoUser.id } });

  const now = Date.now();
  let created = 0;
  for (const d of drafts) {
    const pricing = calculatePrice(d.items, d.deliveryType);

    const createdAt = new Date(now - d.hoursAgo * 60 * 60 * 1000);
    // 时间线按状态推进：每个状态比下单晚 20~40 分钟
    const step = (offsetMin: number) => new Date(createdAt.getTime() + offsetMin * 60 * 1000);
    const paidAt = step(5);
    const preparingAt = step(15);
    const readyAt = step(30);
    const shippedAt = step(45);
    const completedAt = step(90);

    const statusTimeline: Record<string, any> = {
      PAID: { paidAt },
      PREPARING: { paidAt, preparingAt },
      READY: { paidAt, preparingAt, readyAt },
      SHIPPED: { paidAt, preparingAt, readyAt, shippedAt },
      COMPLETED: { paidAt, preparingAt, readyAt, shippedAt, completedAt },
    };

    const orderNo = "DMP" + createdAt.getTime() + (1000 + created);

    // 自取订单生成 6 位取货码
    const pickupCode =
      d.deliveryType === "PICKUP"
        ? String(100000 + Math.floor(Math.random() * 900000))
        : null;

    // 快递订单的冷冻相关字段
    const isDelivery = d.deliveryType === "DELIVERY";
    const plannedShipDate = isDelivery ? step(60) : null;
    const deliveryETA = isDelivery ? step(60 + 24 * 60) : null;

    const order = await prisma.order.create({
      data: {
        orderNo,
        userId: demoUser.id,
        deliveryType: d.deliveryType,
        status: d.status,
        totalAmount: pricing.totalAmount,
        goodsAmount: pricing.goodsAmount,
        totalBoxes: pricing.totalBoxes,
        classicBoxes: pricing.classicBoxes,
        specialtyBoxes: pricing.specialtyBoxes,
        foamBoxCount: pricing.foamBoxCount,
        foamBoxAmount: pricing.foamBoxAmount,
        pricingBreakdown: JSON.stringify(pricing.breakdown),
        // 收货信息
        receiverName: d.address?.name ?? null,
        receiverPhone: d.address?.phone ?? null,
        receiverProvince: d.address?.province ?? null,
        receiverCity: d.address?.city ?? null,
        receiverDistrict: d.address?.district ?? null,
        receiverAddress: d.address?.detail ?? null,
        // 自取
        pickupSlot: d.pickupSlot ?? null,
        pickupCode,
        // 快递
        plannedShipDate,
        deliveryETA,
        customerAckRisk: false,
        // 支付（演示默认微信支付占位）
        paidAt: statusTimeline[d.status].paidAt,
        paymentMethod: "WECHAT_JSAPI",
        paymentRef: "demo_" + orderNo,
        // 时间线
        preparingAt: statusTimeline[d.status].preparingAt ?? null,
        readyAt: statusTimeline[d.status].readyAt ?? null,
        shippedAt: statusTimeline[d.status].shippedAt ?? null,
        completedAt: statusTimeline[d.status].completedAt ?? null,
        note: d.note ?? null,
        createdAt,
        updatedAt: createdAt,
      },
    });

    // 写订单项
    const orderItems = d.items.map((it) => ({
      orderId: order.id,
      productId: it.productId,
      productName: it.productName,
      category: it.category,
      unitPrice: it.unitPrice,
      quantity: it.quantity,
      subtotal: it.unitPrice * it.quantity,
    }));
    await prisma.orderItem.createMany({ data: orderItems });
    created++;
  }
  console.log(`  ✓ 预置 ${created} 单演示订单（演示顾客 ${demoPhone}，可一键登录）`);
}

main()
  .catch((e) => {
    console.error("❌ 初始化失败:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
