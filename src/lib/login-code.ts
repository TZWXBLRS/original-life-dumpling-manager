import { prisma } from "./prisma";

/**
 * 顾客登录验证码的存取（复用 SystemConfig 键值表，避免新增数据表）。
 * 存储格式：`LOGIN_CODE:{phone}` → `{code}|{expiresAtMs}`
 */
const KEY_PREFIX = "LOGIN_CODE:";
export const CODE_TTL_MS = 5 * 60 * 1000; // 有效期 5 分钟
const RESEND_COOLDOWN_MS = 60 * 1000; // 同一手机号 60 秒内不重复发送

export function genCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function saveCode(phone: string, code: string): Promise<void> {
  const value = `${code}|${Date.now() + CODE_TTL_MS}`;
  await prisma.systemConfig.upsert({
    where: { key: KEY_PREFIX + phone },
    update: { value },
    create: { key: KEY_PREFIX + phone, value, description: "顾客登录验证码" },
  });
}

export async function verifyCode(phone: string, code: string): Promise<boolean> {
  const row = await prisma.systemConfig.findUnique({
    where: { key: KEY_PREFIX + phone },
  });
  if (!row) return false;
  const [saved, exp] = row.value.split("|");
  if (!saved || !exp || Date.now() > Number(exp)) return false;
  return saved === code;
}

/** 距可再次发送还需等待的秒数；0 表示可以发送 */
export async function codeCooldownRemaining(phone: string): Promise<number> {
  const row = await prisma.systemConfig.findUnique({
    where: { key: KEY_PREFIX + phone },
  });
  if (!row) return 0;
  const exp = Number(row.value.split("|")[1]);
  if (!exp) return 0;
  const issuedAt = exp - CODE_TTL_MS;
  const remain = RESEND_COOLDOWN_MS - (Date.now() - issuedAt);
  return remain > 0 ? Math.ceil(remain / 1000) : 0;
}

export async function clearCode(phone: string): Promise<void> {
  await prisma.systemConfig.deleteMany({ where: { key: KEY_PREFIX + phone } });
}
