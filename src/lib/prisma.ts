// 注意：必须用默认入口（不是 `/edge`），因为 Prisma 6 的 `/edge` 入口
// 在运行时校验："Prisma Client was configured to use the `adapter` option
// but it was imported via its `/edge` endpoint"。
//
// 在 Cloudflare Workers 环境中（webpack conditionNames 包含 workerd，见 next.config.js）：
//   Prisma package.json 的 exports['.'] 会匹配 workerd 条件，
//   加载 ./wasm.js（不依赖 fs，且支持 driver adapter）。
//
// @prisma/adapter-libsql 通过 webpack alias 改写为 /web 入口，
//   避开 @libsql/client Node 入口的 require.context 扫描。
//
// 本地开发：DATABASE_URL=file:./prisma/data/dumpling.db 走原生 SQLite adapter
// 生产环境：TURSO_DATABASE_URL=libsql://xxx 走 Turso 边缘数据库
import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";

let prisma: PrismaClient;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

if (globalForPrisma.prisma) {
  prisma = globalForPrisma.prisma;
} else {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;

  if (tursoUrl && tursoToken) {
    // 生产环境：Turso libSQL adapter
    // PrismaLibSQL 构造函数接收 Config 对象（{url, authToken}），不是 client 实例
    const adapter = new PrismaLibSQL({
      url: tursoUrl,
      authToken: tursoToken,
    });
    prisma = new PrismaClient({
      adapter,
      log: ["error"],
    });
  } else {
    // 本地开发：直接使用 Prisma 原生 SQLite 驱动。
    // libsql adapter 只接受 libsql:/http(s): 协议，传 file: 会抛
    // URL_SCHEME_NOT_SUPPORTED，导致本地商品页 500。
    prisma = new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
  }

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
  }
}

export { prisma };
