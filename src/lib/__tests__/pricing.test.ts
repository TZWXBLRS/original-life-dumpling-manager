import { describe, it, expect } from "vitest";
import {
  calculatePrice,
  formatYuan,
  PRICE,
  type CartItem,
} from "@/lib/pricing";

// 辅助函数：快速创建购物车
function makeCart(classic: number, specialty: number): CartItem[] {
  const items: CartItem[] = [];
  if (classic > 0) {
    items.push({
      productId: "c1",
      productName: "三鲜饺子",
      category: "CLASSIC",
      quantity: classic,
      unitPrice: PRICE.CLASSIC_UNIT,
    });
  }
  if (specialty > 0) {
    items.push({
      productId: "s1",
      productName: "菌菇饺子",
      category: "SPECIALTY",
      quantity: specialty,
      unitPrice: PRICE.SPECIALTY_UNIT,
    });
  }
  return items;
}

// 辅助：分转元（整数元，方便断言）
const yuan = (fen: number) => fen / 100;

describe("定价算法 - 单盒基础价", () => {
  it("1盒经典 = 33元", () => {
    const r = calculatePrice(makeCart(1, 0));
    expect(yuan(r.goodsAmount)).toBe(33);
    expect(r.classicBoxes).toBe(1);
  });

  it("2盒经典 = 66元", () => {
    const r = calculatePrice(makeCart(2, 0));
    expect(yuan(r.goodsAmount)).toBe(66);
  });

  it("3盒经典 = 99元（无组合优惠）", () => {
    const r = calculatePrice(makeCart(3, 0));
    expect(yuan(r.goodsAmount)).toBe(99);
  });

  it("1盒特色 = 38元", () => {
    const r = calculatePrice(makeCart(0, 1));
    expect(yuan(r.goodsAmount)).toBe(38);
  });

  it("2盒特色 = 76元", () => {
    const r = calculatePrice(makeCart(0, 2));
    expect(yuan(r.goodsAmount)).toBe(76);
  });
});

describe("定价算法 - 规则A（4盒组合）", () => {
  it("4盒经典 = 100元（规则A，特色0）", () => {
    const r = calculatePrice(makeCart(4, 0));
    expect(yuan(r.goodsAmount)).toBe(100);
    expect(r.breakdown.some((b) => b.type === "RULE_A_4")).toBe(true);
  });

  it("3经典 + 1特色 = 110元（规则A）", () => {
    const r = calculatePrice(makeCart(3, 1));
    expect(yuan(r.goodsAmount)).toBe(110);
    const a = r.breakdown.find((b) => b.type === "RULE_A_4");
    expect(a).toBeDefined();
    expect(a!.classicCount).toBe(3);
    expect(a!.specialtyCount).toBe(1);
  });

  it("2经典 + 2特色 = 120元（规则A）", () => {
    const r = calculatePrice(makeCart(2, 2));
    expect(yuan(r.goodsAmount)).toBe(120);
    const a = r.breakdown.find((b) => b.type === "RULE_A_4");
    expect(a).toBeDefined();
    expect(a!.classicCount).toBe(2);
    expect(a!.specialtyCount).toBe(2);
  });

  it("1经典 + 3特色 = 130元（规则A优于B+单价133）", () => {
    const r = calculatePrice(makeCart(1, 3));
    // 规则A(1经+3特=130) vs 规则B(3特=100)+1经单价(33)=133
    // 系统应选 130
    expect(yuan(r.goodsAmount)).toBe(130);
  });

  it("4盒全特色 = 138元（规则B+单价优于规则A的140）", () => {
    const r = calculatePrice(makeCart(0, 4));
    // 规则A(4特=140) vs 规则B(3特=100)+1特单价(38)=138
    // 系统应选 138
    expect(yuan(r.goodsAmount)).toBe(138);
  });
});

describe("定价算法 - 规则B（3盒特色特惠）", () => {
  it("3盒特色 = 100元", () => {
    const r = calculatePrice(makeCart(0, 3));
    expect(yuan(r.goodsAmount)).toBe(100);
    expect(r.breakdown.some((b) => b.type === "RULE_B_3")).toBe(true);
  });
});

