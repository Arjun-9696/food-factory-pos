// ============================================================================
// Server-side customer identity resolution.
//
// The frontend can attach the customer's Supabase JWT (`accessToken`). When a
// valid token is present we resolve the REAL account identity from the
// database (public.users / public.profiles) and pin the checkout to it — the
// browser-provided customer name/phone are never blindly trusted for an
// authenticated customer.
//
// Account reads/writes are executed through a user-scoped client (the JWT is
// attached), because the project's RLS policies scope `users` and `profiles`
// access to `auth.uid()`.
//
// An invalid/expired token is treated as "not authenticated" (guest checkout):
// the payment still works, but no identity is attached to the order.
// ============================================================================
import { createClient } from "@supabase/supabase-js";
import { getServerSupabase } from "./supabase";
import { supabaseKey, supabaseUrl } from "./env";

export interface ResolvedIdentity {
  /** Whether a valid Supabase session was verified. */
  authenticated: boolean;
  /** Supabase auth user id (also the public.users.id used across the app). */
  userId?: string;
  /** Canonical display name from the account (metadata → profiles → users). */
  name?: string;
  /** Stored contact phone from the account (profiles.phone → users.phone). */
  phone?: string;
  /** The verified JWT itself (re-usable for user-scoped profile access). */
  accessToken?: string;
}

/** Supabase client that acts as the given user (sets auth.uid() for RLS). */
export function createUserScopedClient(accessToken: string) {
  return createClient(supabaseUrl(), supabaseKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

export async function resolveIdentity(accessToken: unknown): Promise<ResolvedIdentity> {
  if (typeof accessToken !== "string" || accessToken.length === 0) {
    return { authenticated: false };
  }

  try {
    const { data, error } = await getServerSupabase().auth.getUser(accessToken);
    if (error || !data?.user?.id) {
      return { authenticated: false };
    }

    const userId = data.user.id;
    const metadata = data.user.user_metadata as Record<string, unknown> | undefined;

    // Best-effort account lookups — network/rls hiccups must not break checkout.
    let userRow: { name?: string | null; phone?: string | null } | null = null;
    let profileRow: { full_name?: string | null; phone?: string | null } | null = null;
    try {
      const scoped = createUserScopedClient(accessToken);
      const [u, p] = await Promise.all([
        scoped.from("users").select("name, phone").eq("id", userId).maybeSingle(),
        scoped.from("profiles").select("full_name, phone").eq("user_id", userId).maybeSingle(),
      ]);
      userRow = (u.data ?? null) as typeof userRow;
      profileRow = (p.data ?? null) as typeof profileRow;
    } catch {
      // fall through with metadata defaults
    }

    let name = "";
    if (typeof metadata?.name === "string" && metadata.name.trim()) name = metadata.name.trim();
    else if (typeof metadata?.full_name === "string" && metadata.full_name.trim()) name = metadata.full_name.trim();
    if (!name && profileRow?.full_name) name = String(profileRow.full_name).trim();
    if (!name && userRow?.name) name = String(userRow.name).trim();

    let phone = "";
    if (profileRow?.phone) phone = String(profileRow.phone).trim();
    if (!phone && userRow?.phone) phone = String(userRow.phone).trim();

    return { authenticated: true, userId, name: name || undefined, phone: phone || undefined, accessToken };
  } catch {
    return { authenticated: false };
  }
}