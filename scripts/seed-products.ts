import "dotenv/config";
import fs from "fs";
import csv from "csv-parser";
import { Client, Databases, ID } from "node-appwrite";

const PROJECT_ID = "69a4a8c0000576de77cf";
const ENDPOINT = "https://nyc.cloud.appwrite.io/v1";
const DATABASE_ID = "food-factory-pos";
const PRODUCTS_COLLECTION = "products";

const API_KEY = process.env.VITE_APPWRITE_API_KEY;

if (!API_KEY) {
  console.error("❌ Missing APPWRITE_API_KEY in .env");
  process.exit(1);
}

const client = new Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT_ID)
  .setKey(API_KEY);

const databases = new Databases(client);

interface Product {
  name: string;
  description?: string;
  category: string;
  price: number;
  isVeg: boolean;
  image?: string;
  available: boolean;
}

function parseCSV(): Promise<Product[]> {
  return new Promise((resolve, reject) => {
    const products: Product[] = [];

    fs.createReadStream("./Food_Factory_Zomato_Updated_Menu.csv")
      .pipe(csv())
      .on("data", (row) => {
        if (!row["Item name"] || !row["Item price"]) return;

        products.push({
          name: row["Item name"].trim(),
          description: row["Item description"] || "",
          category: row["Category"] || "General",
          price: Math.round(Number(row["Item price"])), // integer
          isVeg: row["Dietary Tag (veg/non veg/egg)"]
            ?.toLowerCase()
            .includes("veg") ?? false,
          image: "",
          available: true,
        });
      })
      .on("end", () => resolve(products))
      .on("error", reject);
  });
}

async function clearProducts() {
  console.log("🗑 Clearing existing products...");
  let total = 0;

  while (true) {
    const response = await databases.listDocuments(
      DATABASE_ID,
      PRODUCTS_COLLECTION
    );

    if (response.documents.length === 0) break;

    for (const doc of response.documents) {
      await databases.deleteDocument(
        DATABASE_ID,
        PRODUCTS_COLLECTION,
        doc.$id
      );
      total++;
    }
  }

  console.log(`✅ Cleared ${total} products`);
}

async function seedProducts(products: Product[]) {
  console.log("🌱 Seeding products...\n");

  let success = 0;
  let failed = 0;

  for (const product of products) {
    try {
      await databases.createDocument(
        DATABASE_ID,
        PRODUCTS_COLLECTION,
        ID.unique(),
        product
      );

      success++;
      process.stdout.write(
        `\r📦 Seeded ${success}/${products.length}`
      );
    } catch (e: any) {
      failed++;
      console.error(
        `\n❌ Failed: ${product.name} → ${e.message}`
      );
    }
  }

  console.log(`\n\n✅ Done: ${success} added, ${failed} failed`);
}

async function main() {
  console.log("🚀 Food Factory CSV → Appwrite Seeder\n");

  const products = await parseCSV();
  console.log(`📦 Found ${products.length} products in CSV\n`);

  await clearProducts();
  await seedProducts(products);

  console.log("\n🎉 All done!");
}

main().catch(console.error);