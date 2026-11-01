/**
 * CSV 导出工具 — 带 UTF-8 BOM，Excel 打开中文不乱码
 *
 * 提供两种能力：
 *  - exportToCSV：按「列定义 + 行对象」导出单表格（简单场景）
 *  - exportMatrixToCSV：按「二维数组」导出，可拼装多段（明细 + 汇总）
 */

interface CSVColumn<T> {
  header: string;
  getter: (row: T) => string | number;
}

/** 单个单元格转义：含逗号/引号/换行时用双引号包裹 */
function escapeCell(val: string | number): string {
  const s = String(val ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** 生成带 BOM 的 CSV 文本并触发浏览器下载 */
function downloadCSV(filename: string, rows: (string | number)[][]) {
  const BOM = "\uFEFF";
  const body = rows.map((r) => r.map(escapeCell).join(",")).join("\n");
  const blob = new Blob([BOM + body], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportToCSV<T>(
  filename: string,
  columns: CSVColumn<T>[],
  rows: T[]
): void {
  const matrix: (string | number)[][] = [
    columns.map((c) => c.header),
    ...rows.map((row) => columns.map((c) => c.getter(row))),
  ];
  downloadCSV(filename, matrix);
}

/**
 * 导出二维数组。传入空数组即输出空行，
 * 用于在同一个 CSV 内拼接「明细」与「汇总」两段。
 */
export function exportMatrixToCSV(
  filename: string,
  rows: (string | number)[][]
): void {
  downloadCSV(filename, rows);
}
