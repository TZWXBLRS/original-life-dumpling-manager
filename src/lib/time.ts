/**
 * 时间工具 —— 门店位于北京，所有对外展示的日期时间必须按北京时间（Asia/Shanghai）渲染。
 *
 * 背景：Cloudflare Workers 运行时的本地时区是 UTC，直接使用
 * `new Date().toLocaleString("zh-CN")` 会把 UTC 当成「本地时间」输出，
 * 导致展示的下单时间比实际北京时间早 8 小时。因此所有面向用户的
 * 时间展示与「今日」边界都必须显式指定 timeZone。
 */

export const BEIJING_TZ = "Asia/Shanghai";

/** 按北京时间格式化「日期 + 时间」，例：2026/10/16 14:30:00 */
export function formatBeijingDateTime(d: Date): string {
  return d.toLocaleString("zh-CN", { timeZone: BEIJING_TZ, hour12: false });
}

/** 按北京时间格式化「日期」，例：2026/10/16 */
export function formatBeijingDate(d: Date): string {
  return d.toLocaleDateString("zh-CN", { timeZone: BEIJING_TZ });
}

/** 北京时间自然日的 key（YYYY-MM-DD），用于按天分组 */
export function beijingDayKey(d: Date): string {
  const t = new Date(d.getTime() + 8 * 3600 * 1000);
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}-${String(
    t.getUTCDate()
  ).padStart(2, "0")}`;
}

/**
 * 北京时间的「今天 00:00」对应的绝对时刻。
 * 例：北京时间 2026-10-16 00:00 === UTC 2026-10-15 16:00
 */
export function beijingDayStart(now: Date = new Date()): Date {
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: BEIJING_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return new Date(`${ymd}T00:00:00+08:00`);
}

/** 北京时间「明天 00:00」，用于构造 [今天, 明天) 左闭右开区间 */
export function beijingDayEnd(now: Date = new Date()): Date {
  return new Date(beijingDayStart(now).getTime() + 24 * 3600 * 1000);
}
