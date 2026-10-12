/**
 * 冷冻时间校验模块
 *
 * 业务规则：
 *  1. 冷冻饺子入库后必须冷冻满 8 小时才能发快递
 *  2. 快递发货时间窗口：每天 18:00 - 20:00
 *  3. 如果冷冻时间不足 8 小时，需要前台人工确认饺子冷冻情况后才能发货
 *  4. 快递发货时间不能早于冷冻完成时间
 */

// ============ 常量 ============

/** 冷冻必须满足的最短时长（小时） */
export const FROZEN_REQUIRED_HOURS = 8;

/** 快递发货时间窗口 - 开始（24小时制） */
export const DELIVERY_WINDOW_START_HOUR = 18;

/** 快递发货时间窗口 - 结束（24小时制） */
export const DELIVERY_WINDOW_END_HOUR = 20;

// ============ 类型定义 ============

export interface ProductFrozenInfo {
  productId: string;
  productName: string;
  lastFrozenAt: Date | null;
}

export type FrozenStatus = "READY" | "NOT_READY" | "NO_RECORD";

export interface FrozenCheckResult {
  status: FrozenStatus;
  /** 冷冻已完成的小时数（不足1小时按0算） */
  frozenHours: number;
  /** 还需多少小时才能达标 */
  remainingHours: number;
  /** 冷冻完成时间（预计） */
  readyAt: Date | null;
  /** 人类可读的提示信息 */
  message: string;
}

export interface OrderFrozenCheckResult {
  /** 订单整体是否可以发货 */
  canShip: boolean;
  /** 是否需要前台人工确认 */
  needsConfirmation: boolean;
  /** 各商品的冷冻状态明细 */
  items: Array<{
    productId: string;
    productName: string;
    frozenHours: number;
    remainingHours: number;
    readyAt: Date | null;
    status: FrozenStatus;
  }>;
  /** 最早可发货时间（所有商品都冷冻达标后的时间） */
  earliestShipTime: Date | null;
  /** 下一个发货时间窗口 */
  nextDeliveryWindow: { start: Date; end: Date };
  /** 综合提示信息 */
  message: string;
}

// ============ 核心函数 ============

/**
 * 计算两个时间点之间的小时差（浮点数）
 */
export function hoursBetween(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / (1000 * 60 * 60);
}

/**
 * 检查单个商品的冷冻状态
 * @param product 商品信息（含最后冷冻时间）
 * @param now 当前时间（可选，便于测试）
 */
export function checkFrozenStatus(
  product: ProductFrozenInfo,
  now: Date = new Date()
): FrozenCheckResult {
  if (!product.lastFrozenAt) {
    return {
      status: "NO_RECORD",
      frozenHours: 0,
      remainingHours: FROZEN_REQUIRED_HOURS,
      readyAt: null,
      message: `「${product.productName}」无冷冻入库记录，请先入库冷冻`,
    };
  }

  const frozenHours = hoursBetween(product.lastFrozenAt, now);
  const remainingHours = Math.max(
    0,
    FROZEN_REQUIRED_HOURS - frozenHours
  );
  const readyAt = new Date(
    product.lastFrozenAt.getTime() + FROZEN_REQUIRED_HOURS * 60 * 60 * 1000
  );

  if (frozenHours >= FROZEN_REQUIRED_HOURS) {
    return {
      status: "READY",
      frozenHours: Math.floor(frozenHours),
      remainingHours: 0,
      readyAt,
      message: `「${product.productName}」已冷冻 ${Math.floor(frozenHours)} 小时，可以发货`,
    };
  }

  return {
    status: "NOT_READY",
    frozenHours: Math.floor(frozenHours),
    remainingHours: Math.ceil(remainingHours),
    readyAt,
    message: `「${product.productName}」已冷冻 ${Math.floor(frozenHours)} 小时，还需 ${Math.ceil(remainingHours)} 小时才能发货`,
  };
}

/**
 * 判断指定时间是否在快递发货时间窗口内（18:00 - 20:00）
 */
export function isInDeliveryWindow(now: Date = new Date()): boolean {
  const hour = now.getHours();
  const minutes = now.getMinutes();
  const timeValue = hour + minutes / 60;
  return (
    timeValue >= DELIVERY_WINDOW_START_HOUR &&
    timeValue < DELIVERY_WINDOW_END_HOUR
  );
}

/**
 * 获取下一个（或当前）快递发货时间窗口
 * 如果当前在窗口内，返回当前窗口
 * 否则返回今天晚上或明天晚上的窗口
 */
