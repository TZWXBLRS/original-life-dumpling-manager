import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * order-cleanup.ts 超时订单清理测试
 *
 * 用 mock prisma 验证 cleanupExpiredOrders 的核心行为：
 *  - 无超时订单时返回 0 且不动库存
 *  - 超时订单：释放锁定库存、写 ORDER_RELEASE 日志、改状态为 CANCELLED
 *  - 锁定库存释放后不低于 0
 *  - 不影响实际库存（stock）
 *
 * 关键：mock prisma.$transaction 直接执行回调（不真正开事务），
 * 这样可验证回调内的库存操作与日志写入。
 */

// 在导入被测模块前 mock prisma 模块
vi.mock("@/lib/prisma", () => {
  const prisma = {
    order: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  };
  return { prisma };
});

import { prisma } from "@/lib/prisma";
import { cleanupExpiredOrders } from "@/lib/order-cleanup";
import { INVENTORY_LOG_TYPE, ORDER_STATUS } from "@/lib/inventory";

// 简易类型，便于构造 mock 数据
type ProductRow = { stock: number; lockedStock: number };
type ItemRow = { productId: string; quantity: number };

describe("cleanupExpiredOrders - 超时订单清理", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 默认 $transaction 直接执行回调
    (prisma.$transaction as any).mockImplementation(async (cb: any) => cb(txMock));
  });

  it("无超时订单时返回 0 且不进入事务", async () => {
    (prisma.order.findMany as any).mockResolvedValue([]);
    const n = await cleanupExpiredOrders();
    expect(n).toBe(0);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("超时订单：释放锁定库存并写 ORDER_RELEASE 日志、改状态为 CANCELLED", async () => {
    const orderId = "order-1";
    (prisma.order.findMany as any).mockResolvedValue([{ id: orderId }]);

    // 单订单两商品：商品 A 锁定 3、商品 B 锁定 2
    const items: ItemRow[] = [
      { productId: "pA", quantity: 3 },
      { productId: "pB", quantity: 2 },
    ];
    const products: Record<string, ProductRow> = {
      pA: { stock: 50, lockedStock: 3 },
      pB: { stock: 30, lockedStock: 2 },
    };

    const txMock = {
      orderItem: { findMany: vi.fn().mockResolvedValue(items) },
      product: {
        findUnique: vi.fn().mockImplementation(async ({ where }: any) =>
          ({ stock: products[where.id].stock, lockedStock: products[where.id].lockedStock })
        ),
        update: vi.fn().mockImplementation(async ({ where, data }: any) => {
          // 应用释放逻辑便于后续断言最终值
          products[where.id].lockedStock = data.lockedStock;
          return {};
        }),
      },
      inventoryLog: { create: vi.fn().mockResolvedValue({}) },
      order: { update: vi.fn().mockResolvedValue({}) },
    };
    (prisma.$transaction as any).mockImplementation(async (cb: any) => cb(txMock));

    const n = await cleanupExpiredOrders();
    expect(n).toBe(1);

    // 商品 A 锁定 3-3=0；商品 B 锁定 2-2=0
    expect(products.pA.lockedStock).toBe(0);
    expect(products.pB.lockedStock).toBe(0);
    // 实际库存不变
    expect(products.pA.stock).toBe(50);
    expect(products.pB.stock).toBe(30);

    // 两条 ORDER_RELEASE 日志
    expect(txMock.inventoryLog.create).toHaveBeenCalledTimes(2);
    const logCalls = txMock.inventoryLog.create.mock.calls;
    expect(logCalls[0][0].data.type).toBe(INVENTORY_LOG_TYPE.ORDER_RELEASE);
    expect(logCalls[1][0].data.type).toBe(INVENTORY_LOG_TYPE.ORDER_RELEASE);
    // 日志 beforeStock == afterStock（释放锁定不动实际库存）
    for (const c of logCalls) {
      expect(c[0].data.beforeStock).toBe(c[0].data.afterStock);
      expect(c[0].data.orderId).toBe(orderId);
    }

    // 订单状态改为 CANCELLED
    expect(txMock.order.update).toHaveBeenCalledWith({
      where: { id: orderId },
      data: expect.objectContaining({
        status: ORDER_STATUS.CANCELLED,
        cancelReason: "超时未支付，系统自动取消",
      }),
    });
  });

  it("锁定库存不足以覆盖订单数量时，释放后不低于 0", async () => {
    const orderId = "order-2";
    (prisma.order.findMany as any).mockResolvedValue([{ id: orderId }]);

    // 异常场景：锁定库存只有 1，但订单要释放 5
    const items: ItemRow[] = [{ productId: "pX", quantity: 5 }];
    const product = { stock: 40, lockedStock: 1 };
    let currentLocked = product.lockedStock;

    const txMock = {
      orderItem: { findMany: vi.fn().mockResolvedValue(items) },
      product: {
        findUnique: vi.fn().mockResolvedValue({ stock: 40, lockedStock: currentLocked }),
        update: vi.fn().mockImplementation(async ({ data }: any) => {
          currentLocked = data.lockedStock;
        }),
      },
      inventoryLog: { create: vi.fn().mockResolvedValue({}) },
      order: { update: vi.fn().mockResolvedValue({}) },
    };
    (prisma.$transaction as any).mockImplementation(async (cb: any) => cb(txMock));

    await cleanupExpiredOrders();

    // Math.max(0, 1-5) = 0，不低于 0
    expect(currentLocked).toBe(0);
  });

  it("商品不存在时跳过该商品（不报错）", async () => {
    (prisma.order.findMany as any).mockResolvedValue([{ id: "order-3" }]);
    const items: ItemRow[] = [{ productId: "ghost", quantity: 2 }];

    const txMock = {
      orderItem: { findMany: vi.fn().mockResolvedValue(items) },
      product: {
        findUnique: vi.fn().mockResolvedValue(null), // 商品不存在
        update: vi.fn(),
      },
      inventoryLog: { create: vi.fn() },
      order: { update: vi.fn().mockResolvedValue({}) },
    };
    (prisma.$transaction as any).mockImplementation(async (cb: any) => cb(txMock));

    const n = await cleanupExpiredOrders();
    expect(n).toBe(1);
    expect(txMock.product.update).not.toHaveBeenCalled();
    expect(txMock.inventoryLog.create).not.toHaveBeenCalled();
    // 订单状态仍改 CANCELLED
    expect(txMock.order.update).toHaveBeenCalled();
  });

  it("单次最多清理 200 单（findMany take=200）", async () => {
    (prisma.order.findMany as any).mockResolvedValue([]);
    await cleanupExpiredOrders();
    expect(prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 200 })
    );
  });

  it("findMany 仅查 PENDING_PAYMENT 且 expiresAt <= now", async () => {
    (prisma.order.findMany as any).mockResolvedValue([]);
    await cleanupExpiredOrders();
    const arg = (prisma.order.findMany as any).mock.calls[0][0];
    expect(arg.where.status).toBe(ORDER_STATUS.PENDING_PAYMENT);
    expect(arg.where.expiresAt).toBeDefined();
    expect(arg.where.expiresAt.lte).toBeInstanceOf(Date);
  });
});
