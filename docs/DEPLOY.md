# 启动命令参考

## 1. 本地开发

```bash
# 安装依赖
npm install

# 复制环境变量
cp .env.example .env.local

# 初始化数据库（创建表 + 初始数据）
npm run db:push
npm run db:seed

# 启动开发服务器
npm run dev
```

访问地址：http://localhost:3000

初始管理员账号：
- 手机号：13800138000
- 密码：admin123

## 2. Docker 部署（推荐用于生产，不间断服务）

```bash
# 1. 复制环境变量
cp .env.example .env
# 然后编辑 .env 修改 NEXTAUTH_SECRET、管理员密码等

# 2. 构建并启动
docker compose up -d --build

# 3. 查看日志
docker compose logs -f

# 4. 停止
docker compose down

# 5. 重新构建（代码更新后）
docker compose up -d --build
```

> Docker 容器配置了 `restart: always`，服务器重启或进程崩溃都会自动重启，保证 7x24 不间断服务。
> SQLite 数据库文件挂载在宿主机 `./prisma/data/` 目录，容器重建不会丢失数据。

## 3. 运行定价算法测试

```bash
npm run test
```

该测试会验证 PRD 中提到的所有价格计算场景，确保定价逻辑正确。

## 4. 启用短信验证码（可选）

顾客端登录默认是「手机号一键登录」，无需验证码。若需要短信验证，按下面配置环境变量即可**自动启用**，无需改代码。

启用逻辑：服务端检测到已配置短信服务商 → 登录面板自动出现验证码输入框，必须验证才能登录；未配置 → 保持一键登录，线上不受影响。

### 方式 A：阿里云短信

先在阿里云控制台申请短信签名与模板，然后配置：

```bash
# 本地：写入 .env.local
SMS_ACCESS_KEY_ID="LTAI..."
SMS_ACCESS_KEY_SECRET="..."
SMS_SIGN_NAME="禾也"
SMS_TEMPLATE_CODE="SMS_123456789"
```

```bash
# 生产：写入 Cloudflare secrets
wrangler secret put SMS_ACCESS_KEY_ID
wrangler secret put SMS_ACCESS_KEY_SECRET
wrangler secret put SMS_SIGN_NAME
wrangler secret put SMS_TEMPLATE_CODE
```

### 方式 B：自建 / 第三方短信网关

只需提供一个接收 `POST { phone, code }` 的接口：

```bash
SMS_PROVIDER_URL="https://your-sms-gateway.example.com/send"
# 生产环境改用：wrangler secret put SMS_PROVIDER_URL
```

> 验证码有效期与重发冷却由 `src/lib/login-code.ts` 控制，验证码存放在 SystemConfig 键值表，无需新增数据表。