export function getNextDeliveryWindow(
  now: Date = new Date()
): { start: Date; end: Date } {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  // 今天的发货窗口
  const todayWindow = {
    start: new Date(today),
    end: new Date(today),
  };
  todayWindow.start.setHours(DELIVERY_WINDOW_START_HOUR, 0, 0, 0);
  todayWindow.end.setHours(DELIVERY_WINDOW_END_HOUR, 0, 0, 0);

  // 如果当前还没到今天的窗口结束，返回今天的窗口
  if (now < todayWindow.end) {
    return todayWindow;
  }

  // 否则返回明天的窗口
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return {
    start: new Date(
      tomorrow.getTime() + DELIVERY_WINDOW_START_HOUR * 60 * 60 * 1000
    ),
    end: new Date(
      tomorrow.getTime() + DELIVERY_WINDOW_END_HOUR * 60 * 60 * 1000
    ),
  };
}

/**
 * 检查订单中所有商品的冷冻状态，综合判断是否可以发货
 *
 * @param products 订单中各商品的冷冻信息
 * @param now 当前时间（可选，便于测试）
 */
export function checkOrderFrozenStatus(
  products: ProductFrozenInfo[],
  now: Date = new Date()
): OrderFrozenCheckResult {
  const itemResults = products.map((p) => {
    const check = checkFrozenStatus(p, now);
    return {
      productId: p.productId,
      productName: p.productName,
      frozenHours: check.frozenHours,
      remainingHours: check.remainingHours,
      readyAt: check.readyAt,
      status: check.status,
    };
  });

  // 找到冷冻达标最晚的那个商品的时间
  let earliestShipTime: Date | null = null;
  let hasNotReady = false;
  let hasNoRecord = false;

  for (const item of itemResults) {
    if (item.status === "NO_RECORD") {
      hasNoRecord = true;
    }
    if (item.status === "NOT_READY" && item.readyAt) {
      hasNotReady = true;
      if (
        !earliestShipTime ||
        item.readyAt.getTime() > earliestShipTime.getTime()
      ) {
        earliestShipTime = item.readyAt;
      }
    }
  }

  const nextWindow = getNextDeliveryWindow(now);

  // 判断是否可以发货
  // 1. 有无记录的商品 → 不能发货
  // 2. 有未冷冻达标的商品 → 需要前台确认
  // 3. 全部达标 → 可以发货
  const canShip = !hasNoRecord && !hasNotReady;
  const needsConfirmation = hasNotReady && !hasNoRecord;

  // 综合提示信息
  let message = "";
  if (hasNoRecord) {
    const noRecordItems = itemResults
      .filter((i) => i.status === "NO_RECORD")
      .map((i) => i.productName);
    message = `以下商品无冷冻记录，无法发货：${noRecordItems.join("、")}。请先入库冷冻。`;
  } else if (hasNotReady) {
    const notReadyItems = itemResults
      .filter((i) => i.status === "NOT_READY")
      .map((i) => i.productName);
    message = `以下商品冷冻时间不足8小时：${notReadyItems.join("、")}。请前台确认饺子冷冻情况后决定是否继续发货。`;
  } else {
    message = "所有商品冷冻均已达标，可以发货。";
  }

  return {
    canShip,
    needsConfirmation,
    items: itemResults,
    earliestShipTime,
    nextDeliveryWindow: nextWindow,
    message,
  };
}

/**
 * 判断指定发货时间是否合法
 * 发货时间不能早于冷冻完成时间，且必须在发货窗口内
 */
export function validateShipTime(
  shipTime: Date,
  earliestFrozenReady: Date | null,
  now: Date = new Date()
): { valid: boolean; reason?: string } {
  // 检查是否在发货窗口内
  if (!isInDeliveryWindow(shipTime)) {
    const hour = shipTime.getHours();
    return {
      valid: false,
      reason: `发货时间必须在 ${DELIVERY_WINDOW_START_HOUR}:00 - ${DELIVERY_WINDOW_END_HOUR}:00 之间，当前时间为 ${hour}:00`,
    };
  }

  // 检查冷冻时间
  if (earliestFrozenReady && shipTime < earliestFrozenReady) {
    return {
      valid: false,
      reason: `发货时间不能早于冷冻完成时间（${earliestFrozenReady.toLocaleString("zh-CN")}）`,
    };
  }

  // 检查发货时间不能是过去的时间
  if (shipTime < now) {
    return {
      valid: false,
      reason: "发货时间不能是过去的时间",
    };
  }

  return { valid: true };
}
