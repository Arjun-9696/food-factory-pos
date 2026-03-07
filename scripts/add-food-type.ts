import "dotenv/config";
import { Client, Databases } from "node-appwrite";

const PROJECT_ID = "69a4a8c0000576de77cf";
const ENDPOINT = "https://nyc.cloud.appwrite.io/v1";
const DATABASE_ID = "food-factory-pos";
const PRODUCTS_COLLECTION = "products";

const API_KEY = process.env.VITE_APPWRITE_API_KEY;

if (!API_KEY) {
  console.error("❌ Missing VITE_APPWRITE_API_KEY in .env");
  process.exit(1);
}

const client = new Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT_ID)
  .setKey(API_KEY);

const databases = new Databases(client);

async function addFoodTypeAttribute() {
  console.log("🍔 Adding foodType attribute to products collection...\n");

  try {
    await databases.createEnumAttribute(
      DATABASE_ID,
      PRODUCTS_COLLECTION,
      "foodType",
      ["veg", "egg", "nonveg"],
      false,
      "veg"
    );
    console.log("✅ foodType attribute created successfully!");
    console.log("\nValues: veg, egg, nonveg");
    console.log("Default: veg");
  } catch (e: any) {
    if (e.code === 400 && e.message.includes("already exists")) {
      console.log("⚠️  foodType attribute already exists!");
    } else {
      console.error("❌ Error:", e.message);
      console.log("\nPlease go to your Appwrite Console:");
      console.log("1. Navigate to Database > food-factory-pos > products");
      console.log("2. Go to Attributes tab");
      console.log('3. Add new attribute:');
      console.log('   - Key: foodType');
      console.log('   - Type: String');
      console.log('   - Size: 20');
      console.log('   - Required: Yes');
      console.log('   - Default: veg');
      console.log('   - Array: No');
      console.log('   - Enum values: ["veg", "egg", "nonveg"]');
    }
  }
}

addFoodTypeAttribute();
