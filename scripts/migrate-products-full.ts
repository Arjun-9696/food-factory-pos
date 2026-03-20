import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import axios from "axios";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const APPWRITE_ENDPOINT = "https://nyc.cloud.appwrite.io/v1";
const APPWRITE_PROJECT = "69a4a8c0000576de77cf";
const APPWRITE_API_KEY = "standard_88b1054c18d18b4c44d90ebbafd82c8e5d8b8567130968e61a25bcf0e5c34b2ca286292e7fcd379479d414ead6e0e2f2572ce999c818b09b902153209ba17730376823ee88ef46311a95960452740e3d908cbe60decc074df3927ee56915f487b6283c28a047f48f651e66e79ee9524f39285705a91ea8febc430863a861acb2";
const DATABASE_ID = "food-factory-pos";
const PRODUCTS_COLLECTION = "products";
const CATEGORIES_COLLECTION = "categories";
const STORAGE_BUCKET_ID = "product-images";

const CLOUDINARY_CLOUD_NAME = "da6en2k2j";
const CLOUDINARY_UPLOAD_PRESET = "foodfactory";

const PLACEHOLDER_IMAGE = "https://images.unsplash.com/photo-1551782450-a2132b4ba21d?w=400&h=300&fit=crop";

const appwriteFetch = async (endpoint: string, options: any = {}) => {
  const response = await axios({
    url: `${APPWRITE_ENDPOINT}${endpoint}`,
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      "X-Appwrite-Project": APPWRITE_PROJECT,
      "X-Appwrite-Key": APPWRITE_API_KEY,
      ...options.headers,
    },
    ...options,
  });
  return response.data;
};

function isValidImageId(str: string): boolean {
  if (!str) return false;
  if (str.startsWith("http")) return true;
  if (str.includes(".") || str.includes("/")) return false;
  return str.length > 10;
}

function getAppwriteImageUrl(fileId: string): string {
  if (!fileId) return PLACEHOLDER_IMAGE;
  if (fileId.startsWith("http")) return fileId;
  if (!isValidImageId(fileId)) return PLACEHOLDER_IMAGE;
  return `${APPWRITE_ENDPOINT}/storage/buckets/${STORAGE_BUCKET_ID}/files/${fileId}/view?project=${APPWRITE_PROJECT}`;
}

async function uploadToCloudinary(imageUrl: string): Promise<string> {
  try {
    if (imageUrl === PLACEHOLDER_IMAGE) return PLACEHOLDER_IMAGE;
    
    const response = await axios.get(imageUrl, { 
      responseType: "arraybuffer", 
      timeout: 30000,
      headers: { "User-Agent": "Mozilla/5.0" }
    });
    
    const base64 = Buffer.from(response.data, "binary").toString("base64");
    const formData = new FormData();
    formData.append("file", `data:image/jpeg;base64,${base64}`);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

    const uploadResponse = await axios.post(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" }, timeout: 60000 }
    );

    return uploadResponse.data.secure_url;
  } catch (error) {
    console.log(`  -> Using placeholder for failed image`);
    return PLACEHOLDER_IMAGE;
  }
}

async function migrate() {
  console.log("=== APPWRITE TO SUPABASE MIGRATION ===\n");

  try {
    // Clear existing data
    await prisma.product.deleteMany({});
    await prisma.category.deleteMany({});
    console.log("✓ Cleared existing products and categories\n");

    // Fetch categories
    console.log("Fetching categories from Appwrite...");
    const categoriesData = await appwriteFetch(
      `/databases/${DATABASE_ID}/collections/${CATEGORIES_COLLECTION}/documents?queries[]=limit(100)`
    );
    
    const categories = categoriesData.documents || [];
    console.log(`Found ${categories.length} categories\n`);

    // Create categories
    const categoryNames = new Set<string>();
    for (const cat of categories) {
      const name = cat.name || "Uncategorized";
      const emoji = cat.emoji || "🍴";
      
      await prisma.category.upsert({
        where: { name },
        update: {},
        create: { name, emoji },
      });
      categoryNames.add(name);
    }
    
    // Add required categories if missing
    if (!categoryNames.has("Omelettes")) {
      await prisma.category.create({ data: { name: "Omelettes", emoji: "🍳" } });
    }
    if (!categoryNames.has("Fresh Juice")) {
      await prisma.category.create({ data: { name: "Fresh Juice", emoji: "🍊" } });
    }
    
    console.log(`✓ Created ${categories.length + 2} categories\n`);

    // Fetch all products with pagination
    console.log("Fetching products from Appwrite...");
    let allProducts: any[] = [];
    let offset = 0;
    const limit = 100;
    let totalFetched = 0;

    while (true) {
      try {
        const data = await appwriteFetch(
          `/databases/${DATABASE_ID}/collections/${PRODUCTS_COLLECTION}/documents?queries[]=limit(${limit})&queries[]=offset(${offset})`
        );
        
        const docs = data.documents || [];
        if (docs.length === 0) break;
        
        allProducts = [...allProducts, ...docs];
        totalFetched += docs.length;
        console.log(`  Fetched ${totalFetched} products...`);
        
        if (docs.length < limit) break;
        offset += limit;
        
        // Small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 100));
      } catch (e) {
        console.log(`  Error at offset ${offset}, trying again...`);
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    console.log(`\nFound ${allProducts.length} products in Appwrite\n`);

    // Migrate products
    let migrated = 0;
    let errors = 0;
    let skipped = 0;

    for (let i = 0; i < allProducts.length; i++) {
      const doc = allProducts[i];
      
      try {
        const name = doc.name;
        if (!name || name.trim() === "") {
          console.log(`  [${i + 1}] Skipping - no name`);
          skipped++;
          continue;
        }

        // Get image URL
        let imageUrl = "";
        if (doc.image) {
          const appwriteUrl = getAppwriteImageUrl(doc.image);
          imageUrl = await uploadToCloudinary(appwriteUrl);
        } else {
          imageUrl = PLACEHOLDER_IMAGE;
        }

        // Map fields
        const productData = {
          id: doc.$id || `prod_${i}`,
          name: name.trim(),
          description: doc.description || "",
          category: doc.category || "Uncategorized",
          price: parseFloat(doc.price) || 0,
          isVeg: doc.isVeg === true || doc.isVeg === "true",
          available: doc.available !== false,
          foodType: doc.foodType || doc.food_type || (doc.isVeg ? "veg" : "nonveg"),
          image: imageUrl,
          createdAt: doc.$createdAt ? new Date(doc.$createdAt) : new Date(),
          updatedAt: doc.$updatedAt ? new Date(doc.$updatedAt) : new Date(),
        };

        await prisma.product.create({ data: productData });
        migrated++;
        
        if (migrated % 20 === 0) {
          console.log(`  Migrated ${migrated}/${allProducts.length}...`);
        }

      } catch (e: any) {
        errors++;
        console.log(`  Error: ${doc.name} - ${e.message}`);
      }
    }

    console.log("\n=== MIGRATION COMPLETE ===");
    console.log(`Total products migrated: ${migrated}`);
    console.log(`Total categories: ${categories.length + 2}`);
    console.log(`Errors: ${errors}`);
    console.log(`Skipped (no name): ${skipped}`);

    // Verify
    const count = await prisma.product.count();
    console.log(`\nVerification - Products in Supabase: ${count}`);

  } catch (error: any) {
    console.error("Migration failed:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

migrate();
