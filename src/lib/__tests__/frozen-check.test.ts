import { describe, it, expect } from "vitest";
import {
  FROZEN_REQUIRED_HOURS,
  DELIVERY_WINDOW_START_HOUR,
  DELIVERY_WINDOW_END_HOUR,
  checkFrozenStatus,
  isInDeliveryWindow,
  getNextDeliveryWindow,
  checkOrderFrozenStatus,
  validateShipTime,
  hoursBetween,
  type ProductFrozenInfo,
} from "@/lib/frozen-check";

// 辅助：创建指定小时数前的日期
function hoursAgo(h: number): Date {
  return new Date(Date.now() - h * 60 * 60 * 1000);
}

describe("frozen-check - 单商品冷冻状态", () => {
  it("冷冻满8小时 → READY", () => {
    const product: ProductFrozenInfo = {
      productId: "1",
      productName: "三鲜饺子",
      lastFrozenAt: hoursAgo(10),
    };
    const result = checkFrozenStatus(product);
    expect(result.status).toBe("READY");
    expect(result.frozenHours).toBe(10);
    expect(result.remainingHours).toBe(0);
  });

  it("冷冻刚好8小时 → READY", () => {
    const product: ProductFrozenInfo = {
      productId: "1",
      productName: "三鲜饺子",
      lastFrozenAt: hoursAgo(8),
    };
    const result = checkFrozenStatus(product);
    expect(result.status).toBe("READY");
  });

  it("冷冻不足8小时（3小时）→ NOT_READY", () => {
    const product: ProductFrozenInfo = {
      productId: "1",
      productName: "菌菇饺子",
      lastFrozenAt: hoursAgo(3),
    };
    const result = checkFrozenStatus(product);
    expect(result.status).toBe("NOT_READY");
    expect(result.frozenHours).toBe(3);
    expect(result.remainingHours).toBe(5); // 8-3=5
  });

  it("无冷冻记录 → NO_RECORD", () => {
    const product: ProductFrozenInfo = {
      productId: "1",
      productName: "三鲜饺子",
      lastFrozenAt: null,
    };
    const result = checkFrozenStatus(product);
    expect(result.status).toBe("NO_RECORD");
    expect(result.remainingHours).toBe(FROZEN_REQUIRED_HOURS);
  });

  it("readyAt 时间计算正确", () => {
    const frozenAt = hoursAgo(3);
    const product: ProductFrozenInfo = {
      productId: "1",
      productName: "菌菇饺子",
      lastFrozenAt: frozenAt,
    };
    const result = checkFrozenStatus(product);
    expect(result.readyAt).not.toBeNull();
    // readyAt 应该是 frozenAt + 8小时
    const expected = new Date(frozenAt.getTime() + 8 * 60 * 60 * 1000);
    expect(result.readyAt!.getTime()).toBeCloseTo(expected.getTime(), -1000);
  });
});

describe("frozen-check - 发货时间窗口", () => {
  it("18:00 在窗口内", () => {
    const time = new Date();
    time.setHours(18, 0, 0, 0);
    expect(isInDeliveryWindow(time)).toBe(true);
  });

  it("19:30 在窗口内", () => {
    const time = new Date();
    time.setHours(19, 30, 0, 0);
    expect(isInDeliveryWindow(time)).toBe(true);
  });

  it("17:59 不在窗口内", () => {
    const time = new Date();
    time.setHours(17, 59, 0, 0);
    expect(isInDeliveryWindow(time)).toBe(false);
  });

  it("20:00 不在窗口内（结束时间不含）", () => {
    const time = new Date();
    time.setHours(20, 0, 0, 0);
    expect(isInDeliveryWindow(time)).toBe(false);
  });

  it("12:00 不在窗口内", () => {
    const time = new Date();
    time.setHours(12, 0, 0, 0);
    expect(isInDeliveryWindow(time)).toBe(false);
  });
});

describe("frozen-check - 下一个发货窗口", () => {
  it("下午15:00 → 今天的窗口", () => {
    const now = new Date();
    now.setHours(15, 0, 0, 0);
    const window = getNextDeliveryWindow(now);
    expect(window.start.getHours()).toBe(DELIVERY_WINDOW_START_HOUR);
    expect(window.start.getDate()).toBe(now.getDate());
  });

  it("晚上21:00 → 明天的窗口", () => {
    const now = new Date();
    now.setHours(21, 0, 0, 0);
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const window = getNextDeliveryWindow(now);
    expect(window.start.getHours()).toBe(DELIVERY_WINDOW_START_HOUR);
    expect(window.start.getDate()).toBe(tomorrow.getDate());
  });

  it("发货窗口的开始<结束", () => {
    const window = getNextDeliveryWindow(new Date());
    expect(window.start.getTime()).toBeLessThan(window.end.getTime());
  });
});

