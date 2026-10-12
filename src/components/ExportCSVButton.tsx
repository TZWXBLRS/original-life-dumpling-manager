"use client";
import { Download } from "lucide-react";

interface OrderCSVRow {
  orderNo: string;
  pickupCode: string;
  customerName: string;
  customerPhone: string;
  deliveryType: string;
  items: string;
  totalBoxes: number;
  totalAmount: number;
  status: string;
  createdAt: string;
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  note: string;
}

export function ExportCSVButton({ orders }: { orders: OrderCSVRow[] }) {
  const handleExport = () => {
    // 动态导入避免 SSR 问题
    import("@/lib/csv-export").then(({ exportToCSV }) => {
      exportToCSV(
        `订单导出_${new Date().toISOString().slice(0, 10)}.csv`,
        [
          { header: "订单号", getter: (r) => r.orderNo },
          { header: "取货码", getter: (r) => r.pickupCode || "-" },
          { header: "顾客姓名", getter: (r) => r.customerName },
          { header: "顾客手机", getter: (r) => r.customerPhone },
          { header: "配送方式", getter: (r) => r.deliveryType },
          { header: "商品明细", getter: (r) => r.items },
          { header: "总盒数", getter: (r) => r.totalBoxes },
          { header: "金额(元)", getter: (r) => (r.totalAmount / 100).toFixed(2) },
          { header: "状态", getter: (r) => r.status },
          { header: "下单时间", getter: (r) => r.createdAt },
          { header: "收件人", getter: (r) => r.receiverName || "-" },
          { header: "收件电话", getter: (r) => r.receiverPhone || "-" },
          { header: "收件地址", getter: (r) => r.receiverAddress || "-" },
          { header: "备注", getter: (r) => r.note || "-" },
        ],
        orders
      );
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
