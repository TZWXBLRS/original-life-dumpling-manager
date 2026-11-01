/**
 * 门店日期选择工具（顾客端 & 服务端共用）
 *
 * 门店在北京（Asia/Shanghai），日期一律按北京时间计算，
 * 避免 Cloudflare Workers（UTC）与顾客设备时区造成的错位。
 */

export const STORE_TIME_ZONE = "Asia/Shanghai";

/** 可选天数（含起始日） */
export const DATE_OPTION_COUNT = 7;

/** 每天快递发货窗口（营业时间内的固定时段） */
export const SHIP_WINDOW_START_HOUR = 18;
export const SHIP_WINDOW_END_HOUR = 20;

type StoreNow = { date: string; hour: number; minute: number };

/** 取北京时间的日期与时分 */
export function getStoreNow(now: Date = new Date()): StoreNow {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: STORE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const pick = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "00";
  return {
    date: `${pick("year")}-${pick("month")}-${pick("day")}`,
    hour: Number(pick("hour")),
    minute: Number(pick("minute")),
  };
}

/** 在 YYYY-MM-DD 上加减天数（只做日历运算，不受时区影响） */
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return [
    t.getUTCFullYear(),
    String(t.getUTCMonth() + 1).padStart(2, "0"),
    String(t.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

/** 两个日期相差的天数（to - from） */
export function diffDays(from: string, to: string): number {
  const a = from.split("-").map(Number);
  const b = to.split("-").map(Number);
  const t1 = Date.UTC(a[0], a[1] - 1, a[2]);
  const t2 = Date.UTC(b[0], b[1] - 1, b[2]);
  return Math.round((t2 - t1) / 86400000);
}

/** 日期短标签：今天 / 明天 / 后天 / 周X */
export function datePrefix(date: string, today: string): string {
  const diff = diffDays(today, date);
  if (diff === 0) return "今天";
  if (diff === 1) return "明天";
  if (diff === 2) return "后天";
  const [y, m, d] = date.split("-").map(Number);
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][weekday];
}

/** 日期短标签：M月D日 */
export function shortDate(date: string): string {
  const [, m, d] = date.split("-");
  return `${Number(m)}月${Number(d)}日`;
}

/**
 * 快递可选发货日期：
 * 当天 20:00 前可选今天，之后从明天开始；最多 7 天。
 */
export function getShipDateOptions(now: Date = new Date()): string[] {
  const { date, hour } = getStoreNow(now);
  const start = hour >= SHIP_WINDOW_END_HOUR ? addDays(date, 1) : date;
  return Array.from({ length: DATE_OPTION_COUNT }, (_, i) => addDays(start, i));
}

/**
 * 自取可选日期：
 * 当天 20:00 前可选今天，之后从明天开始；最多 7 天。
 */
export function getPickupDateOptions(now: Date = new Date()): string[] {
  const { date, hour } = getStoreNow(now);
  const start = hour >= SHIP_WINDOW_END_HOUR ? addDays(date, 1) : date;
  return Array.from({ length: DATE_OPTION_COUNT }, (_, i) => addDays(start, i));
}

/** 判断某个自取时段在指定日期是否还能选（当天需留出 15 分钟缓冲） */
export function isPickupSlotAvailable(
  date: string,
  slot: string,
  now: Date = new Date()
): boolean {
  const storeNow = getStoreNow(now);
  if (date !== storeNow.date) return true;
  const end = slot.split("-")[1] ?? "";
  const [eh, em] = end.split(":").map(Number);
  if (!Number.isFinite(eh)) return true;
  const nowMinutes = storeNow.hour * 60 + storeNow.minute;
  return eh * 60 + em > nowMinutes + 15;
}

/** 按北京时间格式化日期（服务端渲染也可用） */
export function formatStoreDate(value: Date | string): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString("zh-CN", {
    timeZone: STORE_TIME_ZONE,
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
