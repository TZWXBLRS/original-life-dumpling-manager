import { NextResponse } from "next/server";
import { cleanupExpiredOrders } from "@/lib/order-cleanup";

/**
 * 清理超时未支付订单的定时任务端点
 * GET /api/cron/cleanup-expired-orders
 *
 * 建议通过外部定时器（cron / 宿主机 crontab / Docker healthcheck 脚本）
 * 每分钟调用一次，主动释放超时订单占用的锁定库存。
 *
 * 注意：下单 API 已内置惰性清理，本端点为兜底，确保即使无新订单进入
 * 也能及时释放库存。
 */
export async function GET() {
  try {
    const cleaned = await cleanupExpiredOrders();
    return NextResponse.json({ ok: true, cleaned });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "清理失败" },
      { status: 500 }
    );
  }
}
