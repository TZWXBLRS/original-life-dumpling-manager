import { NextResponse } from "next/server";

/**
 * 健康检查端点
 * GET /api/health
 * 供 docker healthcheck / 负载均衡探活使用，不触达数据库以保证低延迟。
 */
export function GET() {
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
}
