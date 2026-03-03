import { useEffect, useState } from "react";
import { databases, storage, APPWRITE_CONFIG } from "@/lib/appwrite";
import { Query } from "appwrite";
import type { MenuItem } from "@/data/menu";

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await databases.listDocuments(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.PRODUCTS_COLLECTION,
        [Query.limit(500), Query.equal("available", true), Query.orderAsc("category")]
      );

      const items: MenuItem[] = response.documents.map((doc: any) => ({
        id: doc.$id,
        name: doc.name,
        description: doc.description || "",
        category: doc.category,
        price: Number(doc.price),
        isVeg: doc.isVeg,
        image: getImageUrl(doc.image),
        available: doc.available,
      }));

      setProducts(items);
      const cats = ["All", ...Array.from(new Set(items.map((p) => p.category)))];
      setCategories(cats);
    } catch (error) {
      // Fallback to menu.ts
      import("@/data/menu").then(({ menuItems, categories: cats }) => {
        setProducts(menuItems);
        setCategories([...cats] as string[]);
      });
    } finally {
      setLoading(false);
    }
  };

  return { products, categories, loading };
}
