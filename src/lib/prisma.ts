import { PrismaClient } from "@prisma/client";

// Turso/libSQL 适配器（仅在有 TURSO_DATABASE_URL 时启用）
// 本地开发：DATABASE_URL=file:./prisma/data/dumpling.db 走原生 SQLite
// 生产环境：TURSO_DATABASE_URL=libsql://xxx 走 Turso 边缘数据库
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
    // 生产环境：使用 Turso libSQL adapter
    // 用 eval 包裹 require，骗过 webpack 静态分析
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const dynReq = eval("require") as NodeRequire;
    const { PrismaLibSQL } = dynReq("@prisma/adapter-libsql");
    const { createClient } = dynReq("@libsql/client");
    const libsql = createClient({
      url: tursoUrl,
      authToken: tursoToken,
    });
    const adapter = new PrismaLibSQL(libsql);
    prisma = new PrismaClient({
      adapter,
      log: ["error"],
    });
  } else {
    // 本地开发：原生 SQLite
    prisma = new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
  }

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
  }
}

export { prisma };
