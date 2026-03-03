import { Client, Account, Databases, Storage, Teams, ID, Models } from "appwrite";

const PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID || "69a4a8c0000576de77cf";
const ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT || "https://nyc.cloud.appwrite.io/v1";
const STORAGE_BUCKET_ID = import.meta.env.VITE_APPWRITE_STORAGE_ID || "product-images";

const DATABASE_ID = "food-factory-pos";
const USERS_COLLECTION = "users";
const PRODUCTS_COLLECTION = "products";
const ORDERS_COLLECTION = "orders";

export const client = new Client()
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT_ID);

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
export const teams = new Teams(client);

export const APPWRITE_CONFIG = {
    PROJECT_ID,
    ENDPOINT,
    DATABASE_ID,
    USERS_COLLECTION,
    PRODUCTS_COLLECTION,
    ORDERS_COLLECTION,
    PROFILES_COLLECTION: "profiles",
    IMAGES_BUCKET: STORAGE_BUCKET_ID,
};

export function getProductImageUrl(imagePath: string): string {
    if (!imagePath) return "";
    if (imagePath.startsWith('data:') || imagePath.startsWith('http') && !imagePath.includes('/storage/')) {
        return imagePath;
    }
    if (imagePath.includes('/storage/')) {
        const fileId = imagePath.split('/files/')[1]?.split('/')[0];
        if (fileId) {
            return storage.getFilePreview(STORAGE_BUCKET_ID, fileId).toString();
        }
    }
    return imagePath;
}

// Setup database and collections
export async function setupAppwrite() {
    try {
        // Use fetch to create database via API
        const response = await fetch(`${ENDPOINT}/databases/${DATABASE_ID}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Appwrite-Project': PROJECT_ID,
            },
            body: JSON.stringify({ name: 'Food Factory POS' })
        }).catch(() => null);

        // Create products collection
        await fetch(`${ENDPOINT}/databases/${DATABASE_ID}/collections`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Appwrite-Project': PROJECT_ID,
            },
            body: JSON.stringify({ 
                name: 'Products',
                documentSecurity: false,
                enabled: true 
            })
        }).catch(() => {});

        return true;
    } catch (error) {
        console.error("Setup error:", error);
        return false;
    }
}
