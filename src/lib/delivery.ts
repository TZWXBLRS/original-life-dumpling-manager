/**
 * 快递时效查询与风险校验模块
 *
 * 业务规则：
 *  1. 快递发货时间窗口：每天 18:00 - 20:00
 *  2. 冷冻饺子在泡沫箱+冰袋条件下可保鲜约 1 个晚上
 *  3. 如果预计送达时间超过 1 个晚上（即第2天及以后才能到），建议顾客取消订单
 *  4. 顾客坚持下单需自行承担变质风险
 *  5. 部分偏远地区（海南、新疆、西藏等）快递无法支持
 *
 * 京东快递时效数据：目前使用内置的省份-时效映射表（模拟京东快递到家时间）。
 * 后续可对接京东物流开放API获取实时时效。
 */

import { getNextDeliveryWindow } from "./frozen-check";

// ============ 常量 ============

/** 冷冻饺子在泡沫箱中的安全保鲜时长（晚/夜） */
export const MAX_SAFE_NIGHTS = 1;

// ============ 类型定义 ============

export type DeliveryRiskLevel = "SAFE" | "WARNING" | "UNSUPPORTED";

export interface DeliveryETARequest {
  province: string;
  city?: string;
  shipDate?: Date; // 发货日期（默认今天发货窗口）
}

export interface DeliveryETAResult {
  /** 是否支持快递到该地区 */
  supported: boolean;
  /** 预计送达天数（从发货日起算，1=次日达，2=隔日达...） */
  deliveryDays: number;
  /** 预计送达日期 */
  estimatedArrival: Date | null;
  /** 在途过夜数（饺子在泡沫箱中度过几个晚上） */
  nightsInTransit: number;
  /** 风险等级 */
  riskLevel: DeliveryRiskLevel;
  /** 风险提示信息 */
  warning: string;
  /** 是否建议取消订单 */
  recommendCancel: boolean;
  /** 发货日期 */
  shipDate: Date | null;
}

// ============ 省份时效数据（模拟京东快递时效） ============

/**
 * 京东快递各省送达时效（天）
 * 1 = 次日达（发货后第二天到）
 * 2 = 隔日达（发货后第三天到）
 * 3+ = 多日达
 *
 * 数据基于京东物流常规时效估算，后续可接入实时API。
 */
const PROVINCE_DELIVERY_DAYS: Record<string, number> = {
  // 华北 - 次日达
  "北京": 1,
  "天津": 1,
  "河北": 1,
  "山西": 2,
  "内蒙古": 2,

  // 华东 - 次日达/隔日达
  "上海": 1,
  "江苏": 1,
  "浙江": 1,
  "安徽": 2,
  "福建": 2,
  "江西": 2,
  "山东": 1,

  // 华中 - 隔日达
  "河南": 2,
  "湖北": 2,
  "湖南": 2,

  // 华南 - 隔日达/多日达
  "广东": 2,
  "广西": 3,
  "海南": -1, // 不支持（距离太远，超过保鲜期）

  // 东北 - 隔日达
  "辽宁": 2,
  "吉林": 2,
  "黑龙江": 3,

  // 西南 - 多日达
  "重庆": 2,
  "四川": 2,
  "贵州": 3,
  "云南": 3,
  "西藏": -1, // 不支持

  // 西北 - 多日达/不支持
  "陕西": 2,
  "甘肃": 3,
  "青海": 3,
  "宁夏": 3,
  "新疆": -1, // 不支持
};

/** 不支持快递的地区 */
export const UNSUPPORTED_REGIONS = Object.entries(PROVINCE_DELIVERY_DAYS)
  .filter(([, days]) => days === -1)
  .map(([prov]) => prov);

// ============ 核心函数 ============

/**
 * 根据省份查询京东快递预计送达天数
 * @returns 天数，-1 表示不支持
 */