describe("定价算法 - 规则C（6盒乐享）", () => {
  it("6盒经典 = 158元（规则C，特色0）", () => {
    const r = calculatePrice(makeCart(6, 0));
    // 规则C(6经=158) vs 规则A+规则A(100+100=200)
    // 系统应选 158
    expect(yuan(r.goodsAmount)).toBe(158);
    expect(r.breakdown.some((b) => b.type === "RULE_C_6")).toBe(true);
  });

  it("5经典 + 1特色 = 158元（规则C，特色≤2不加价）", () => {
    const r = calculatePrice(makeCart(5, 1));
    expect(yuan(r.goodsAmount)).toBe(158);
  });

  it("4经典 + 2特色 = 158元（规则C，特色=2不加价）", () => {
    const r = calculatePrice(makeCart(4, 2));
    // 规则C(4经+2特=158) vs 规则A(4经=100)+2特单价(76)=176
    // 系统应选 158
    expect(yuan(r.goodsAmount)).toBe(158);
  });

  it("3经典 + 3特色 = 168元（规则C，特色=3加¥10）", () => {
    const r = calculatePrice(makeCart(3, 3));
    expect(yuan(r.goodsAmount)).toBe(168);
  });

  it("2经典 + 4特色 = 178元（规则C，特色=4加¥20）", () => {
    const r = calculatePrice(makeCart(2, 4));
    // 规则C(2经+4特=178) vs 规则A(2经+2特=120)+2特单价(76)=196
    // 系统应选 178
    expect(yuan(r.goodsAmount)).toBe(178);
  });

  it("1经典 + 5特色 = 188元（规则C，特色=5加¥30）", () => {
    const r = calculatePrice(makeCart(1, 5));
    expect(yuan(r.goodsAmount)).toBe(188);
  });

  it("6盒全特色 = 198元（规则C，特色=6加¥40）", () => {
    const r = calculatePrice(makeCart(0, 6));
    // 规则C(6特=198) vs 规则B+规则B(100+100=200)
    // 系统应选 198
    expect(yuan(r.goodsAmount)).toBe(198);
  });
});

describe("定价算法 - 多盒叠加（规则E）", () => {
  it("5盒经典 = 133元（规则A 100 + 1盒单价 33）", () => {
    const r = calculatePrice(makeCart(5, 0));
    expect(yuan(r.goodsAmount)).toBe(133);
  });

  it("7盒经典 = 191元（规则C 158 + 1盒单价 33）", () => {
    const r = calculatePrice(makeCart(7, 0));
    expect(yuan(r.goodsAmount)).toBe(191);
  });

  it("8盒经典 = 200元（规则A + 规则A = 100×2）", () => {
    const r = calculatePrice(makeCart(8, 0));
    // 规则A+A(200) vs 规则C+2单价(158+66=224)
    // 系统应选 200
    expect(yuan(r.goodsAmount)).toBe(200);
  });

  it("4经典 + 4特色 = 234元（规则C 158 + 2特色单价 76）", () => {
    const r = calculatePrice(makeCart(4, 4));
    // 规则C(4经+2特=158) + 2特单价(76) = 234
    expect(yuan(r.goodsAmount)).toBe(234);
  });

  it("3经典 + 2特色 = 153元（规则A 110 + 2特色单价 76 → 实际更优）", () => {
    // PRD速查表：3经+2特 = 153（规则A+单价）
    // 规则A(3经+1特=110) + 1特单价(38) = 148? 不对
    // 实际：规则A(2经+2特=120) + 1经单价(33) = 153
    // 或规则A(3经+1特=110) + 1特单价(38) = 148 ← 更优
    // DP会选148
    const r = calculatePrice(makeCart(3, 2));
    expect(yuan(r.goodsAmount)).toBe(148);
  });
});

