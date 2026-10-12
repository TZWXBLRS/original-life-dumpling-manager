/**
 * 超时未支付订单自动清理
 *
 * 业务规则（PRD 5.2）：
 *  - 下单时锁定库存，订单设置 expiresAt（默认 15 分钟）
 *  - 到点仍未支付 → 自动标记 CANCELLED 并释放锁定库存
 *
 * 触发方式：惰性清理——在订单相关 API 入口（下单、查列表、查详情）调用，
 * 同时提供 /api/cron/cleanup-expired-orders 端点供外部定时器调度。
 */

import { prisma } from "./prisma";
import { INVENTORY_LOG_TYPE, ORDER_STATUS } from "./inventory";

/** 待支付订单超时时间（毫秒），默认 15 分钟 */
export const PENDING_PAYMENT_TIMEOUT_MS = 15 * 60 * 1000;

/**
 * 清理所有已超时但仍处于 PENDING_PAYMENT 的订单
 * @returns 本次清理的订单数
 */
export async function cleanupExpiredOrders(): Promise<number> {
  const now = new Date();

  const expired = await prisma.order.findMany({
    where: {
      status: ORDER_STATUS.PENDING_PAYMENT,
      expiresAt: { lte: now },
    },
    select: { id: true },
    take: 200, // 单次最多清理 200 单，避免长事务
  });

  if (expired.length === 0) return 0;

  for (const order of expired) {
    // 单订单事务：释放锁定库存 + 写日志 + 改状态
    await prisma.$transaction(async (tx) => {
      const items = await tx.orderItem.findMany({
        where: { orderId: order.id },
        select: { productId: true, quantity: true },
      });
      for (const it of items) {
        const product = await tx.product.findUnique({
          where: { id: it.productId },
          select: { stock: true, lockedStock: true },
        });
        if (!product) continue;
        // 释放锁定库存（不低于 0）
        const newLocked = Math.max(0, product.lockedStock - it.quantity);
        await tx.product.update({
          where: { id: it.productId },
          data: { lockedStock: newLocked },
        });
        await tx.inventoryLog.create({
          data: {
            productId: it.productId,
            type: INVENTORY_LOG_TYPE.ORDER_RELEASE,
            quantity: it.quantity,
            beforeStock: product.stock,
            afterStock: product.stock, // 释放锁定不动实际库存
            remark: "超时未支付自动取消，释放锁定库存",
            orderId: order.id,
          },
        });
      }
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: ORDER_STATUS.CANCELLED,
          cancelledAt: now,
          cancelReason: "超时未支付，系统自动取消",
        },
      });
    });
  }

  return expired.length;
}
