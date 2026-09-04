// ============================================================================
// Apply the Razorpay migrations to the Supabase database.
//   npm run razorpay:db
// Runs scripts/razorpay-payments.sql (creates `payment_records`) followed by
// scripts/whatsapp-invoice.sql (payment confirmation + WhatsApp invoice
// columns) and scripts/delivery-address.sql (delivery address + charge).
// Additive only — safe to re-run.
// ============================================================================
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import pg from "pg";
import * as dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("❌ DATABASE_URL is not set in .env");
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 20_000,
  });

  const sqlPaths = [
    path.join(__dirname, "razorpay-payments.sql"),
    path.join(__dirname, "whatsapp-invoice.sql"),
    path.join(__dirname, "delivery-address.sql"),
  ];

  console.log("🔌 Connecting to Supabase...");
  try {
    for (const sqlPath of sqlPaths) {
      const sql = await readFile(sqlPath, "utf8");
      await pool.query(sql);
      console.log(`✅ Applied ${path.basename(sqlPath)}`);
    }
    console.log("✅ payment_records table is ready.");
    const { rows } = await pool.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'payment_records'
       ORDER BY ordinal_position`,
    );
    console.log("Columns:", rows.map((r) => r.column_name).join(", "));
  } catch (err: unknown) {
    console.error("❌ Migration failed:", err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();