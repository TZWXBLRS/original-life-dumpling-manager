# 素生活饺子馆 - Cloudflare 环境变量清单

> 本文档汇总项目用到的所有环境变量，方便其他对话/智能体快速配置和排查。
> 生产环境通过 Cloudflare Pages 部署，敏感值用 `wrangler secret put` 写入，非敏感值写在 `wrangler.jsonc` 的 `vars` 中。

## 设置方式

| 类型 | 命令 | 适用场景 |
|------|------|----------|
| **Secret**（加密，不在控制台明文显示） | `wrangler secret put <NAME>` | 密码、Token、密钥 |
| **Vars**（明文，写在 wrangler.jsonc） | 直接编辑 `wrangler.jsonc` 的 `vars` 字段 | 域名、URL 等非敏感配置 |

---

## 一、数据库（必配）

| 变量名 | 说明 | 必选 | 默认值 | 配置方式 | 用途 |
|--------|------|------|--------|----------|------|
| `TURSO_DATABASE_URL` | Turso 数据库 URL（`libsql://xxx.turso.io`） | ✅ 生产必配 | - | Secret | [prisma.ts](src/lib/prisma.ts) 生产环境连接 Turso |
| `TURSO_AUTH_TOKEN` | Turso 数据库访问令牌 | ✅ 生产必配 | - | Secret | [prisma.ts](src/lib/prisma.ts) 生产环境连接 Turso |
| `DATABASE_URL` | 本地 SQLite 文件路径 | 本地开发 | `file:./prisma/data/dumpling.db` | `.env.local` | [schema.prisma](prisma/schema.prisma) + [prisma.ts](src/lib/prisma.ts) 本地开发用 |

> **生产环境只需配置 `TURSO_DATABASE_URL` 和 `TURSO_AUTH_TOKEN`**，`DATABASE_URL` 仅本地开发使用。
> prisma.ts 的逻辑：若存在 Turso 配置则走 Turso，否则回退到本地 SQLite。

---

## 二、认证 / NextAuth（必配）

| 变量名 | 说明 | 必选 | 默认值 | 配置方式 | 用途 |
|--------|------|------|--------|----------|------|
| `AUTH_SECRET` | NextAuth 签名密钥（JWT 加密） | ✅ 生产必配 | - | Secret | [auth.ts](src/lib/auth.ts) 优先使用此变量 |
| `NEXTAUTH_SECRET` | NextAuth 密钥（`AUTH_SECRET` 的后备） | 可选 | - | Secret | [auth.ts](src/lib/auth.ts) 当 `AUTH_SECRET` 未设置时使用 |
| `NEXTAUTH_URL` | 站点完整 URL | ✅ 生产必配 | - | `wrangler.jsonc` vars | [auth.ts](src/lib/auth.ts) 回调地址生成；当前值 `https://dumpling-shop.pages.dev` |

> **注意**：`AUTH_SECRET` / `NEXTAUTH_SECRET` 必须配置，否则会话校验失败，用户登录后会被踢回登录页。
> 可用 `openssl rand -base64 32` 生成。

---

## 三、管理员账号（seed 用，可选）

以下变量仅在执行 `npm run db:seed` 初始化数据库时生效，生产环境无需常驻。

| 变量名 | 说明 | 必选 | 默认值 | 用途 |
|--------|------|------|--------|------|
| `ADMIN_NAME` | 管理员姓名 | 否 | `素生活` | [seed.ts](prisma/seed.ts) |
| `ADMIN_PHONE` | 管理员手机号 | 否 | `15313659956` | [seed.ts](prisma/seed.ts) |
| `ADMIN_PASSWORD` | 管理员密码 | 否 | `sushenghuo107` | [seed.ts](prisma/seed.ts) |

> 当前生产库管理员账号：`15313659956`，密码已手动重置为 `123456`。

---

## 四、门店配置（seed 用，可选）

| 变量名 | 说明 | 必选 | 默认值 | 用途 |
|--------|------|------|--------|------|
| `STORE_NAME` | 门店名称 | 否 | `素生活饺子馆` | [seed.ts](prisma/seed.ts) |
| `STORE_PHONE` | 门店联系电话 | 否 | `18301576627` | [seed.ts](prisma/seed.ts) |
| `PICKUP_ADDRESS` | 自取地址 | 否 | `北京昌平路181号院卢卡新天地3号楼底商负107 素生活` | [seed.ts](prisma/seed.ts) |
| `BUSINESS_HOURS_JSON` | 营业时间 JSON 字符串 | 否 | 见 seed.ts 默认值 | [seed.ts](prisma/seed.ts) |
| `DAILY_LIMIT` | 每日销售上限（盒） | 否 | `100` | [seed.ts](prisma/seed.ts) |

