import "dotenv/config";
import { Pool } from "pg";
import { menuItems } from "../src/data/menu";
import { getCategoryEmoji } from "../src/data/categories";

const MENU_CATEGORY_EMOJIS: Record<string, string> = {
  "Fresh Juices": "🍊",
  Milkshakes: "🥤",
  "Special Milkshake": "🧋",
  "Cold Coffee": "☕",
  Burgers: "🍔",
  Sandwich: "🥪",
  "Non Veg Sandwich": "🥪",
  Momos: "🥟",
  Noodles: "🍜",
  Fries: "🍟",
  Snacks: "🍿",
  "Egg Items": "🥚",
  Bakery: "🥐",
  Desserts: "🍰",
  "Hot Beverages": "🍵",
  Maggi: "🍜",
};

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 15000,
  ssl: { rejectUnauthorized: false },
});

async function seed() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query("DELETE FROM products");
    await client.query("DELETE FROM categories");

    const categories = Array.from(new Set(menuItems.map((i) => i.category)));
    for (const cat of categories) {
      await client.query(
        `INSERT INTO categories (name, emoji) VALUES ($1, $2)`,
        [cat, MENU_CATEGORY_EMOJIS[cat] || getCategoryEmoji(cat)]
      );
    }

    for (const item of menuItems) {
      await client.query(
        `INSERT INTO products (name, description, category, price, food_type, is_veg, image, available)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          item.name,
          item.description || "",
          item.category,
          item.price,
          item.foodType,
          item.foodType === "veg",
          item.image,
          item.available ?? true,
        ]
      );
    }

    await client.query("COMMIT");

    const { rows } = await client.query(
      "SELECT count(*)::int AS total FROM products"
    );
    const cats = await client.query(
      "SELECT name, emoji FROM categories ORDER BY name"
    );
    console.log(`Seeded ${rows[0].total} products`);
    console.log(
      "Categories:",
      cats.rows.map((r) => `${r.name}${r.emoji}`).join(", ")
    );
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

seed()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("SEED FAILED:", e.message);
    process.exit(1);
  });
