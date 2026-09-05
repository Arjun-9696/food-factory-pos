// ============================================================================
// GET /api/admin/coins/stats — Admin loyalty dashboard statistics.
// ============================================================================
import type { IncomingMessage, ServerResponse } from "node:http";
import { allowMethod, sendJson, sendError } from "../../lib/http";
import { resolveIdentity } from "../../lib/identity";
import { getServerSupabase } from "../../lib/supabase";
import { adminGetAllCoins, adminGetCustomerCoins } from "../../lib/coins";

const ADMIN_EMAIL = "urbancodersofficial@gmail.com";

async function verifyAdmin(accessToken: string | undefined): Promise<boolean> {
  const identity = await resolveIdentity(accessToken);
  if (!identity.authenticated) return false;

  const supabase = getServerSupabase();
  const { data: user } = await supabase
    .from("users")
    .select("email, role")
    .eq("id", identity.userId)
    .maybeSingle();

  return user?.email?.toLowerCase() === ADMIN_EMAIL || user?.role === "admin";
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (!allowMethod(req, res, "GET")) return;

  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const accessToken = url.searchParams.get("accessToken") || undefined;
  const customerId = url.searchParams.get("customerId") || undefined;

  if (!(await verifyAdmin(accessToken))) {
    return sendError(res, 403, "Admin access required.", "FORBIDDEN");
  }

  try {
    if (customerId) {
      // Get specific customer's coin details
      const details = await adminGetCustomerCoins(customerId);
      if (!details) {
        return sendError(res, 404, "Customer not found.", "CUSTOMER_NOT_FOUND");
      }
      sendJson(res, 200, details);
    } else {
      // Get aggregate stats
      const stats = await adminGetAllCoins();
      sendJson(res, 200, stats);
    }
  } catch (err) {
    console.error("[ADMIN_COINS_STATS] Error:", err);
    sendError(res, 500, "Failed to load coin stats.", "STATS_ERROR");
  }
}
