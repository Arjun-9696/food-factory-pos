import "dotenv/config";

const ENDPOINT = process.env.VITE_APPWRITE_ENDPOINT || "https://nyc.cloud.appwrite.io/v1";
const PROJECT_ID = process.env.VITE_APPWRITE_PROJECT_ID || "69a4a8c0000576de77cf";
const API_KEY = process.env.VITE_APPWRITE_API_KEY || "";

const DATABASE_ID = "food-factory-pos";
const PRODUCTS_COLLECTION = "products";

async function listProducts(limit = 100, cursor?: string): Promise<{ documents: any[], lastId?: string }> {
  let url = `${ENDPOINT}/databases/${DATABASE_ID}/collections/${PRODUCTS_COLLECTION}/documents?limit=${limit}`;
  if (cursor) url += `&cursor=${cursor}`;

  const res = await fetch(url, {
    headers: {
      "X-Appwrite-Project": PROJECT_ID,
      "X-Appwrite-Key": API_KEY,
    },
  });

  const data = await res.json();
  
  if (!data.documents || data.documents.length === 0) {
    return { documents: [] };
  }

  const lastId = data.documents[data.documents.length - 1].$id;
  return { documents: data.documents, lastId };
}

async function getAllProducts(): Promise<any[]> {
  console.log("Fetching all products...\n");
  
  const allProducts: any[] = [];
  let cursor: string | undefined;
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    page++;
    const result = await listProducts(100, cursor);
    
    if (result.documents.length === 0) {
      hasMore = false;
      break;
    }

    allProducts.push(...result.documents);
    console.log(`  Page ${page}: ${result.documents.length} products (total: ${allProducts.length})`);

    if (result.documents.length < 100) {
      hasMore = false;
    } else {
      cursor = result.lastId;
    }
  }

  return allProducts;
}

async function deleteProduct(id: string): Promise<boolean> {
  const res = await fetch(
    `${ENDPOINT}/databases/${DATABASE_ID}/collections/${PRODUCTS_COLLECTION}/documents/${id}`,
    {
      method: "DELETE",
      headers: {
        "X-Appwrite-Project": PROJECT_ID,
        "X-Appwrite-Key": API_KEY,
      },
    }
  );
  return res.ok;
}

async function main() {
  console.log("=".repeat(50));
  console.log("🔄 Fetching all products from database");
  console.log("=".repeat(50) + "\n");

  const allProducts = await getAllProducts();
  
  console.log(`\n📋 Total products fetched: ${allProducts.length}\n`);

  // Find duplicates by name
  const nameMap = new Map<string, any>();
  const duplicates: any[] = [];

  for (const p of allProducts) {
    const name = p.name?.toLowerCase().trim();
    if (!name) continue;

    if (nameMap.has(name)) {
      duplicates.push(p);
    } else {
      nameMap.set(name, p);
    }
  }

  console.log(`📊 Unique products: ${nameMap.size}`);
  console.log(`🗑️  Duplicates to delete: ${duplicates.length}\n`);

  if (duplicates.length === 0) {
    console.log("✅ No duplicates found!");
    return;
  }

  // Show duplicates
  console.log("Duplicate products:");
  duplicates.slice(0, 10).forEach((dup, i) => {
    console.log(`  ${i + 1}. ${dup.name} (${dup.category}) - ₹${dup.price} - ID: ${dup.$id}`);
  });
  if (duplicates.length > 10) {
    console.log(`  ... and ${duplicates.length - 10} more`);
  }

  console.log("\n" + "=".repeat(50));
  console.log("🗑️  Deleting duplicates");
  console.log("=".repeat(50) + "\n");

  let deleted = 0;
  let failed = 0;

  for (let i = 0; i < duplicates.length; i++) {
    const dup = duplicates[i];
    const success = await deleteProduct(dup.$id);

    if (success) {
      deleted++;
      if ((i + 1) % 20 === 0) {
        console.log(`  Progress: ${i + 1}/${duplicates.length} deleted`);
      }
    } else {
      failed++;
      console.log(`  ❌ Failed: ${dup.name}`);
    }
  }

  console.log(`\n✅ Successfully deleted: ${deleted}`);
  if (failed > 0) {
    console.log(`❌ Failed to delete: ${failed}`);
  }

  console.log(`\n📊 Final unique products: ${nameMap.size}`);
  console.log("\n🎉 Done!");
}

main().catch(console.error);
