/**
 * 定价核心算法 - 冷冻饺子订购系统
 *
 * 优惠规则（系统自动计算最优组合）：
 *  规则A·4盒组合: ¥100 + 特色盒数 × ¥10（任意搭配，经典特色任意比例）
 *  规则B·3盒特色: ¥100（三盒特惠）
 *  规则C·6盒乐享: ¥158 + max(0, 特色盒数 − 2) × ¥10
 *  单盒: 经典 ¥33，特色 ¥38
 *
 * 所有价格均包含打包费。
 * 泡沫箱费（仅快递）：¥5/个，每箱装5盒，向上取整
 *
 * 本算法使用记忆化搜索，穷举所有可能的组合方式（规则A/B/C可重复使用），
 * 保证返回的总价对顾客是最优的（最低价格）。
 */

// ============ 常量定义（单位：分） ============

export const PRICE = {
  CLASSIC_UNIT: 3300,     // 经典单盒 33元
  SPECIALTY_UNIT: 3800,   // 特色单盒 38元
  RULE_A_BASE: 10000,       // 规则A 4盒基础价 100元
  RULE_A_SPECIALTY_EXTRA: 1000, // 规则A 每盒特色加价 10元
  RULE_B_SPECIALTY_3: 10000,  // 规则B 3盒特色 100元
  RULE_C_BASE: 15800,       // 规则C 6盒基础价 158元
  RULE_C_SPECIALTY_THRESHOLD: 2, // 规则C 特色免加价阈值（≤2盒不加价）
  RULE_C_SPECIALTY_EXTRA: 1000,  // 规则C 超过阈值后每盒加价 10元
  FOAM_BOX_UNIT: 500,     // 泡沫箱 5元/个
  FOAM_BOX_CAPACITY: 5,   // 每个泡沫箱装5盒
} as const;

// ============ 类型定义 ============

export type ProductCategory = "CLASSIC" | "SPECIALTY";

export interface CartItem {
  productId: string;
  productName: string;
  category: ProductCategory;
  quantity: number;
  unitPrice: number; // 数据库中的单价（分）
}

export interface PriceBreakdown {
  /** 组合类型 */
  type:
    | "RULE_A_4"             // 规则A 4盒组合（任意搭配）
    | "RULE_B_3"             // 规则B 3盒特色特惠
    | "RULE_C_6"             // 规则C 6盒乐享
    | "CLASSIC_UNIT"         // 经典单盒
    | "SPECIALTY_UNIT";      // 特色单盒
  /** 该组合包含的经典盒数 */
  classicCount: number;
  /** 该组合包含的特色盒数 */
  specialtyCount: number;
  /** 单价（每个组合的价格，分） */
  unitPrice: number;
  /** 该组合的数量（有几个这样的组合） */
  count: number;
  /** 小计（分） */
  subtotal: number;
  /** 人类可读描述 */
  description: string;
}

export interface PricingResult {
  /** 总盒数 */
  totalBoxes: number;
  /** 经典总盒数 */
  classicBoxes: number;
  /** 特色总盒数 */
  specialtyBoxes: number;
  /** 商品金额（不含泡沫箱费，分） */
  goodsAmount: number;
  /** 泡沫箱费用（仅快递有，分） */
  foamBoxAmount: number;
  /** 泡沫箱个数 */
  foamBoxCount: number;
  /** 订单总金额（分）= goodsAmount + foamBoxAmount */
  totalAmount: number;
  /** 费用明细 */
  breakdown: PriceBreakdown[];
}

// ============ 核心算法：最优商品价格计算 ============

/**
 * 记忆化搜索的状态缓存
 * key = `${classicLeft},${specialtyLeft}`
 * value = { minPrice, breakdown: 当前步骤选择的组合 }
 */
interface MemoResult {
  minPrice: number;
  choices: Array<{
    type: PriceBreakdown["type"];
    c: number;
    s: number;
    price: number;
  }>;
}

