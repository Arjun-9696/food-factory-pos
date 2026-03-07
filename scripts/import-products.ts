import "dotenv/config";
import { readFileSync, unlinkSync, existsSync } from "fs";
import { ID } from "appwrite";

const ENDPOINT = process.env.VITE_APPWRITE_ENDPOINT || "https://nyc.cloud.appwrite.io/v1";
const PROJECT_ID = process.env.VITE_APPWRITE_PROJECT_ID || "69a4a8c0000576de77cf";
const API_KEY = process.env.VITE_APPWRITE_API_KEY || "";

const DATABASE_ID = "food-factory-pos";
const PRODUCTS_COLLECTION = "products";
const CSV_PATH = "./Food_Factory_Zomato_Updated_Menu.csv";

const CATEGORY_IMAGES: Record<string, string> = {
  "Fresh Juice": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=400&h=300&fit=crop",
  "Fruite Milk Shake": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=400&h=300&fit=crop",
  "Food Factory Special": "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400&h=300&fit=crop",
  "Soda": "https://images.unsplash.com/photo-1581006852262-e4307cf6283a?w=400&h=300&fit=crop",
  "Lassi": "https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=400&h=300&fit=crop",
  "Smoothie": "https://images.unsplash.com/photo-1550547660-d9450f859349?w=400&h=300&fit=crop",
  "Falooda": "https://images.unsplash.com/photo-1568901839119-631418a3910d?w=400&h=300&fit=crop",
  "Mojito": "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&h=300&fit=crop",
  "Health Drinks": "https://images.unsplash.com/photo-1554433607-66b5a31b4766?w=400&h=300&fit=crop",
  "Sandwich": "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&h=300&fit=crop",
  "Non Veg Sandwich": "https://images.unsplash.com/photo-1568901839119-631418a3910d?w=400&h=300&fit=crop",
  "Maggie": "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&h=300&fit=crop",
  "Non Veg Maggi": "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&h=300&fit=crop",
};

const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1546173159-315724a31696?w=400&h=300&fit=crop";

const DIETARY_MAP: Record<string, "veg" | "egg" | "nonveg"> = {
  "Veg": "veg",
  "Non veg": "nonveg",
  "Egg": "egg",
};

function parseCSV(content: string): any[] {
  const lines = content.trim().split("\n");
  const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));

  const products: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",");
    if (values.length < 4) continue;

    const product: any = {};
    headers.forEach((header, idx) => {
      let value = values[idx]?.trim().replace(/"/g, "") || "";
      product[header.toLowerCase().replace(/[^a-z]/g, "")] = value;
    });

    products.push(product);
  }

  return products;
}

async function listProducts(): Promise<any[]> {
  const res = await fetch(
    `${ENDPOINT}/databases/${DATABASE_ID}/collections/${PRODUCTS_COLLECTION}/documents?limit=100`,
    {
      headers: {
        "X-Appwrite-Project": PROJECT_ID,
        "X-Appwrite-Key": API_KEY,
      },
    }
  );
  const data = await res.json();
  return data.documents || [];
}

async function createProduct(product: any): Promise<boolean> {
  const res = await fetch(
    `${ENDPOINT}/databases/${DATABASE_ID}/collections/${PRODUCTS_COLLECTION}/documents`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Appwrite-Project": PROJECT_ID,
        "X-Appwrite-Key": API_KEY,
      },
      body: JSON.stringify({
        documentId: ID.unique(),
        data: product,
      }),
    }
  );
  return res.ok;
}

async function importProducts() {
  console.log("\n" + "=".repeat(60));
  console.log("🚀 IMPORTING PRODUCTS FROM CSV TO APPWRITE DATABASE");
  console.log("=".repeat(60) + "\n");

  if (!existsSync(CSV_PATH)) {
    console.log("❌ CSV file not found!");
    process.exit(1);
  }

  console.log("📁 Reading CSV file...");
  const csvContent = readFileSync(CSV_PATH, "utf-8");
  const products = parseCSV(csvContent);
  console.log(`📋 Found ${products.length} products in CSV\n`);

  console.log("🔄 Fetching existing products from database...");
  const existingProducts = await listProducts();
  const existingNames = new Set(existingProducts.map((p) => p.name?.toLowerCase().trim()));
  console.log(`📊 Existing products: ${existingProducts.length}\n`);

  console.log("📦 Importing products...\n");

  let imported = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < products.length; i++) {
    const p = products[i];

    const name = p.itemname || p.name || "";
    const category = p.category || "";
    const price = parseFloat(p.itemprice || p.price || "0");
    const dietary = p.dietarytag || p.dietary || "Veg";
    const foodType = DIETARY_MAP[dietary] ?? "veg";

    if (!name || !category) continue;

    // Check for duplicates
    if (existingNames.has(name.toLowerCase().trim())) {
      skipped++;
      continue;
    }

    const image = CATEGORY_IMAGES[category] || DEFAULT_IMAGE;

    try {
      const success = await createProduct({
        name: name.trim(),
        description: "",
        category: category.trim(),
        price: price,
        foodType: foodType,
        image: image,
        available: true,
      });

      if (success) {
        imported++;
        existingNames.add(name.toLowerCase().trim());
        console.log(`  ✅ ${name} (${category}) - ₹${price}`);
      } else {
        errors++;
        console.log(`  ❌ Failed: ${name}`);
      }
    } catch (e) {
      errors++;
      console.log(`  ❌ Error: ${name} - ${e}`);
    }

    if ((i + 1) % 20 === 0) {
      console.log(`  Progress: ${i + 1}/${products.length}`);
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("📊 IMPORT SUMMARY");
  console.log("=".repeat(60));
  console.log(`  ✅ Imported: ${imported}`);
  console.log(`  ⏭️  Skipped (duplicate): ${skipped}`);
  console.log(`  ❌ Errors: ${errors}`);
  console.log("=".repeat(60) + "\n");

  // Delete CSV file after successful import
  console.log("🗑️  Deleting CSV file...");
  try {
    unlinkSync(CSV_PATH);
    console.log("✅ CSV file deleted!\n");
  } catch (e) {
    console.log("⚠️  Could not delete CSV file\n");
  }

  // Verify final count
  const finalProducts = await listProducts();
  console.log(`📊 Final products in database: ${finalProducts.length}`);

  const categories = new Set(finalProducts.map((p) => p.category));
  console.log(`📂 Categories: ${Array.from(categories).sort().join(", ")}\n`);

  console.log("🎉 IMPORT COMPLETE!\n");
}

importProducts()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  });