describe("定价算法 - 泡沫箱费（仅快递）", () => {
  it("自取 - 无泡沫箱费", () => {
    const r = calculatePrice(makeCart(10, 0), "PICKUP");
    expect(r.foamBoxAmount).toBe(0);
    expect(r.foamBoxCount).toBe(0);
  });

  it("闪送 - 无泡沫箱费", () => {
    const r = calculatePrice(makeCart(10, 0), "EXPRESS");
    expect(r.foamBoxAmount).toBe(0);
    expect(r.foamBoxCount).toBe(0);
  });

  it("快递 5盒以内 = 泡沫箱1个 = 5元", () => {
    const r1 = calculatePrice(makeCart(1, 0), "DELIVERY");
    expect(r1.foamBoxCount).toBe(1);
    expect(yuan(r1.foamBoxAmount)).toBe(5);

    const r5 = calculatePrice(makeCart(3, 2), "DELIVERY"); // 合计5盒
    expect(r5.foamBoxCount).toBe(1);
    expect(yuan(r5.foamBoxAmount)).toBe(5);
  });

  it("快递 6-10盒 = 泡沫箱2个 = 10元", () => {
    const r6 = calculatePrice(makeCart(4, 2), "DELIVERY"); // 6盒
    expect(r6.foamBoxCount).toBe(2);
    expect(yuan(r6.foamBoxAmount)).toBe(10);

    const r10 = calculatePrice(makeCart(6, 4), "DELIVERY"); // 10盒
    expect(r10.foamBoxCount).toBe(2);
    expect(yuan(r10.foamBoxAmount)).toBe(10);
  });

  it("快递 11盒 = 泡沫箱3个 = 15元", () => {
    const r = calculatePrice(makeCart(11, 0), "DELIVERY");
    expect(r.foamBoxCount).toBe(3);
    expect(yuan(r.foamBoxAmount)).toBe(15);
  });

  it("订单总金额 = 商品金额 + 泡沫箱费", () => {
    // 4盒经典=100元，快递1个泡沫箱5元，合计105元
    const r = calculatePrice(makeCart(4, 0), "DELIVERY");
    expect(yuan(r.totalAmount)).toBe(105);
    expect(yuan(r.totalAmount)).toBe(
      yuan(r.goodsAmount) + yuan(r.foamBoxAmount)
    );
  });
});

describe("定价算法 - 边界情况", () => {
  it("空购物车 = 0元", () => {
    const r = calculatePrice([]);
    expect(r.totalAmount).toBe(0);
    expect(r.breakdown.length).toBe(0);
  });

  it("breakdown 盒数统计应等于总盒数", () => {
    const cart = makeCart(7, 5); // 12盒
    const r = calculatePrice(cart);
    const cInBD = r.breakdown.reduce(
      (s, b) => s + b.classicCount * b.count,
      0
    );
    const sInBD = r.breakdown.reduce(
      (s, b) => s + b.specialtyCount * b.count,
      0
    );
    expect(cInBD).toBe(7);
    expect(sInBD).toBe(5);
  });

  it("breakdown 金额合计应等于 goodsAmount", () => {
    const cart = makeCart(4, 4);
    const r = calculatePrice(cart);
    const sum = r.breakdown.reduce((s, b) => s + b.subtotal, 0);
    expect(sum).toBe(r.goodsAmount);
  });

  it("高峰期100盒也能正确计算（性能检查）", () => {
    const cart = makeCart(80, 20); // 100盒
    const start = Date.now();
    const r = calculatePrice(cart);
    const elapsed = Date.now() - start;
    // 应该在1秒内完成
    expect(elapsed).toBeLessThan(1000);
    expect(r.totalBoxes).toBe(100);
    // breakdown 验证
    const cInBD = r.breakdown.reduce(
      (s, b) => s + b.classicCount * b.count,
      0
    );
    const sInBD = r.breakdown.reduce(
      (s, b) => s + b.specialtyCount * b.count,
      0
    );
    expect(cInBD).toBe(80);
    expect(sInBD).toBe(20);
  });
});

describe("formatYuan 工具函数", () => {
  it("整数元正常显示", () => {
    expect(formatYuan(10000)).toBe("100.00");
  });
  it("零元正常显示", () => {
    expect(formatYuan(0)).toBe("0.00");
  });
  it("33元正常", () => {
    expect(formatYuan(3300)).toBe("33.00");
  });
});
