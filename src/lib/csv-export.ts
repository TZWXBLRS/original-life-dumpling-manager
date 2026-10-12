/**
 * CSV 导出工具 — 带 UTF-8 BOM，Excel 打开中文不乱码
 */

interface CSVColumn<T> {
  header: string;
  getter: (row: T) => string | number;
}

export function exportToCSV<T>(
  filename: string,
  columns: CSVColumn<T>[],
  rows: T[]
): void {
  const BOM = "\uFEFF";
  const header = columns.map((c) => c.header).join(",");
  const body = rows
    .map((row) =>
      columns
        .map((c) => {
          const val = String(c.getter(row) ?? "");
          // 含逗号/引号/换行的字段用双引号包裹
          if (val.includes(",") || val.includes('"') || val.includes("\n")) {
            return `"${val.replace(/"/g, '""')}"`;
          }
          return val;
        })
        .join(",")
    )
    .join("\n");

  const csv = BOM + header + "\n" + body;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