---

## 五、短信验证码（可选，不配则跳过验证码）

短信功能为「可选降级」设计：未配置任何短信变量时，顾客输入手机号直接一键登录，不发送验证码。

### 方式 A：阿里云短信

| 变量名 | 说明 | 配置方式 | 用途 |
|--------|------|----------|------|
| `SMS_ACCESS_KEY_ID` | 阿里云 AccessKey ID | Secret | [sms.ts](src/lib/sms.ts) |
| `SMS_ACCESS_KEY_SECRET` | 阿里云 AccessKey Secret | Secret | [sms.ts](src/lib/sms.ts) |
| `SMS_SIGN_NAME` | 短信签名（如 `素生活`） | Secret | [sms.ts](src/lib/sms.ts) |
| `SMS_TEMPLATE_CODE` | 短信模板编码 | Secret | [sms.ts](src/lib/sms.ts) |

### 方式 B：自建/第三方短信网关（二选一）

| 变量名 | 说明 | 配置方式 | 用途 |
|--------|------|----------|------|
| `SMS_PROVIDER_URL` | 短信网关 URL，以 POST `{phone, code}` 调用 | Secret | [sms.ts](src/lib/sms.ts) |

> 两种方式二选一。若同时配置，优先使用方式 A（阿里云）。

---

## 六、微信登录（可选，未实现）

| 变量名 | 说明 | 配置方式 | 用途 |
|--------|------|----------|------|
| `WECHAT_APP_ID` | 微信开放平台 AppID | Secret | [auth.ts](src/lib/auth.ts) 微信 OAuth Provider |
| `WECHAT_APP_SECRET` | 微信开放平台 AppSecret | Secret | [auth.ts](src/lib/auth.ts) 微信 OAuth Provider |

> 需企业主体 + 备案域名，当前未启用，代码中仅预留结构。

---

## 七、构建相关（无需手动配置）

| 变量名 | 说明 | 设置时机 | 用途 |
|--------|------|----------|------|
| `CF_BUILD` | Cloudflare 构建标记，设为 `"1"` 时启用 CF 专属 webpack alias | 构建脚本自动注入 | [next.config.js](next.config.js) 区分本地/Cloudflare 构建 |
| `NODE_ENV` | Node 环境 | 系统自动设置 | [prisma.ts](src/lib/prisma.ts) 控制日志级别和单例 |

---

## 生产环境配置速查

部署到 Cloudflare Pages 前，确保以下 secret 已设置：

```bash
# 数据库（必配）
wrangler secret put TURSO_DATABASE_URL
wrangler secret put TURSO_AUTH_TOKEN

# 认证（必配）
wrangler secret put AUTH_SECRET

# 短信（可选，不配则跳过验证码）
wrangler secret put SMS_ACCESS_KEY_ID
wrangler secret put SMS_ACCESS_KEY_SECRET
wrangler secret put SMS_SIGN_NAME
wrangler secret put SMS_TEMPLATE_CODE
# 或
wrangler secret put SMS_PROVIDER_URL
```

`wrangler.jsonc` 中的非敏感 vars（已配置）：

```json
{
  "vars": {
    "NEXTAUTH_URL": "https://dumpling-shop.pages.dev"
  }
}
```

---

## 常见问题

| 现象 | 排查方向 |
|------|----------|
| 登录后被踢回登录页 | 检查 `AUTH_SECRET` / `NEXTAUTH_SECRET` 是否配置；检查 `NEXTAUTH_URL` 是否与实际域名一致 |
| 数据库连接失败 | 检查 `TURSO_DATABASE_URL` 和 `TURSO_AUTH_TOKEN` 是否正确 |
| 顾客登录无验证码框 | 正常现象——未配置短信变量时自动跳过验证码，手机号直接登录 |
| 后台页面切换报 `Application error` | 通常是 Worker 资源超限（Error 1102）导致 503，已通过 error.tsx 兜底 |