describe("frozen-check - 订单冷冻综合检查", () => {
  it("所有商品都达标 → canShip=true, needsConfirmation=false", () => {
    const products: ProductFrozenInfo[] = [
      { productId: "1", productName: "三鲜饺子", lastFrozenAt: hoursAgo(10) },
      { productId: "2", productName: "荠菜饺子", lastFrozenAt: hoursAgo(12) },
    ];
    const result = checkOrderFrozenStatus(products);
    expect(result.canShip).toBe(true);
    expect(result.needsConfirmation).toBe(false);
  });

  it("部分商品不达标 → canShip=false, needsConfirmation=true", () => {
    const products: ProductFrozenInfo[] = [
      { productId: "1", productName: "三鲜饺子", lastFrozenAt: hoursAgo(10) },
      { productId: "2", productName: "菌菇饺子", lastFrozenAt: hoursAgo(3) },
    ];
    const result = checkOrderFrozenStatus(products);
    expect(result.canShip).toBe(false);
    expect(result.needsConfirmation).toBe(true);
    expect(result.earliestShipTime).not.toBeNull();
  });

  it("有商品无冷冻记录 → canShip=false, needsConfirmation=false", () => {
    const products: ProductFrozenInfo[] = [
      { productId: "1", productName: "三鲜饺子", lastFrozenAt: hoursAgo(10) },
      { productId: "2", productName: "菌菇饺子", lastFrozenAt: null },
    ];
    const result = checkOrderFrozenStatus(products);
    expect(result.canShip).toBe(false);
    expect(result.needsConfirmation).toBe(false);
  });

  it("earliestShipTime 取最晚达标的商品", () => {
    const products: ProductFrozenInfo[] = [
      { productId: "1", productName: "三鲜饺子", lastFrozenAt: hoursAgo(10) },
      { productId: "2", productName: "菌菇饺子", lastFrozenAt: hoursAgo(2) },
      { productId: "3", productName: "黑松露饺子", lastFrozenAt: hoursAgo(5) },
    ];
    const result = checkOrderFrozenStatus(products);
    // 菌菇饺子 2小时前冷冻，需8小时，所以最早6小时后才能发货
    // 黑松露 5小时前冷冻，还需3小时
    // 取最晚的：菌菇饺子（还需6小时）
    expect(result.earliestShipTime).not.toBeNull();
    expect(result.needsConfirmation).toBe(true);
  });
});

describe("frozen-check - 发货时间校验", () => {
  it("发货时间在窗口内且冷冻达标 → valid", () => {
    const shipTime = new Date();
    shipTime.setHours(19, 0, 0, 0);
    if (shipTime < new Date()) shipTime.setDate(shipTime.getDate() + 1);
    const frozenReady = new Date(Date.now() - 10 * 60 * 60 * 1000);
    const result = validateShipTime(shipTime, frozenReady);
    expect(result.valid).toBe(true);
  });

  it("发货时间不在窗口内 → invalid", () => {
    const shipTime = new Date();
    shipTime.setHours(15, 0, 0, 0);
    shipTime.setDate(shipTime.getDate() + 1); // 明天下午
    const result = validateShipTime(shipTime, null);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("18:00");
  });

  it("发货时间早于冷冻完成时间 → invalid", () => {
    const shipTime = new Date();
    shipTime.setHours(19, 0, 0, 0);
    if (shipTime < new Date()) shipTime.setDate(shipTime.getDate() + 1);
    // 冷冻完成时间在发货时间之后
    const frozenReady = new Date(shipTime.getTime() + 2 * 60 * 60 * 1000);
    const result = validateShipTime(shipTime, frozenReady);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("冷冻完成时间");
  });
});

describe("frozen-check - hoursBetween", () => {
  it("正确计算小时差", () => {
    const from = new Date("2026-01-01T10:00:00");
    const to = new Date("2026-01-01T18:00:00");
    expect(hoursBetween(from, to)).toBe(8);
  });

  it("跨天计算", () => {
    const from = new Date("2026-01-01T22:00:00");
    const to = new Date("2026-01-02T06:00:00");
    expect(hoursBetween(from, to)).toBe(8);
  });
});
