import { NextRequest, NextResponse } from "next/server";
import { queryDeliveryETA, getAllProvinceDeliveryInfo } from "@/lib/delivery";

/**
 * 快递时效查询 API
 *
 * GET /api/delivery/eta?province=北京
 *   → 返回该省份的快递时效和风险等级
 *
 * GET /api/delivery/eta?list=all
 *   → 返回所有省份的快递时效列表
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // 列出所有省份时效
  if (searchParams.get("list") === "all") {
    const list = getAllProvinceDeliveryInfo();
    return NextResponse.json({ provinces: list });
  }

  const province = searchParams.get("province");
  const city = searchParams.get("city") || undefined;

  if (!province) {
    return NextResponse.json(
      { error: "缺少 province 参数" },
      { status: 400 }
    );
  }

  const result = queryDeliveryETA({ province, city });

  return NextResponse.json({
    province,
    ...result,
    estimatedArrival: result.estimatedArrival?.toISOString() ?? null,
    shipDate: result.shipDate?.toISOString() ?? null,
  });
}
