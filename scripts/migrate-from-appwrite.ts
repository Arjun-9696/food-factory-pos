import "dotenv/config";
import { Client, Databases, Storage, Query } from "appwrite";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import axios from "axios";

const APPWRITE_API_KEY = process.env.VITE_APPWRITE_API_KEY || "";

const appwriteClient = new Client()
  .setEndpoint("https://nyc.cloud.appwrite.io/v1")
  .setProject("69a4a8c0000576de77cf");

appwriteClient.headers["X-Appwrite-Key"] = APPWRITE_API_KEY;

const databases = new Databases(appwriteClient);
const storage = new Storage(appwriteClient);

const DATABASE_ID = "food-factory-pos";
const PRODUCTS_COLLECTION = "products";
const CATEGORIES_COLLECTION = "categories";
const STORAGE_BUCKET_ID = "product-images";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const CLOUDINARY_CLOUD_NAME = "da6en2k2j";
const CLOUDINARY_UPLOAD_PRESET = "foodfactory";

function getAppwriteImageUrl(fileId: string): string {
  if (!fileId) return "";
  if (fileId.startsWith("http")) return fileId;
  return `https://nyc.cloud.appwrite.io/v1/storage/buckets/${STORAGE_BUCKET_ID}/files/${fileId}/view?project=69a4a8c0000576de77cf`;
}

async function downloadImage(url: string): Promise<Buffer | null> {
  try {
    const response = await axios.get(url, { responseType: "arraybuffer", timeout: 30000 });
    return Buffer.from(response.data, "binary");
  } catch (error) {
    console.error("Error downloading image:", url, error);
    return null;
  }
}

async function uploadToCloudinary(imageUrl: string): Promise<string> {
  try {
    const buffer = await downloadImage(imageUrl);
    if (!buffer) return imageUrl;

    const base64 = buffer.toString("base64");
    const formData = new FormData();
    formData.append("file", `data:image/jpeg;base64,${base64}`);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

    const response = await axios.post(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" }, timeout: 60000 }
    );

    return response.data.secure_url;
  } catch (error) {
    console.error("Error uploading to Cloudinary:", error);
    return imageUrl;
  }
}

async function migrateFromAppwrite() {
  console.log("Fetching products from Appwrite...");

  try {
    // Clear existing products and categories
    await prisma.product.deleteMany({});
    await prisma.category.deleteMany({});
    console.log("Cleared existing data");

    // Fetch categories
    const categoriesResponse = await databases.listDocuments(DATABASE_ID, CATEGORIES_COLLECTION, []);
    console.log(`Found ${categoriesResponse.documents.length} categories`);

    // Create categories
    for (const cat of categoriesResponse.documents) {
      await prisma.category.upsert({
        where: { name: cat.name },
        update: {},
        create: { name: cat.name, emoji: cat.emoji || "🍴" },
      });
      console.log(`Created category: ${cat.name}`);
    }

    // Fetch all products using pagination
    let hasMore = true;
    let offset = 0;
    const limit = 100;
    let totalMigrated = 0;

    while (hasMore) {
      const response = await databases.listDocuments(
        DATABASE_ID, 
        PRODUCTS_COLLECTION, 
        [Query.limit(limit), Query.offset(offset)]
      );
      
      console.log(`Fetching products ${offset + 1} to ${offset + response.documents.length}...`);

      for (const doc of response.documents) {
        console.log(`Migrating: ${doc.name}`);
        
        let imageUrl = "";
        if (doc.image) {
          try {
            const appwriteUrl = getAppwriteImageUrl(doc.image);
            imageUrl = await uploadToCloudinary(appwriteUrl);
            console.log(`  -> Uploaded to Cloudinary`);
          } catch (e) {
            console.log(`  -> Using original: ${doc.image}`);
            imageUrl = doc.image;
          }
        }

        await prisma.product.upsert({
          where: { id: doc.$id },
          update: {
            name: doc.name,
            description: doc.description || "",
            category: doc.category,
            price: Number(doc.price) || 0,
            foodType: doc.foodType || doc.food_type || "veg",
            image: imageUrl,
            available: doc.available !== false,
          },
          create: {
            id: doc.$id,
            name: doc.name,
            description: doc.description || "",
            category: doc.category,
            price: Number(doc.price) || 0,
            foodType: doc.foodType || doc.food_type || "veg",
            image: imageUrl,
            available: doc.available !== false,
          },
        });

        totalMigrated++;
        console.log(`  Saved: ${doc.name}`);
      }

      offset += limit;
      hasMore = response.documents.length === limit;
    }

    console.log(`\nMigration complete!`);
    console.log(`Total products migrated: ${totalMigrated}`);
    console.log(`Total categories: ${categoriesResponse.documents.length}`);

  } catch (error) {
    console.error("Migration error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

migrateFromAppwrite();
