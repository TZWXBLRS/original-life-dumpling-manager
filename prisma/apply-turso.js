// 一次性脚本：把 prisma/migrations/init.sql 推到 Turso
// 用法: node prisma/apply-turso.js
const { createClient } = require("@libsql/client");
const fs = require("fs");
const path = require("path");

async function main() {
  const url = process.env.TURSO_DATABASE_URL;
  const token = process.env.TURSO_AUTH_TOKEN;
  if (!url || !token) {
    console.error("请设置 TURSO_DATABASE_URL 和 TURSO_AUTH_TOKEN 环境变量");
    process.exit(1);
  }

  const sqlPath = path.join(__dirname, "migrations", "init.sql");
  const sqlContent = fs.readFileSync(sqlPath, "utf8");

  // 先移除所有 -- 注释行，再按分号拆分
  const cleanSql = sqlContent
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");

  const statements = cleanSql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  console.log(`共 ${statements.length} 条 SQL 语句需要执行`);

  const client = createClient({ url, authToken: token });

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    try {
      await client.execute(stmt);
      console.log(`  [${i + 1}/${statements.length}] OK`);
    } catch (err) {
      if (err.message.includes("already exists")) {
        console.log(`  [${i + 1}/${statements.length}] 跳过（已存在）`);
      } else {
        console.error(`  [${i + 1}/${statements.length}] 失败: ${err.message}`);
        console.error(`  SQL: ${stmt.substring(0, 120)}...`);
        throw err;
      }
    }
  }

  console.log("Schema 推送完成！");

  // 验证：列出所有表
  const tables = await client.execute(
    "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
  );
  console.log("当前数据库表：");
  for (const row of tables.rows) {
    console.log(`  - ${row.name}`);
  }
}

main().catch((err) => {
  console.error("失败：", err);
  process.exit(1);
});