function dpSearch(
  cLeft: number,
  sLeft: number,
  memo: Map<string, MemoResult>
): MemoResult {
  // 基准情形：都分配完了
  if (cLeft === 0 && sLeft === 0) {
    return { minPrice: 0, choices: [] };
  }

  const key = `${cLeft},${sLeft}`;
  if (memo.has(key)) return memo.get(key)!;

  let best: MemoResult = { minPrice: Infinity, choices: [] };

  const tryChoice = (
    type: PriceBreakdown["type"],
    useC: number,
    useS: number,
    price: number
  ) => {
    if (useC > cLeft || useS > sLeft) return; // 盒数不够
    const rest = dpSearch(cLeft - useC, sLeft - useS, memo);
    const total = price + rest.minPrice;
    if (total < best.minPrice) {
      best = {
        minPrice: total,
        choices: [
          { type, c: useC, s: useS, price },
          ...rest.choices,
        ],
      };
    }
  };

  // ========= 枚举所有可用的组合选项 =========

  // 选项1：单盒经典（保底选项，任何时候都适用）
  if (cLeft >= 1) {
    tryChoice("CLASSIC_UNIT", 1, 0, PRICE.CLASSIC_UNIT);
  }
  // 选项2：单盒特色（保底选项）
  if (sLeft >= 1) {
    tryChoice("SPECIALTY_UNIT", 0, 1, PRICE.SPECIALTY_UNIT);
  }
  // 选项3：规则B - 3盒特色特惠 ¥100
  if (sLeft >= 3) {
    tryChoice("RULE_B_3", 0, 3, PRICE.RULE_B_SPECIALTY_3);
  }
  // 选项4：规则A - 4盒组合（任意搭配，特色盒数0~3）
  // 价格 = ¥100 + 特色盒数 × ¥10
  if (cLeft + sLeft >= 4) {
    for (let sInA = 0; sInA <= 3; sInA++) {
      const cInA = 4 - sInA;
      if (sInA <= sLeft && cInA <= cLeft) {
        const price = PRICE.RULE_A_BASE + sInA * PRICE.RULE_A_SPECIALTY_EXTRA;
        tryChoice("RULE_A_4", cInA, sInA, price);
      }
    }
  }
  // 选项5：规则C - 6盒乐享
  // 价格 = ¥158 + max(0, 特色盒数 − 2) × ¥10
  if (cLeft + sLeft >= 6) {
    for (let sInC = 0; sInC <= 6; sInC++) {
      const cInC = 6 - sInC;
      if (sInC <= sLeft && cInC <= cLeft) {
        const extra = Math.max(0, sInC - PRICE.RULE_C_SPECIALTY_THRESHOLD);
        const price = PRICE.RULE_C_BASE + extra * PRICE.RULE_C_SPECIALTY_EXTRA;
        tryChoice("RULE_C_6", cInC, sInC, price);
      }
    }
  }

  memo.set(key, best);
  return best;
}

/**
 * 汇总 choices，合并相同组合类型，生成人类可读的 breakdown
 */
function aggregateBreakdown(
  choices: MemoResult["choices"]
): PriceBreakdown[] {
  // 聚合同类型同配置
  const groupMap = new Map<
    string,
    {
      type: PriceBreakdown["type"];
      c: number;
      s: number;
      unitPrice: number;
      count: number;
    }
  >();

  for (const ch of choices) {
    const k = `${ch.type}|${ch.c}|${ch.s}|${ch.price}`;
    if (!groupMap.has(k)) {
      groupMap.set(k, {
        type: ch.type,
        c: ch.c,
        s: ch.s,
        unitPrice: ch.price,
        count: 0,
      });
    }
    groupMap.get(k)!.count++;
  }

  const result: PriceBreakdown[] = [];
  // 按优先级排序：大组合在前，单盒在后
  const typePriority: Record<PriceBreakdown["type"], number> = {
    RULE_C_6: 1,
    RULE_A_4: 2,
    RULE_B_3: 3,
    CLASSIC_UNIT: 4,
    SPECIALTY_UNIT: 5,
  };

  for (const g of [...groupMap.values()].sort(
    (a, b) => typePriority[a.type] - typePriority[b.type]
  )) {
    let description = "";
    switch (g.type) {
      case "RULE_A_4":
        description = g.s === 0
          ? `特惠套餐A·4盒组合（4经典）`
          : `特惠套餐A·4盒组合（${g.c}经典+${g.s}特色）`;
        break;
      case "RULE_B_3":
        description = `特惠套餐B·3盒特色`;
        break;
      case "RULE_C_6":
        description = g.s === 0
          ? `特惠套餐C·6盒乐享（6经典）`
          : `特惠套餐C·6盒乐享（${g.c}经典+${g.s}特色）`;
        break;
      case "CLASSIC_UNIT":
        description = `经典单盒`;
        break;
      case "SPECIALTY_UNIT":
        description = `特色单盒`;
        break;
    }

    result.push({
      type: g.type,
      classicCount: g.c,
      specialtyCount: g.s,
      unitPrice: g.unitPrice,
      count: g.count,
      subtotal: g.unitPrice * g.count,
      description,
    });
  }

  return result;
}

