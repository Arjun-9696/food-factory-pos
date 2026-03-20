import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const SUPABASE_CONFIG = {
  PRODUCTS_TABLE: "products",
  PROFILES_TABLE: "profiles",
  ORDERS_TABLE: "orders",
  ORDER_ITEMS_TABLE: "order_items",
  CATEGORIES_TABLE: "categories",
};

export function getOptimizedImageUrl(url: string, width = 500): string {
  if (!url) return "";
  if (!url.includes("cloudinary.com")) return url;
  
  const parts = url.split("/upload/");
  if (parts.length !== 2) return url;
  
  return `${parts[0]}/upload/w_${width},c_fill,f_auto,q_auto/${parts[1]}`;
}
