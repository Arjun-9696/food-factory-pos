import { useEffect, useState, useCallback } from "react";
import { databases, storage, APPWRITE_CONFIG } from "@/lib/appwrite";
import { Query, ID } from "appwrite";
import type { MenuItem } from "@/data/menu";
import { getCategoryEmoji, CATEGORY_EMOJI_MAP } from "@/data/categories";

export interface CategoryData {
  name: string;
  emoji: string;
}

function getImageUrl(image: string): string {
  if (!image) return "";
  if (image.startsWith('data:') || image.startsWith('blob:')) return image;
  if (image.startsWith('http')) return image;
  
  const bucketId = APPWRITE_CONFIG.IMAGES_BUCKET;
  const projectId = APPWRITE_CONFIG.PROJECT_ID;
  const endpoint = APPWRITE_CONFIG.ENDPOINT;
  return `${endpoint}/storage/buckets/${bucketId}/files/${image}/view?project=${projectId}`;
}

export function useProducts() {
  const [products, setProducts] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>(["All"]);
  const [categoryEmojis, setCategoryEmojis] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchCategoriesFromDB = async (productCategories: string[]): Promise<{ names: string[]; emojis: Record<string, string> }> => {
    try {
      const response = await databases.listDocuments(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.CATEGORIES_COLLECTION,
        [Query.limit(100), Query.orderAsc("name")]
      );

      const dbEmojis: Record<string, string> = { ...CATEGORY_EMOJI_MAP };
      const dbNames: string[] = ["All"];

      if (response.documents.length > 0) {
        response.documents.forEach((doc: any) => {
          if (doc.name) {
            dbNames.push(doc.name);
            dbEmojis[doc.name] = doc.emoji || CATEGORY_EMOJI_MAP[doc.name] || "🍴";
          }
        });
        return { names: dbNames, emojis: dbEmojis };
      }

      // If no categories in DB, create from products
      for (const catName of productCategories) {
        try {
          const emoji = CATEGORY_EMOJI_MAP[catName] || "🍴";
          await databases.createDocument(
            APPWRITE_CONFIG.DATABASE_ID,
            APPWRITE_CONFIG.CATEGORIES_COLLECTION,
            ID.unique(),
            { name: catName, emoji }
          );
          dbEmojis[catName] = emoji;
        } catch (e) {
          dbEmojis[catName] = CATEGORY_EMOJI_MAP[catName] || "🍴";
        }
      }

      return { names: ["All", ...productCategories], emojis: dbEmojis };
    } catch (error) {
      // If categories collection doesn't exist, use products + defaults
      const fallbackEmojis: Record<string, string> = { ...CATEGORY_EMOJI_MAP };
      productCategories.forEach(cat => {
        if (!fallbackEmojis[cat]) {
          fallbackEmojis[cat] = "🍴";
        }
      });
      return { names: ["All", ...productCategories], emojis: fallbackEmojis };
    }
  };

  const fetchProducts = useCallback(async () => {
    try {
      const productsResponse = await databases.listDocuments(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.PRODUCTS_COLLECTION,
        [Query.limit(500), Query.equal("available", true), Query.orderAsc("category")]
      );

      const items: MenuItem[] = productsResponse.documents.map((doc: any) => ({
        id: doc.$id,
        name: doc.name,
        description: doc.description || "",
        category: doc.category,
        price: Number(doc.price),
        foodType: doc.foodType || (doc.isVeg === true ? "veg" : doc.isVeg === false ? "nonveg" : "veg"),
        image: getImageUrl(doc.image),
        available: doc.available,
      }));

      setProducts(items);
      
      // Get unique categories from products
      const productCategories = Array.from(new Set(items.map((p) => p.category))).sort();
      
      // Fetch categories from DB (will create if empty)
      const categoriesData = await fetchCategoriesFromDB(productCategories);
      
      setCategories(categoriesData.names);
      setCategoryEmojis(categoriesData.emojis);
    } catch (error) {
      const { menuItems, categories: cats } = await import("@/data/menu");
      setProducts(menuItems);
      setCategories([...cats] as string[]);
      setCategoryEmojis(CATEGORY_EMOJI_MAP);
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(() => {
    setLoading(true);
    fetchProducts();
  }, []);

  return { products, categories, categoryEmojis, loading, refresh };
}
