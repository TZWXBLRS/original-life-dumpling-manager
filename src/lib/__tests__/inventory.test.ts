import { describe, it, expect } from "vitest";
import {
  availableStock,
  INVENTORY_LOG_TYPE,
  ALL_LOG_TYPES,
  ORDER_STATUS,
} from "@/lib/inventory";

/**
 * inventory.ts 单元测试
 *
 * 覆盖库存链路核心纯函数与常量：
 *  - availableStock：前台可售量 = 实际库存 - 锁定库存（最小 0）
 *  - INVENTORY_LOG_TYPE / ALL_LOG_TYPES：日志类型常量与全量校验
 *  - ORDER_STATUS：订单状态枚举与 schema 注释一致
 */

describe("availableStock - 前台可售库存计算", () => {
  it("无锁定时，可售 = 实际库存", () => {
    expect(availableStock(50, 0)).toBe(50);
  });

  it("有锁定时，可售 = 实际库存 - 锁定库存", () => {
    expect(availableStock(50, 10)).toBe(40);
    expect(availableStock(100, 73)).toBe(27);
  });

  it("锁定等于实际库存时，可售 = 0", () => {
    expect(availableStock(50, 50)).toBe(0);
  });

  it("锁定超过实际库存（异常情况）时，可售不低于 0", () => {
    // 理论上不应出现，但防御性兜底
    expect(availableStock(10, 50)).toBe(0);
    expect(availableStock(0, 5)).toBe(0);
  });

  it("零库存零锁定时，可售 = 0", () => {
    expect(availableStock(0, 0)).toBe(0);
  });
});

describe("INVENTORY_LOG_TYPE - 库存日志类型常量", () => {
  it("入库类型为 INCREASE", () => {
    expect(INVENTORY_LOG_TYPE.INCREASE).toBe("INCREASE");
  });

  it("出库类型为 DECREASE", () => {
    expect(INVENTORY_LOG_TYPE.DECREASE).toBe("DECREASE");
  });

  it("下单锁定类型为 ORDER_LOCK", () => {
    expect(INVENTORY_LOG_TYPE.ORDER_LOCK).toBe("ORDER_LOCK");
  });

  it("支付扣减类型为 ORDER_DEDUCT", () => {
    expect(INVENTORY_LOG_TYPE.ORDER_DEDUCT).toBe("ORDER_DEDUCT");
  });

  it("取消释放类型为 ORDER_RELEASE", () => {
    expect(INVENTORY_LOG_TYPE.ORDER_RELEASE).toBe("ORDER_RELEASE");
  });

  it("各类型值互不相同", () => {
    const values = Object.values(INVENTORY_LOG_TYPE);
    expect(new Set(values).size).toBe(values.length);
  });
});

describe("ALL_LOG_TYPES - 全量日志类型列表", () => {
  it("包含全部 5 种日志类型", () => {
    expect(ALL_LOG_TYPES).toHaveLength(5);
    expect(ALL_LOG_TYPES).toContain("INCREASE");
    expect(ALL_LOG_TYPES).toContain("DECREASE");
    expect(ALL_LOG_TYPES).toContain("ORDER_LOCK");
    expect(ALL_LOG_TYPES).toContain("ORDER_DEDUCT");
    expect(ALL_LOG_TYPES).toContain("ORDER_RELEASE");
  });

  it("不包含已废弃的 INBOUND / OUTBOUND / ADJUST", () => {
    expect(ALL_LOG_TYPES).not.toContain("INBOUND");
    expect(ALL_LOG_TYPES).not.toContain("OUTBOUND");
    expect(ALL_LOG_TYPES).not.toContain("ADJUST");
  });
});

describe("ORDER_STATUS - 订单状态枚举", () => {
  it("包含 8 个状态（含 READY）", () => {
    const values = Object.values(ORDER_STATUS);
    expect(values).toHaveLength(8);
  });

  it("包含 READY 状态（与代码实际使用一致）", () => {
    expect(ORDER_STATUS.READY).toBe("READY");
  });

  it("包含 READY_FOR_PICKUP 状态", () => {
    expect(ORDER_STATUS.READY_FOR_PICKUP).toBe("READY_FOR_PICKUP");
  });

  it("待支付与已取消状态值正确", () => {
    expect(ORDER_STATUS.PENDING_PAYMENT).toBe("PENDING_PAYMENT");
    expect(ORDER_STATUS.CANCELLED).toBe("CANCELLED");
  });

  it("各状态值互不相同", () => {
    const values = Object.values(ORDER_STATUS);
    expect(new Set(values).size).toBe(values.length);
  });
});
