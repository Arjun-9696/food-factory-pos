// ============================================================================
// Server-side Supabase client (single cached instance).
// Only used by API handlers/scripts — never part of the browser bundle.
// ============================================================================
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabaseKey, supabaseUrl } from "./env";

let client: SupabaseClient | null = null;

/** Lazily-created Supabase client for server-side reads/writes. */
export function getServerSupabase(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error("SUPABASE_NOT_CONFIGURED");
  }
  if (!client) {
    client = createClient(supabaseUrl(), supabaseKey(), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}