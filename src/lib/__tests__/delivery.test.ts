import { describe, it, expect } from "vitest";
import {
  queryDeliveryETA,
  getDeliveryDays,
  getAllProvinceDeliveryInfo,
  UNSUPPORTED_REGIONS,
  MAX_SAFE_NIGHTS,
} from "@/lib/delivery";

describe("delivery - 各省份快递时效", () => {
  it("北京 = 1天（次日达）", () => {
    expect(getDeliveryDays("北京")).toBe(1);
  });

  it("上海 = 1天（次日达）", () => {
    expect(getDeliveryDays("上海")).toBe(1);
  });

  it("河南 = 2天（隔日达）", () => {
    expect(getDeliveryDays("河南")).toBe(2);
  });

  it("海南 = -1（不支持）", () => {
    expect(getDeliveryDays("海南")).toBe(-1);
  });

  it("新疆 = -1（不支持）", () => {
    expect(getDeliveryDays("新疆")).toBe(-1);
  });

  it("西藏 = -1（不支持）", () => {
    expect(getDeliveryDays("西藏")).toBe(-1);
  });

  it("模糊匹配：北京市 → 1天", () => {
    expect(getDeliveryDays("北京市")).toBe(1);
  });

  it("模糊匹配：河北省 → 1天", () => {
    expect(getDeliveryDays("河北省")).toBe(1);
  });

  it("模糊匹配：广西壮族自治区 → 3天", () => {
    expect(getDeliveryDays("广西壮族自治区")).toBe(3);
  });

  it("未知省份默认3天", () => {
    expect(getDeliveryDays("某个不存在的省")).toBe(3);
  });

  it("不支持地区列表包含海南、新疆、西藏", () => {
    expect(UNSUPPORTED_REGIONS).toContain("海南");
    expect(UNSUPPORTED_REGIONS).toContain("新疆");
    expect(UNSUPPORTED_REGIONS).toContain("西藏");
  });
});

describe("delivery - 快递时效查询 queryDeliveryETA", () => {
  it("北京（次日达）→ SAFE", () => {
    const result = queryDeliveryETA({ province: "北京" });
    expect(result.supported).toBe(true);
    expect(result.deliveryDays).toBe(1);
    expect(result.nightsInTransit).toBe(1);
    expect(result.riskLevel).toBe("SAFE");
    expect(result.recommendCancel).toBe(false);
    expect(result.estimatedArrival).not.toBeNull();
  });

  it("河南（隔日达，2晚）→ WARNING（超过1晚）", () => {
    const result = queryDeliveryETA({ province: "河南" });
    expect(result.supported).toBe(true);
    expect(result.deliveryDays).toBe(2);
    expect(result.nightsInTransit).toBe(2);
    expect(result.riskLevel).toBe("WARNING");
    expect(result.recommendCancel).toBe(true);
  });

  it("广西（3天）→ WARNING（超过1晚）", () => {
    const result = queryDeliveryETA({ province: "广西" });
    expect(result.supported).toBe(true);
    expect(result.deliveryDays).toBe(3);
    expect(result.nightsInTransit).toBe(3);
    expect(result.riskLevel).toBe("WARNING");
    expect(result.recommendCancel).toBe(true);
    expect(result.warning).toContain("建议取消");
  });

  it("云南（3天）→ WARNING", () => {
    const result = queryDeliveryETA({ province: "云南" });
    expect(result.riskLevel).toBe("WARNING");
    expect(result.recommendCancel).toBe(true);
  });

  it("海南 → UNSUPPORTED", () => {
    const result = queryDeliveryETA({ province: "海南" });
    expect(result.supported).toBe(false);
    expect(result.riskLevel).toBe("UNSUPPORTED");
    expect(result.recommendCancel).toBe(true);
    expect(result.estimatedArrival).toBeNull();
    expect(result.warning).toContain("海南");
  });

  it("新疆 → UNSUPPORTED", () => {
    const result = queryDeliveryETA({ province: "新疆" });
    expect(result.supported).toBe(false);
    expect(result.riskLevel).toBe("UNSUPPORTED");
  });

  it("预计送达日期 = 发货日期 + deliveryDays", () => {
    const shipDate = new Date("2026-08-13T18:00:00");
    const result = queryDeliveryETA({ province: "北京", shipDate });
    expect(result.estimatedArrival).not.toBeNull();
    // 北京次日达：8月13日发货 → 8月14日到
    expect(result.estimatedArrival!.getDate()).toBe(14);
  });

  it("风险提示包含在途过夜数", () => {
    const result = queryDeliveryETA({ province: "广西" });
    expect(result.warning).toContain("3晚");
    expect(result.warning).toContain(MAX_SAFE_NIGHTS + "晚");
  });
});

describe("delivery - 全省时效列表", () => {
  it("getAllProvinceDeliveryInfo 返回所有省份", () => {
    const list = getAllProvinceDeliveryInfo();
    expect(list.length).toBeGreaterThan(20);
    // 应该包含北京
    const beijing = list.find((p) => p.province === "北京");
    expect(beijing).toBeDefined();
    expect(beijing!.supported).toBe(true);
  });

  it("不支持省份在列表中标记为 unsupported", () => {
    const list = getAllProvinceDeliveryInfo();
    const hainan = list.find((p) => p.province === "海南");
    expect(hainan).toBeDefined();
    expect(hainan!.supported).toBe(false);
    expect(hainan!.riskLevel).toBe("UNSUPPORTED");
  });

  it("列表按送达天数排序（快的在前）", () => {
    const list = getAllProvinceDeliveryInfo();
    const supported = list.filter((p) => p.supported);
    for (let i = 1; i < supported.length; i++) {
      expect(supported[i].deliveryDays).toBeGreaterThanOrEqual(
        supported[i - 1].deliveryDays
      );
    }
  });
});
