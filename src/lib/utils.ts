import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * 合并 Tailwind class 名称（处理冲突）
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 格式化金额显示（分 → ¥xx.xx）
 */
export function formatMoney(fen: number): string {
  return `¥${(fen / 100).toFixed(2)}`;
}

/**
 * 生成易读的订单号
 * 格式：DMP + yyyyMMdd + 6位随机
 */
export function generateOrderNo(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `DMP${y}${m}${d}${rand}`;
}

/**
 * 中国手机号校验
 */
export function isValidPhone(phone: string): boolean {
  return /^1[3-9]\d{9}$/.test(phone);
}
