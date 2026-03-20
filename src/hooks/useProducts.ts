import { useEffect, useState, useCallback } from "react";
import { supabase, SUPABASE_CONFIG } from "@/lib/supabaseClient";
import type { MenuItem } from "@/data/menu";
import { CATEGORY_EMOJI_MAP } from "@/data/categories";

export interface CategoryData {
  name: string;
  emoji: string;
}

function getImageUrl(image: string): string {
  if (!image) return "";
  if (image.startsWith('data:') || image.startsWith('blob:')) return image;
  if (image.startsWith('http')) return image;
  return image;
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
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name", { ascending: true });

      if (error) {
        console.error("Categories fetch error:", error);
        throw error;
      }

      const dbEmojis: Record<string, string> = { ...CATEGORY_EMOJI_MAP };
      const dbNames: string[] = ["All"];
      const dbCategoryNames = new Set<string>();

      if (data && data.length > 0) {
        data.forEach((doc: any) => {
          if (doc.name) {
            dbCategoryNames.add(doc.name);
            dbNames.push(doc.name);
            dbEmojis[doc.name] = doc.emoji || CATEGORY_EMOJI_MAP[doc.name] || "🍴";
          }
        });
      }

      for (const catName of productCategories) {
        if (!dbCategoryNames.has(catName)) {
          const emoji = CATEGORY_EMOJI_MAP[catName] || "🍴";
          dbNames.push(catName);
          dbEmojis[catName] = emoji;
          try {
            await supabase
              .from("categories")
              .insert({ name: catName, emoji });
          } catch (e) {
            // Ignore duplicate errors
          }
        }
      }

      const sortedNames = dbNames.slice(1).sort((a, b) => a.localeCompare(b));
      return { names: ["All", ...sortedNames], emojis: dbEmojis };
    } catch (error) {
      console.error("Error fetching categories:", error);
      const fallbackEmojis: Record<string, string> = { ...CATEGORY_EMOJI_MAP };
      productCategories.forEach(cat => {
        if (!fallbackEmojis[cat]) {
          fallbackEmojis[cat] = "🍴";
        }
      });
      const sortedCats = [...productCategories].sort((a, b) => a.localeCompare(b));
      return { names: ["All", ...sortedCats], emojis: fallbackEmojis };
    }
  };

  const fetchProducts = useCallback(async () => {
    try {
      console.log("Fetching products from Supabase...");
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("*")
        .eq("available", true)
        .order("category", { ascending: true });

      if (productsError) {
        console.error("Products fetch error:", productsError);
        throw productsError;
      }

      console.log("Products fetched:", productsData?.length);

      const items: MenuItem[] = (productsData || []).map((doc: any) => ({
        id: doc.id,
        name: doc.name,
        description: doc.description || "",
        category: doc.category,
        price: Number(doc.price) || 0,
        foodType: doc.food_type || "veg",
        image: getImageUrl(doc.image),
        available: doc.available,
      }));

      setProducts(items);
      
      const productCategories = Array.from(new Set(items.map((p) => p.category))).sort();
      const categoriesData = await fetchCategoriesFromDB(productCategories);
      
      setCategories(categoriesData.names);
      setCategoryEmojis(categoriesData.emojis);
    } catch (error) {
      console.error("Error fetching products:", error);
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
