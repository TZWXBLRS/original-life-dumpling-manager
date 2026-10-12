import { describe, it, expect } from "vitest";
import { calculatePrice, PRICE, type CartItem } from "@/lib/pricing";

/**
 * pricing.ts 泡沫箱配置覆盖测试
 *
 * 覆盖库存链路变更矛盾5：calculatePrice 新增 foamBoxConfig 可选参数，
 * 后台 SystemConfig 中的 FOAM_BOX_PRICE / FOAM_BOX_CAPACITY 可覆盖默认常量。
 */

// 辅助：构建经典口味购物车
function makeClassicCart(n: number): CartItem[] {
  return [
    {
      productId: "c1",
      productName: "三鲜饺子",
      category: "CLASSIC",
      quantity: n,
      unitPrice: PRICE.CLASSIC_UNIT,
    },
  ];
}

const yuan = (fen: number) => fen / 100;

describe("calculatePrice - 泡沫箱配置默认值", () => {
  it("自取订单不计泡沫箱费", () => {
    const r = calculatePrice(makeClassicCart(6), "PICKUP");
    expect(r.foamBoxCount).toBe(0);
    expect(r.foamBoxAmount).toBe(0);
  });

  it("闪送订单不计泡沫箱费（PRD：闪送无泡沫箱费）", () => {
    const r = calculatePrice(makeClassicCart(6), "EXPRESS");
    expect(r.foamBoxCount).toBe(0);
    expect(r.foamBoxAmount).toBe(0);
  });

  it("快递订单使用默认泡沫箱单价(500分=5元)与容量(5盒)", () => {
    // 6盒 → ceil(6/5)=2 个箱 → 2×500=1000 分
    const r = calculatePrice(makeClassicCart(6), "DELIVERY");
    expect(r.foamBoxCount).toBe(2);
    expect(yuan(r.foamBoxAmount)).toBe(10);
  });

  it("1-5 盒快递订单算 1 个泡沫箱", () => {
    for (const n of [1, 3, 5]) {
      const r = calculatePrice(makeClassicCart(n), "DELIVERY");
      expect(r.foamBoxCount).toBe(1);
      expect(yuan(r.foamBoxAmount)).toBe(5);
    }
  });

  it("6-10 盒快递订单算 2 个泡沫箱", () => {
    for (const n of [6, 8, 10]) {
      const r = calculatePrice(makeClassicCart(n), "DELIVERY");
      expect(r.foamBoxCount).toBe(2);
      expect(yuan(r.foamBoxAmount)).toBe(10);
    }
  });
});

describe("calculatePrice - foamBoxConfig 覆盖默认值", () => {
  it("注入更高单价(800分=8元)时，泡沫箱费按新单价计算", () => {
    // 6盒 → 2 个箱 → 2×800=1600 分
    const r = calculatePrice(makeClassicCart(6), "DELIVERY", {
      unitPrice: 800,
    });
    expect(r.foamBoxCount).toBe(2);
    expect(yuan(r.foamBoxAmount)).toBe(16);
  });

  it("注入更大容量(10盒/箱)时，6盒只需 1 个箱", () => {
    // 6盒 → ceil(6/10)=1 个箱 → 1×500=500 分
    const r = calculatePrice(makeClassicCart(6), "DELIVERY", {
      capacity: 10,
    });
    expect(r.foamBoxCount).toBe(1);
    expect(yuan(r.foamBoxAmount)).toBe(5);
  });

  it("同时覆盖单价与容量时，两者都生效", () => {
    // 12盒 → ceil(12/8)=2 个箱 → 2×300=600 分
    const r = calculatePrice(makeClassicCart(12), "DELIVERY", {
      unitPrice: 300,
      capacity: 8,
    });
    expect(r.foamBoxCount).toBe(2);
    expect(yuan(r.foamBoxAmount)).toBe(6);
  });

  it("注入 unitPrice=0 时按 0 元计费（?? 不拦截 0，是合法配置）", () => {
    // pricing.ts 用 `??` 兜底，0 不属于 null/undefined → 0 生效（免费泡沫箱）
    const r = calculatePrice(makeClassicCart(6), "DELIVERY", {
      unitPrice: 0,
    });
    expect(r.foamBoxCount).toBe(2);
    expect(r.foamBoxAmount).toBe(0);
  });

  it("不传 foamBoxConfig 时退回默认常量", () => {
    const r = calculatePrice(makeClassicCart(6), "DELIVERY");
    expect(r.foamBoxCount).toBe(2);
    expect(yuan(r.foamBoxAmount)).toBe(10);
  });
});

describe("calculatePrice - 泡沫箱不影响商品价", () => {
  it("泡沫箱费不计入 goodsAmount，仅计入 totalAmount", () => {
    const r = calculatePrice(makeClassicCart(6), "DELIVERY");
    // 6盒经典 = 规则C = 158元 = 15800分
    expect(yuan(r.goodsAmount)).toBe(158);
    expect(yuan(r.foamBoxAmount)).toBe(10);
    expect(yuan(r.totalAmount)).toBe(168); // 158 + 10
  });
});
