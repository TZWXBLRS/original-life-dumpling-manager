# Cloudflare 项目环境变量汇总

项目：original-life-dumpling-manager（饺子订购管理系统）
部署目标：Cloudflare Pages（OpenNext）+ Turso 数据库
配置文件：`wrangler.jsonc`

## 一、wrangler.jsonc 中的明文 vars

| 变量 | 值 | 说明 |
|------|----|------|
| NEXTAUTH_URL | https://dumpling-shop.pages.dev | NextAuth 回调域名 |

## 二、生产环境 Secret（需用 `wrangler secret put` 写入）

| 变量 | 用途 | 是否必须 |
|------|------|---------|
| TURSO_DATABASE_URL | Turso 数据库连接 libsql://... | ✅ 必须 |
| TURSO_AUTH_TOKEN | Turso 鉴权 token | ✅ 必须 |
| NEXTAUTH_SECRET | NextAuth JWT 签名密钥（≥32 位） | ✅ 必须 |
| ADMIN_PASSWORD | 管理员初始密码（db:seed 用） | ⚠️ seed 用 |

### 写入命令
```bash
echo "你的值" | npx wrangler secret put TURSO_DATABASE_URL
echo "你的值" | npx wrangler secret put TURSO_AUTH_TOKEN
echo "你的值" | npx wrangler secret put NEXTAUTH_SECRET
echo "你的值" | npx wrangler secret put ADMIN_PASSWORD
```

## 三、运行时用到的其它变量

| 变量 | 用途 | 默认值 |
|------|------|--------|
| DATABASE_URL | 本地 SQLite 路径 | file:./prisma/data/dumpling.db |
| AUTH_SECRET | 与 NEXTAUTH_SECRET 等价，优先使用 | — |
| AUTH_TRUST_HOST | 信任请求 host（Cloudflare 必备） | — |
| CF_PAGES | Cloudflare Pages 平台自动注入 | — |
| WECHAT_APP_ID | 微信开放平台 AppID | — |
| WECHAT_APP_SECRET | 微信开放平台 AppSecret | — |
| NEXT_PUBLIC_WECHAT_ENABLED | 前端展示微信登录入口（=1 启用） | — |

## 四、db:seed 初始化变量（仅本地/初始化使用）

| 变量 | 默认值 |
|------|--------|
| ADMIN_NAME | 素生活 |
| ADMIN_PHONE | 15313659956 |
| ADMIN_PASSWORD | sushenghuo107 |
| KITCHEN_NAME | 素生活后厨 |
| KITCHEN_PHONE | 18301576627 |
| KITCHEN_PASSWORD | sushenghuo105 |
| STORE_NAME | 素生活·原味生活饺子馆 |
| STORE_PHONE | 18301576627 |
| PICKUP_ADDRESS | （见 seed.ts） |
| BUSINESS_HOURS_JSON | （见 seed.ts） |
| DAILY_LIMIT | 100 |

## 五、非环境变量（运行时由后台写入数据库 SystemConfig 表）

STORE_NAME、STORE_PHONE、PICKUP_ADDRESS、BUSINESS_HOURS、DAILY_LIMIT、FOAM_BOX_PRICE、FOAM_BOX_CAPACITY
由 `/api/admin/configs` 接口管理，不需要配置环境变量。
