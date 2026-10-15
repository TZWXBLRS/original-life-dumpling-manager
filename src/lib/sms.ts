/**
 * 短信发送模块（可选能力）
 *
 * 设计原则：验证码是「可选」的，不配置就不会阻塞线上。
 *   - 配置了短信服务商 → 顾客登录时必须填验证码，真发短信
 *   - 未配置 → 保持「输入手机号直接登录」，线上不受影响
 *
 * 启用方式（任选其一）：
 *   1. 阿里云短信：设置 SMS_ACCESS_KEY_ID / SMS_ACCESS_KEY_SECRET /
 *      SMS_SIGN_NAME / SMS_TEMPLATE_CODE
 *   2. 其他服务商或自建网关：设置 SMS_PROVIDER_URL，
 *      我们会以 POST { phone, code } 的 JSON 调用它
 *
 * 说明：全部使用 Web Crypto（crypto.subtle），兼容 Cloudflare Workers 运行时，
 * 不依赖 node:crypto。
 */

const ACCESS_KEY_ID = process.env.SMS_ACCESS_KEY_ID;
const ACCESS_KEY_SECRET = process.env.SMS_ACCESS_KEY_SECRET;
const SIGN_NAME = process.env.SMS_SIGN_NAME;
const TEMPLATE_CODE = process.env.SMS_TEMPLATE_CODE;
const PROVIDER_URL = process.env.SMS_PROVIDER_URL;

/** 是否已配置短信服务商（据此决定顾客登录是否需要验证码） */
export function isSmsConfigured(): boolean {
  const aliyun = Boolean(
    ACCESS_KEY_ID && ACCESS_KEY_SECRET && SIGN_NAME && TEMPLATE_CODE
  );
  return aliyun || Boolean(PROVIDER_URL);
}

function percentEncode(s: string): string {
  return encodeURIComponent(s)
    .replace(/\+/g, "%20")
    .replace(/\*/g, "%2A")
    .replace(/%7E/g, "~");
}

async function hmacSha1Base64(key: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message));
  const bytes = new Uint8Array(sig);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

/** 阿里云短信（SendSms，V1 签名） */
async function sendViaAliyun(phone: string, code: string): Promise<void> {
  const params: Record<string, string> = {
    AccessKeyId: ACCESS_KEY_ID!,
    Action: "SendSms",
    Format: "JSON",
    PhoneNumbers: phone,
    SignName: SIGN_NAME!,
    SignatureMethod: "HMAC-SHA1",
    SignatureNonce: crypto.randomUUID(),
    SignatureVersion: "1.0",
    TemplateCode: TEMPLATE_CODE!,
    TemplateParam: JSON.stringify({ code }),
    Timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
    Version: "2017-05-25",
  };
  const canonical = Object.keys(params)
    .sort()
    .map((k) => `${percentEncode(k)}=${percentEncode(params[k])}`)
    .join("&");
  const stringToSign = `POST&${percentEncode("/")}&${percentEncode(canonical)}`;
  const signature = await hmacSha1Base64(ACCESS_KEY_SECRET! + "&", stringToSign);

  const body = new URLSearchParams({ ...params, Signature: signature });
  const res = await fetch("https://dysmsapi.aliyuncs.com/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok || data?.Code !== "OK") {
    throw new Error(`短信发送失败：${data?.Message || res.status}`);
  }
}

/** 通用网关：POST { phone, code } */
async function sendViaWebhook(phone: string, code: string): Promise<void> {
  const res = await fetch(PROVIDER_URL!, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, code }),
  });
  if (!res.ok) throw new Error(`短信网关返回 ${res.status}`);
}

/**
 * 发送验证码短信。
 * 未配置服务商时返回 { dev: true }，仅在服务端日志打印验证码（本地调试用）。
 */
export async function sendSmsCode(
  phone: string,
  code: string
): Promise<{ dev: boolean }> {
  if (ACCESS_KEY_ID && ACCESS_KEY_SECRET && SIGN_NAME && TEMPLATE_CODE) {
    await sendViaAliyun(phone, code);
    return { dev: false };
  }
  if (PROVIDER_URL) {
    await sendViaWebhook(phone, code);
    return { dev: false };
  }
  console.log(
    `[sms:dev] 验证码 ${code} → ${phone}（未配置短信服务商，仅服务端日志输出）`
  );
  return { dev: true };
}
