# ============================================================
# 原味生活饺子馆 · Docker 镜像
# 用法：
#   构建： docker build -t dumpling-manager .
#   启动： docker run -d --name dumpling -p 3000:3000 -v $(pwd)/data:/app/prisma/data dumpling-manager
#   访问： http://<你的IP或域名>:3000
# ============================================================

FROM node:20-alpine AS builder

WORKDIR /app

# 安装依赖
COPY package.json package-lock.json* ./
RUN npm ci || npm install

# 复制源码 & 构建
COPY . .
RUN DATABASE_URL="file:./prisma/data/dumpling.db" npm run build

# ---------- 运行时镜像 ----------
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV NEXTAUTH_URL=http://localhost:3000
ENV AUTH_TRUST_HOST=true

# 从 builder 复制所有需要的文件
COPY --from=builder /app/next.config.* ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules

# 数据目录持久化
VOLUME ["/app/prisma/data"]
EXPOSE 3000

# 启动：先同步 schema + 首次 seed，再运行服务
# - db push 保证表结构与 schema 一致（首次或升级时建表）
# - seed 幂等 upsert，首次部署注入初始账号/商品
# - 优先 standalone 精简产物，回退 npm start
CMD ["sh", "-c", "\
  DATABASE_URL=file:./prisma/data/dumpling.db npx prisma db push --skip-generate 2>/dev/null || true; \
  DATABASE_URL=file:./prisma/data/dumpling.db npm run db:seed 2>/dev/null || true; \
  node .next/standalone/server.js 2>/dev/null || \
  ( DATABASE_URL=file:./prisma/data/dumpling.db npm run start ) \
"]
