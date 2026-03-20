import { Client, Databases, Storage, Permission, Role } from "appwrite";

const PROJECT_ID = "69a4a8c0000576de77cf";
const ENDPOINT = "https://nyc.cloud.appwrite.io/v1";

const client = new Client()
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT_ID);

// Use correct Appwrite v22+ API
const databases = new Databases(client) as any;
const storage = new Storage(client) as any;

const DATABASE_ID = "food-factory-pos";

async function setup() {
    console.log("🚀 Setting up Appwrite...\n");

    try {
        // 1. Create Database
        console.log("📦 Creating database...");
        try {
            await databases.create(DATABASE_ID, DATABASE_ID);
            console.log("✅ Database created");
        } catch (e: any) {
            console.log("ℹ️  Database:", e.message || e.code);
        }

        // 2. Create Collections
        console.log("\n📁 Creating collections...");

        const publicReadPerms = [
            Permission.read(Role.any()),
            Permission.create(Role.users()),
            Permission.update(Role.users()),
            Permission.delete(Role.users()),
        ];
        const userPerms = [
            Permission.read(Role.users()),
            Permission.create(Role.users()),
            Permission.update(Role.users()),
            Permission.delete(Role.users()),
        ];

        // Categories Collection
        try {
            await databases.createCollection(DATABASE_ID, "categories", "categories", publicReadPerms, false);
            console.log("✅ Categories collection created");
        } catch (e: any) {
            console.log("ℹ️  Categories:", e.message || e.code);
        }

        // Users Collection
        try {
            await databases.createCollection(DATABASE_ID, "users", "users", userPerms, false);
            console.log("✅ Users collection created");
        } catch (e: any) {
            console.log("ℹ️  Users:", e.message || e.code);
        }

        // Products Collection
        try {
            await databases.createCollection(DATABASE_ID, "products", "products", publicReadPerms, false);
            console.log("✅ Products collection created");
        } catch (e: any) {
            console.log("ℹ️  Products:", e.message || e.code);
        }

        // Orders Collection
        try {
            await databases.createCollection(DATABASE_ID, "orders", "orders", userPerms, false);
            console.log("✅ Orders collection created");
        } catch (e: any) {
            console.log("ℹ️  Orders:", e.message || e.code);
        }

        // Profiles Collection
        try {
            await databases.createCollection(DATABASE_ID, "profiles", "profiles", userPerms, false);
            console.log("✅ Profiles collection created");
        } catch (e: any) {
            console.log("ℹ️  Profiles:", e.message || e.code);
        }

        // Addresses Collection
        try {
            await databases.createCollection(DATABASE_ID, "addresses", "addresses", userPerms, false);
            console.log("✅ Addresses collection created");
        } catch (e: any) {
            console.log("ℹ️  Addresses:", e.message || e.code);
        }

        // 3. Add Attributes to Users
        console.log("\n👤 Adding user attributes...");
        try { await databases.createStringAttribute(DATABASE_ID, "users", "email", 256, false); } catch (e: any) {}
        try { await databases.createStringAttribute(DATABASE_ID, "users", "name", 256, false); } catch (e: any) {}
        try { await databases.createBooleanAttribute(DATABASE_ID, "users", "isAdmin", false); } catch (e: any) {}
        console.log("✅ User attributes added");

        // 4. Add Attributes to Products
        console.log("\n🍔 Adding product attributes...");
        try { await databases.createStringAttribute(DATABASE_ID, "products", "name", 256, false); } catch (e: any) {}
        try { await databases.createStringAttribute(DATABASE_ID, "products", "description", 1000, true); } catch (e: any) {}
        try { await databases.createStringAttribute(DATABASE_ID, "products", "category", 256, false); } catch (e: any) {}
        try { await databases.createIntegerAttribute(DATABASE_ID, "products", "price", false); } catch (e: any) {}
        try { await databases.createStringAttribute(DATABASE_ID, "products", "foodType", 20, false, "veg", ["veg", "egg", "nonveg"]); } catch (e: any) {}
        try { await databases.createStringAttribute(DATABASE_ID, "products", "image", 10000, true); } catch (e: any) {}
        try { await databases.createBooleanAttribute(DATABASE_ID, "products", "available", false); } catch (e: any) {}
        console.log("✅ Product attributes added");

        // 5. Add Attributes to Orders
        console.log("\n📝 Adding order attributes...");
        try { await databases.createStringAttribute(DATABASE_ID, "orders", "orderNumber", 256, false); } catch (e: any) {}
        try { await databases.createStringAttribute(DATABASE_ID, "orders", "customerPhone", 20, true); } catch (e: any) {}
        try { await databases.createIntegerAttribute(DATABASE_ID, "orders", "subtotal", false); } catch (e: any) {}
        try { await databases.createIntegerAttribute(DATABASE_ID, "orders", "discount", false); } catch (e: any) {}
        try { await databases.createIntegerAttribute(DATABASE_ID, "orders", "gst", false); } catch (e: any) {}
        try { await databases.createIntegerAttribute(DATABASE_ID, "orders", "grandTotal", false); } catch (e: any) {}
        try { await databases.createStringAttribute(DATABASE_ID, "orders", "status", 50, false); } catch (e: any) {}
        try { await databases.createStringAttribute(DATABASE_ID, "orders", "userId", 256, true); } catch (e: any) {}
        try { await databases.createDatetimeAttribute(DATABASE_ID, "orders", "createdAt", false); } catch (e: any) {}
        try { await databases.createJsonAttribute(DATABASE_ID, "orders", "items", false); } catch (e: any) {}
        console.log("✅ Order attributes added");

        // 6. Add Attributes to Profiles
        console.log("\n👤 Adding profile attributes...");
        try { await databases.createStringAttribute(DATABASE_ID, "profiles", "userId", 256, false); } catch (e: any) {}
        try { await databases.createStringAttribute(DATABASE_ID, "profiles", "phone", 20, false); } catch (e: any) {}
        try { await databases.createStringAttribute(DATABASE_ID, "profiles", "alternatePhone", 20, true); } catch (e: any) {}
        try { await databases.createStringAttribute(DATABASE_ID, "profiles", "dateOfBirth", 20, true); } catch (e: any) {}
        try { await databases.createStringAttribute(DATABASE_ID, "profiles", "gender", 20, true); } catch (e: any) {}
        console.log("✅ Profile attributes added");

        // 7. Add Attributes to Addresses
        console.log("\n🏠 Adding address attributes...");
        try { await databases.createStringAttribute(DATABASE_ID, "addresses", "userId", 256, false); } catch (e: any) {}
        try { await databases.createStringAttribute(DATABASE_ID, "addresses", "label", 50, false); } catch (e: any) {}
        try { await databases.createStringAttribute(DATABASE_ID, "addresses", "fullAddress", 1000, false); } catch (e: any) {}
        try { await databases.createStringAttribute(DATABASE_ID, "addresses", "city", 100, false); } catch (e: any) {}
        try { await databases.createStringAttribute(DATABASE_ID, "addresses", "state", 100, true); } catch (e: any) {}
        try { await databases.createStringAttribute(DATABASE_ID, "addresses", "pincode", 10, false); } catch (e: any) {}
        try { await databases.createStringAttribute(DATABASE_ID, "addresses", "phone", 20, true); } catch (e: any) {}
        try { await databases.createBooleanAttribute(DATABASE_ID, "addresses", "isDefault", false); } catch (e: any) {}
        console.log("✅ Address attributes added");

        // 8. Create Storage Bucket
        console.log("\n🗄️ Creating storage bucket...");
        try {
            await storage.createBucket("product-images", "product-images", ["*.png", "*.jpg", "*.jpeg", "*.webp"], true);
            console.log("✅ Storage bucket created");
        } catch (e: any) {
            console.log("ℹ️  Bucket:", e.message || e.code);
        }

        console.log("\n🎉 Setup complete!");

    } catch (error) {
        console.error("❌ Error:", error);
    }
}

setup();
