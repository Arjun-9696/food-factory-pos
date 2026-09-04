import { useEffect, useState, useCallback } from "react";
import { type MenuItem, menuItems as fallbackMenuItems, categories as fallbackCategories } from "@/data/menu";
import { loadAllProducts } from "@/lib/productsApi";
import { supabase } from "@/lib/supabaseClient";
import { CATEGORY_EMOJI_MAP } from "@/data/categories";

export interface CategoryData {
  name: string;
  emoji: string;
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
        data.forEach((doc: { name?: string; emoji?: string }) => {
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

  const fetchProducts = useCallback(async (options?: { fresh?: boolean }) => {
    setLoading(true);
    try {
      // Shared cached loader — dedupes concurrent requests and avoids
      // refetching when navigating between the menu and product pages.
      const { items: allItems, ok } = await loadAllProducts(options);

      if (!ok) {
        // Supabase not configured or unreachable — exact legacy fallback behavior.
        setProducts(fallbackMenuItems);
        setCategories([...fallbackCategories] as string[]);
        setCategoryEmojis(CATEGORY_EMOJI_MAP);
        return;
      }

      // Storefront shows only available items (query previously filtered this).
      const items = allItems.filter((p) => p.available !== false);
      setProducts(items);

      const productCategories = Array.from(new Set(items.map((p) => p.category))).sort();
      const categoriesData = await fetchCategoriesFromDB(productCategories);

      setCategories(categoriesData.names);
      setCategoryEmojis(categoriesData.emojis);
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(() => {
    fetchProducts({ fresh: true });
  }, [fetchProducts]);

  return { products, categories, categoryEmojis, loading, refresh };
}
