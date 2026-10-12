/**
 * 库存相关常量与辅助函数
 *
 * 库存模型（对应 PRD 5.2「锁定库存」逻辑）：
 *  - Product.stock：实际库存，仅在订单支付后才扣减
 *  - Product.lockedStock：锁定库存，下单时占用、支付/取消时释放或转为实际扣减
 *  - 前台可售量 = stock - lockedStock
 *
 * 库存变更日志类型统一在此定义，避免散落在各 API 中拼写不一致。
 */

// ============ 库存变更日志类型 ============

export const INVENTORY_LOG_TYPE = {
  /** 入库增加（后厨入库 / 盘点调增） */
  INCREASE: "INCREASE",
  /** 出库减少（后厨出库 / 盘点调减） */
  DECREASE: "DECREASE",
  /** 下单锁定（待支付订单占用库存，不动 stock，只加 lockedStock） */
  ORDER_LOCK: "ORDER_LOCK",
  /** 支付扣减（待支付 → 已支付，lockedStock 转为实际 stock 扣减） */
  ORDER_DEDUCT: "ORDER_DEDUCT",
  /** 取消释放（取消订单，归还锁定或实际库存） */
  ORDER_RELEASE: "ORDER_RELEASE",
} as const;

export type InventoryLogType =
  (typeof INVENTORY_LOG_TYPE)[keyof typeof INVENTORY_LOG_TYPE];

/** 全部合法日志类型（用于校验） */
export const ALL_LOG_TYPES: InventoryLogType[] = [
  INVENTORY_LOG_TYPE.INCREASE,
  INVENTORY_LOG_TYPE.DECREASE,
  INVENTORY_LOG_TYPE.ORDER_LOCK,
  INVENTORY_LOG_TYPE.ORDER_DEDUCT,
  INVENTORY_LOG_TYPE.ORDER_RELEASE,
];

// ============ 订单状态常量（与 schema 注释保持一致） ============

export const ORDER_STATUS = {
  PENDING_PAYMENT: "PENDING_PAYMENT",
  PAID: "PAID",
  PREPARING: "PREPARING",
  READY: "READY", // 已备好，待发货（快递/闪送）
  READY_FOR_PICKUP: "READY_FOR_PICKUP", // 已备好，待自取
  SHIPPED: "SHIPPED",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;

// ============ 辅助函数 ============

/**
 * 计算前台可售库存（= 实际库存 - 锁定库存），最小为 0
 */
export function availableStock(stock: number, lockedStock: number): number {
  return Math.max(0, stock - lockedStock);
}
