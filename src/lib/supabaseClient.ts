import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

// Check if Supabase has a working configuration and is NOT pointing to the dead/deleted project
export const isSupabaseConfigured = () => {
  return !!(
    supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes("oyeehgdufyttqxcstdel") &&
    supabaseUrl !== "https://your-project-ref.supabase.co"
  );
};

// Create a dummy mock client to prevent any network requests if not configured or points to dead project
/* eslint-disable @typescript-eslint/no-explicit-any */
const createMockSupabaseClient = () => {
  const mockHandler = {
    get(target: any, prop: string): any {
      if (prop === "auth") {
        return {
          onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
          getSession: async () => ({ data: { session: null }, error: null }),
          signUp: async () => ({ data: { user: null }, error: new Error("Supabase is not configured") }),
          signInWithPassword: async () => ({ data: { user: null }, error: new Error("Supabase is not configured") }),
          signOut: async () => {},
        };
      }
      if (prop === "from") {
        return () => ({
          select: () => ({
            order: () => ({
              limit: () => Promise.resolve({ data: [], error: null }),
              eq: () => Promise.resolve({ data: [], error: null }),
              in: () => Promise.resolve({ data: [], error: null }),
              then: (resolve: any) => resolve({ data: [], error: null }),
            }),
            eq: () => ({
              order: () => Promise.resolve({ data: [], error: null }),
              then: (resolve: any) => resolve({ data: [], error: null }),
            }),
            in: () => Promise.resolve({ data: [], error: null }),
            then: (resolve: any) => resolve({ data: [], error: null }),
          }),
          insert: () => Promise.resolve({ data: [], error: null }),
          upsert: () => Promise.resolve({ data: [], error: null }),
        });
      }
      return () => Promise.resolve({ data: null, error: null });
    }
  };
  return new Proxy({}, mockHandler);
};
/* eslint-enable @typescript-eslint/no-explicit-any */

export const supabase = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createMockSupabaseClient();

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
