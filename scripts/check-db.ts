import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";

dotenv.config();

console.log("DATABASE_URL:", process.env.DATABASE_URL?.replace(/:([^:@]+)@/, ":***@"));

const prisma = new PrismaClient({
  log: ["query", "error", "warn"],
});

async function main() {
  try {
    console.log("\n🔌 Testing Supabase connection...");
    // Simple raw query
    const result = await prisma.$queryRaw`SELECT version()`;
    console.log("✅ Connected! PostgreSQL version:", result);

    // Check tables
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    console.log("\n📋 Tables in public schema:", tables);

    // Count products
    try {
      const productCount = await prisma.product.count();
      console.log("\n🛍️  Products count:", productCount);

      if (productCount > 0) {
        const sampleProducts = await prisma.product.findMany({ take: 3 });
        console.log("Sample products:", JSON.stringify(sampleProducts, null, 2));
      }
    } catch (e: any) {
      console.log("⚠️  Products table issue:", e.message);
    }

    // Count categories
    try {
      const catCount = await prisma.category.count();
      console.log("\n📂 Categories count:", catCount);
    } catch (e: any) {
      console.log("⚠️  Categories table issue:", e.message);
    }

    // Count orders
    try {
      const orderCount = await prisma.order.count();
      console.log("\n📦 Orders count:", orderCount);
    } catch (e: any) {
      console.log("⚠️  Orders table issue:", e.message);
    }

    // Count customers
    try {
      const custCount = await prisma.customer.count();
      console.log("\n👥 Customers count:", custCount);
    } catch (e: any) {
      console.log("⚠️  Customers table issue:", e.message);
    }

  } catch (err: any) {
    console.error("\n❌ Connection failed:", err.message);
    console.error("Full error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
