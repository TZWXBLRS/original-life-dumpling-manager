/**
 * 日期归一化工具
 *
 * 生产环境（Cloudflare Workers + Turso/libSQL driver adapter）下，Prisma 经由
 * WASM 查询引擎返回的 DATETIME 字段有可能是 ISO 字符串，而本地 Node 运行时
 * 返回的是 Date 对象。若直接在字符串上调用 Date 方法（如 getTime），会在
 * 服务端渲染时报 "xxx.getTime is not a function"，导致整页 Application error。
 *
 * 统一用 toDate() 归一化，保证两种运行时的行为一致。
 */
export type DateLike = Date | string | number | null | undefined;

export function toDate(value: DateLike): Date | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === "number") {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === "string") {
    let s = value.trim();
    if (!s) return null;
    // libSQL/Turso 可能返回 "2026-10-14 14:30:36"（无 T、无时区），
    // 这种格式各引擎解析不一致，统一按 UTC 补成 ISO8601 再解析。
    const m = s.match(
      /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})(?:\.(\d+))?$/
    );
    if (m) s = `${m[1]}T${m[2]}${m[3] ? "." + m[3] : ""}Z`;
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/** 归到「北京时间」自然日 key（YYYY-MM-DD） */
export function beijingDayKey(value: DateLike): string {
  const d = toDate(value);
  if (!d) return "";
  const t = new Date(d.getTime() + 8 * 3600 * 1000);
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(
    2,
    "0"
  )}-${String(t.getUTCDate()).padStart(2, "0")}`;
}

/** 安全地把日期格式化为中文时间字符串（兼容 Date / ISO 字符串） */
export function formatDateTime(
  value: DateLike,
  options?: Intl.DateTimeFormatOptions,
  locales = "zh-CN"
): string {
  const d = toDate(value);
  if (!d) return "";
  return d.toLocaleString(locales, options);
}

/** 安全地把日期格式化为中文日期字符串 */
export function formatDate(value: DateLike, locales = "zh-CN"): string {
  const d = toDate(value);
  if (!d) return "";
  return d.toLocaleDateString(locales);
}

const BEIJING_OFFSET_MS = 8 * 3600 * 1000;

/**
 * 返回「北京时间」某一天的 00:00 对应的真实时刻（UTC 毫秒）。
 *
 * 注意：Cloudflare Workers 运行时时区是 UTC，直接 setHours(0,0,0,0)
 * 得到的是 UTC 零点（= 北京 08:00），会让「今日」统计漏掉凌晨的订单，
 * 造成看板与订单数据对不上。这里统一按北京时间算自然日边界。
 */
export function startOfBeijingDay(value: DateLike = new Date()): Date {
  const d = toDate(value) ?? new Date();
  const shifted = new Date(d.getTime() + BEIJING_OFFSET_MS);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() - BEIJING_OFFSET_MS);
}

/** 返回「北京时间」某一天的 23:59:59.999 对应的真实时刻 */
export function endOfBeijingDay(value: DateLike = new Date()): Date {
  return new Date(startOfBeijingDay(value).getTime() + 24 * 3600 * 1000 - 1);
}

/** 返回「北京时间」某一天的区间 [start, endExclusive) */
export function beijingDayRange(value: DateLike = new Date()): {
  start: Date;
  end: Date;
} {
  const start = startOfBeijingDay(value);
  return { start, end: new Date(start.getTime() + 24 * 3600 * 1000) };
}
