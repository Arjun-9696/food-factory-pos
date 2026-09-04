import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import { type FoodType, type MenuItem, type ProductDetails, menuItems as fallbackMenuItems } from "@/data/menu";
import { slugify } from "@/lib/slug";

/**
 * Shared product loading layer.
 * - Single in-flight request (no duplicate fetches across components).
 * - Module-level cache so menu -> PDP navigation never refetches.
 * - `fresh: true` bypasses the cache (used by manual refresh / admin edits).
 */

let cache: MenuItem[] | null = null;
let inflight: Promise<{ items: MenuItem[]; ok: boolean }> | null = null;

export function mapDbProduct(doc: Record<string, unknown>): MenuItem {
  const details = doc.details;
  return {
    id: String(doc.id ?? ""),
    name: String(doc.name ?? ""),
    description: typeof doc.description === "string" ? doc.description : "",
    category: String(doc.category ?? ""),
    price: Number(doc.price) || 0,
    foodType: (doc.food_type as FoodType) || "veg",
    image: typeof doc.image === "string" ? doc.image : "",
    available: doc.available !== false,
    details: details && typeof details === "object" ? (details as ProductDetails) : undefined,
  };
}

export async function loadAllProducts(options?: { fresh?: boolean }): Promise<{ items: MenuItem[]; ok: boolean }> {
  if (options?.fresh) {
    cache = null;
    inflight = null;
  }
  if (cache) return { items: cache, ok: true };
  if (!inflight) {
    inflight = (async () => {
      if (!isSupabaseConfigured()) {
        return { items: fallbackMenuItems, ok: false };
      }
      try {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .order("category", { ascending: true });
        if (error) throw error;
        const items = (data || []).map(mapDbProduct);
        cache = items;
        return { items, ok: true };
      } catch (error) {
        console.error("Error fetching products from database, falling back to local data:", error);
        return { items: fallbackMenuItems, ok: false };
      } finally {
        inflight = null;
      }
    })();
  }
  return inflight;
}

/** Resolve a URL slug to a product. Matches slugified name first, then raw id. */
export function findProductBySlug(products: MenuItem[], slug: string): MenuItem | undefined {
  if (!slug) return undefined;
  const normalized = slug.toLowerCase();
  return (
    products.find((p) => p.name && slugify(p.name) === normalized) ||
    products.find((p) => p.id === slug)
  );
}