export function getDeliveryDays(province: string): number {
  // 精确匹配
  if (PROVINCE_DELIVERY_DAYS[province] !== undefined) {
    return PROVINCE_DELIVERY_DAYS[province];
  }

  // 模糊匹配（去掉"省"、"市"、"自治区"等后缀）
  const normalized = province
    .replace(/省|市|自治区|壮族|回族|维吾尔|特别行政区/g, "");
  for (const [key, days] of Object.entries(PROVINCE_DELIVERY_DAYS)) {
    if (key.includes(normalized) || normalized.includes(key)) {
      return days;
    }
  }

  // 未知省份默认3天
  return 3;
}

/**
 * 查询快递时效与风险
 *
 * @param province 收货省份
 * @param city 收货城市（可选，暂未影响时效）
 * @param shipDate 发货日期（可选，默认为今天/明天的发货窗口）
 */
export function queryDeliveryETA(
  params: DeliveryETARequest
): DeliveryETAResult {
  const { province, city } = params;

  // 确定发货日期：默认使用下一个发货窗口的开始时间
  const shipDate = params.shipDate ?? getNextDeliveryWindow().start;

  const deliveryDays = getDeliveryDays(province);

  // 不支持的地区
  if (deliveryDays === -1) {
    return {
      supported: false,
      deliveryDays: -1,
      estimatedArrival: null,
      nightsInTransit: -1,
      riskLevel: "UNSUPPORTED",
      warning: `抱歉，${province}地区暂不支持快递配送。冷冻饺子在运输途中保鲜时间有限，无法保证品质。建议选择自取或闪送方式。`,
      recommendCancel: true,
      shipDate,
    };
  }

  // 计算预计送达日期
  // deliveryDays=1 表示次日达（发货后第2天到达）
  // 发货当晚 = 第1晚
  // 次日达：发货今晚 → 明天到 → 在途1晚
  // 隔日达：发货今晚 → 后天到 → 在途2晚
  // 多日达：发货今晚 → 大后天到 → 在途3晚
  const estimatedArrival = new Date(shipDate);
  estimatedArrival.setDate(estimatedArrival.getDate() + deliveryDays);

  // 在途过夜数 = deliveryDays（发货当晚算第1晚）
  const nightsInTransit = deliveryDays;

  // 评估风险
  let riskLevel: DeliveryRiskLevel;
  let warning: string;
  let recommendCancel = false;

  if (nightsInTransit <= MAX_SAFE_NIGHTS) {
    riskLevel = "SAFE";
    const dayDesc = deliveryDays === 1 ? "次日" : deliveryDays + "天后";
    warning =
      "预计" + dayDesc + "送达（" +
      estimatedArrival.toLocaleDateString("zh-CN") +
      "），在途" + nightsInTransit + "晚，品质有保障。";
  } else {
    // 超过1晚，有变质风险
    riskLevel = "WARNING";
    recommendCancel = true;
    warning =
      "⚠️ 预计" + deliveryDays + "天后送达（" +
      estimatedArrival.toLocaleDateString("zh-CN") +
      "），饺子在途将度过" + nightsInTransit +
      "晚。冷冻饺子泡沫箱+冰袋保鲜期约" + MAX_SAFE_NIGHTS +
      "晚，超过后可能解冻变质。";
    warning +=
      "\n\n建议取消订单或改用自取/闪送。如坚持下单，因运输超时导致的品质问题需顾客自行承担。";
  }

  return {
    supported: true,
    deliveryDays,
    estimatedArrival,
    nightsInTransit,
    riskLevel,
    warning,
    recommendCancel,
    shipDate,
  };
}

/**
 * 获取所有省份的快递时效列表（用于后台配置/展示）
 */
export function getAllProvinceDeliveryInfo(): Array<{
  province: string;
  deliveryDays: number;
  supported: boolean;
  riskLevel: DeliveryRiskLevel;
}> {
  return Object.entries(PROVINCE_DELIVERY_DAYS)
    .map(([province, days]) => {
      let riskLevel: DeliveryRiskLevel;
      if (days === -1) riskLevel = "UNSUPPORTED";
      else if (days <= MAX_SAFE_NIGHTS) riskLevel = "SAFE";
      else riskLevel = "WARNING";

      return {
        province,
        deliveryDays: days,
        supported: days !== -1,
        riskLevel,
      };
    })
    .sort((a, b) => a.deliveryDays - b.deliveryDays);
}
