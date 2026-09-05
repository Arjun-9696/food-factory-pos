const { Client } = require("pg");
require("dotenv").config();

async function main() {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const r = await c.query(
    `SELECT column_name, data_type, udt_name, is_nullable, column_default
     FROM information_schema.columns
     WHERE table_schema='public' AND table_name='orders' ORDER BY ordinal_position`
  );
  for (const col of r.rows) console.log(`${col.column_name}: ${col.data_type} (${col.udt_name}) default=${col.column_default}`);

  const co = await c.query(
    `SELECT column_name, data_type, udt_name FROM information_schema.columns
     WHERE table_schema='public' AND table_name='coin_redemptions' ORDER BY ordinal_position ALL`
  );
  console.log("\n--- coin_redemptions ---");
  // re-run without ALL hack
  const co2 = await c.query(
    `SELECT column_name, data_type, udt_name FROM information_schema.columns
     WHERE table_schema='public' AND table_name='coin_redemptions' ORDER BY ordinal_position`
  );
  for (const col of co2.rows) console.log(`${col.column_name}: ${col.data_type} (${col.udt_name})`);
  await c.end();
}
main().catch((e) => { console.error(e.message); process.exit(1); });