// ============ 对外接口 ============

/**
 * 计算购物车的最优价格
 * @param items 购物车条目列表
 * @param deliveryType 配送方式：自取/快递/闪送（快递需要计算泡沫箱费）
 */
export function calculatePrice(
  items: CartItem[],
  deliveryType: "PICKUP" | "DELIVERY" | "EXPRESS" = "PICKUP"
): PricingResult {
  // 1. 统计经典 & 特色盒数
  let classicBoxes = 0;
  let specialtyBoxes = 0;
  for (const it of items) {
    if (it.category === "CLASSIC") classicBoxes += it.quantity;
    else specialtyBoxes += it.quantity;
  }
  const totalBoxes = classicBoxes + specialtyBoxes;

  // 空购物车
  if (totalBoxes === 0) {
    return {
      totalBoxes: 0,
      classicBoxes: 0,
      specialtyBoxes: 0,
      goodsAmount: 0,
      foamBoxAmount: 0,
      foamBoxCount: 0,
      totalAmount: 0,
      breakdown: [],
    };
  }

  // 2. 运行动态规划计算最优商品价
  const memo = new Map<string, MemoResult>();
  const result = dpSearch(classicBoxes, specialtyBoxes, memo);

  if (result.minPrice === Infinity) {
    // 理论上不可能（因为单盒选项保底），这里加个安全回退
    const fallback =
      classicBoxes * PRICE.CLASSIC_UNIT +
      specialtyBoxes * PRICE.SPECIALTY_UNIT;
    return {
      totalBoxes,
      classicBoxes,
      specialtyBoxes,
      goodsAmount: fallback,
      foamBoxAmount: 0,
      foamBoxCount: 0,
      totalAmount: fallback,
      breakdown: [
        classicBoxes > 0
          ? {
              type: "CLASSIC_UNIT",
              classicCount: 1,
              specialtyCount: 0,
              unitPrice: PRICE.CLASSIC_UNIT,
              count: classicBoxes,
              subtotal: classicBoxes * PRICE.CLASSIC_UNIT,
              description: "经典单盒",
            }
          : null,
        specialtyBoxes > 0
          ? {
              type: "SPECIALTY_UNIT",
              classicCount: 0,
              specialtyCount: 1,
              unitPrice: PRICE.SPECIALTY_UNIT,
              count: specialtyBoxes,
              subtotal: specialtyBoxes * PRICE.SPECIALTY_UNIT,
              description: "特色单盒",
            }
          : null,
      ].filter(Boolean) as PriceBreakdown[],
    };
  }

  const goodsAmount = result.minPrice;
  const breakdown = aggregateBreakdown(result.choices);

  // 3. 泡沫箱费（仅快递）
  let foamBoxCount = 0;
  let foamBoxAmount = 0;
  if (deliveryType === "DELIVERY") {
    foamBoxCount = Math.ceil(totalBoxes / PRICE.FOAM_BOX_CAPACITY);
    foamBoxAmount = foamBoxCount * PRICE.FOAM_BOX_UNIT;
  }

  return {
    totalBoxes,
    classicBoxes,
    specialtyBoxes,
    goodsAmount,
    foamBoxAmount,
    foamBoxCount,
    totalAmount: goodsAmount + foamBoxAmount,
    breakdown,
  };
}

// ============ 辅助工具 ============

/**
 * 分 → 元字符串（用于显示）
 */
export function formatYuan(fen: number): string {
  return (fen / 100).toFixed(2);
}

// ============ 纯函数工具 ============

/**
 * 计算单类商品的最优价格（简化版，用于快速估算）
 * 不含混拼逻辑，仅计算纯经典或纯特色的最优价
 * @param qty 盒数
 * @param category 商品类别
 * @returns 最优价格（分）
 */
export function calcPrice(qty: number, category: ProductCategory): number {
  if (qty <= 0) return 0;
  if (category === "CLASSIC") {
    // 规则A(4盒¥100)优先，规则C(6盒¥158)优先，剩余单盒¥33
    const r = calculatePrice([
      { productId: "c", productName: "", category: "CLASSIC", quantity: qty, unitPrice: PRICE.CLASSIC_UNIT },
    ]);
    return r.goodsAmount;
  } else {
    // 规则B(3盒¥100)优先，规则C(6盒¥198)，剩余单盒¥38
    const r = calculatePrice([
      { productId: "s", productName: "", category: "SPECIALTY", quantity: qty, unitPrice: PRICE.SPECIALTY_UNIT },
    ]);
    return r.goodsAmount;
  }
}
