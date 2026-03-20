import { Client, Account, Databases, Storage, Teams, ID, Models } from "appwrite";

const PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID || "69a4a8c0000576de77cf";
const ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT || "https://nyc.cloud.appwrite.io/v1";
const STORAGE_BUCKET_ID = import.meta.env.VITE_APPWRITE_STORAGE_ID || "product-images";

const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID || "food-factory-pos";
const USERS_COLLECTION = "users";
const PRODUCTS_COLLECTION = "products";
const ORDERS_COLLECTION = "orders";
const PROFILES_COLLECTION = "profiles";
const ADDRESSES_COLLECTION = "addresses";
const CATEGORIES_COLLECTION = "categories";

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
    PROFILES_COLLECTION,
    ADDRESSES_COLLECTION,
    CATEGORIES_COLLECTION,
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

const COLLECTIONS = [
    { id: PRODUCTS_COLLECTION, name: 'Products' },
    { id: ORDERS_COLLECTION, name: 'Orders' },
    { id: PROFILES_COLLECTION, name: 'Profiles' },
    { id: ADDRESSES_COLLECTION, name: 'Addresses' },
];

export async function setupAppwrite(): Promise<boolean> {
    try {
        // Create database if not exists
        await fetch(`${ENDPOINT}/databases/${DATABASE_ID}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Appwrite-Project': PROJECT_ID,
                'X-Appwrite-Key': '', // Admin API key would be needed for creation
            },
            body: JSON.stringify({ name: 'Food Factory POS' })
        }).catch(() => null);

        // Create collections
        for (const coll of COLLECTIONS) {
            try {
                await fetch(`${ENDPOINT}/databases/${DATABASE_ID}/collections`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Appwrite-Project': PROJECT_ID,
                    },
                    body: JSON.stringify({ 
                        name: coll.name,
                        documentSecurity: false,
                        enabled: true 
                    })
                }).catch(() => {});
            } catch {}
        }

        return true;
    } catch (error) {
        console.error("Setup error:", error);
        return false;
    }
}
