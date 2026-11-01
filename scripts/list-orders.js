const { createClient } = require("@libsql/client");
const c = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});
(async () => {
  const r = await c.execute(
    'SELECT id, orderNo, status, userId, totalBoxes FROM "Order" ORDER BY createdAt DESC'
  );
  for (const row of r.rows) console.log(row.id + "\t" + row.status + "\t" + row.totalBoxes);
  process.exit(0);
})();
