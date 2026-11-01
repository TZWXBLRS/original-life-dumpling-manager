// 临时排查脚本
const { createClient } = require("@libsql/client");
const c = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

(async () => {
  try {
    console.log("=== SystemConfig ===");
    const cfgs = await c.execute("SELECT key, value FROM SystemConfig ORDER BY key");
    for (const r of cfgs.rows) console.log(`  ${r.key} = ${r.value}`);

    console.log("\n=== 演示顾客 13800138888 ===");
    const u = await c.execute({
      sql: "SELECT id, name, phone, role FROM User WHERE phone = ?",
      args: ["13800138888"],
    });
    for (const r of u.rows) console.log(" ", JSON.stringify(r));

    if (u.rows.length > 0) {
      const uid = u.rows[0].id;
      const os = await c.execute({
        sql: "SELECT id, orderNo, status, createdAt, totalBoxes, totalAmount FROM \"Order\" WHERE userId = ? ORDER BY createdAt DESC",
        args: [uid],
      });
      console.log(`  订单数: ${os.rows.length}`);
      for (const r of os.rows)
        console.log("   ", r.id, r.orderNo, r.status, r.createdAt, r.totalBoxes + "盒");
    }

    console.log("\n=== 全部订单状态分布 ===");
    const st = await c.execute(
      'SELECT status, COUNT(*) AS n FROM "Order" GROUP BY status'
    );
    for (const r of st.rows) console.log(`  ${r.status}: ${r.n}`);

    console.log("\n=== 订单总数 / 用户总数 ===");
    const tot = await c.execute('SELECT COUNT(*) AS n FROM "Order"');
    console.log("  订单:", tot.rows[0].n);
    const users = await c.execute("SELECT COUNT(*) AS n FROM User");
    console.log("  用户:", users.rows[0].n);

    console.log("\n=== 所有用户 ===");
    const allUsers = await c.execute("SELECT id, name, phone, role FROM User");
    for (const r of allUsers.rows) console.log(" ", JSON.stringify(r));
  } catch (e) {
    console.error("查询失败:", e.message);
  } finally {
    process.exit(0);
  }
})();
