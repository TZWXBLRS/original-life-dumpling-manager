"use client";
import { Download } from "lucide-react";

interface OrderItemDetail {
  name: string;
  category: string;
  quantity: number;
}

interface OrderCSVRow {
  orderNo: string;
  pickupCode: string;
  customerName: string;
  customerPhone: string;
  deliveryType: string;
  items: string;
  itemsDetail?: OrderItemDetail[];
  totalBoxes: number;
  totalAmount: number;
  status: string;
  createdAt: string;
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  note: string;
}

const CATEGORY_LABEL: Record<string, string> = {
  CLASSIC: "经典",
  SPECIALTY: "特色",
};

const DETAIL_HEADER = [
  "订单号",
  "取货码",
  "顾客姓名",
  "顾客手机",
  "配送方式",
  "商品明细",
  "总盒数",
  "金额(元)",
  "状态",
  "下单时间",
  "收件人",
  "收件电话",
  "收件地址",
  "备注",
];

/**
 * 汇总当前筛选出的订单：按「类别 → 口味」聚合盒数，并给出分类小计与总计。
 * 输出结构：[类别, 口味, 盒数]
 */
function buildFlavorSummary(orders: OrderCSVRow[]): (string | number)[][] {
  const map = new Map<string, { category: string; name: string; qty: number }>();
  for (const o of orders) {
    for (const it of o.itemsDetail ?? []) {
      const key = `${it.category}__${it.name}`;
      const rec = map.get(key) ?? { category: it.category, name: it.name, qty: 0 };
      rec.qty += it.quantity;
      map.set(key, rec);
    }
  }

  const list = [...map.values()].sort((a, b) => {
    if (a.category !== b.category) return a.category === "CLASSIC" ? -1 : 1;
    return b.qty - a.qty;
  });

  const rows: (string | number)[][] = [["类别", "口味", "盒数"]];
  let classicTotal = 0;
  let specialtyTotal = 0;
  let grandTotal = 0;
  for (const r of list) {
    rows.push([CATEGORY_LABEL[r.category] || r.category, r.name, r.qty]);
    if (r.category === "CLASSIC") classicTotal += r.qty;
    else specialtyTotal += r.qty;
    grandTotal += r.qty;
  }
  rows.push(["小计·经典", "", classicTotal]);
  rows.push(["小计·特色", "", specialtyTotal]);
  rows.push(["总计", "", grandTotal]);
  return rows;
}

export function ExportCSVButton({ orders }: { orders: OrderCSVRow[] }) {
  const handleExport = () => {
    // 动态导入避免 SSR 问题
    import("@/lib/csv-export").then(({ exportMatrixToCSV }) => {
      // 第一页（上半段）：订单明细
      const detailRows = orders.map((r) => [
        r.orderNo,
        r.pickupCode || "-",
        r.customerName,
        r.customerPhone,
        r.deliveryType,
        r.items,
        r.totalBoxes,
        (r.totalAmount / 100).toFixed(2),
        r.status,
        r.createdAt,
        r.receiverName || "-",
        r.receiverPhone || "-",
        r.receiverAddress || "-",
        r.note || "-",
      ]);

      // 第二页（下半段）：口味汇总
      const summarySection: (string | number)[][] = [
        [],
        ["口味汇总（基于上方筛选出的订单）"],
        ...buildFlavorSummary(orders),
      ];

      exportMatrixToCSV(`订单导出_${new Date().toISOString().slice(0, 10)}.csv`, [
        DETAIL_HEADER,
        ...detailRows,
        ...summarySection,
      ]);
    });
  };

  return (
    <button
      onClick={handleExport}
      className="btn-secondary !py-2 text-sm flex items-center gap-1.5"
    >
      <Download className="w-4 h-4" /> 导出CSV
    </button>
  );
}
