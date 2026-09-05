// ============================================================================
// POST /api/admin/coins/adjust — Admin manual coin adjustment.
// ============================================================================
import type { IncomingMessage, ServerResponse } from "node:http";
import { allowMethod, isJsonRequest, readJsonBody, sendJson, sendError } from "../../lib/http";
import { resolveIdentity } from "../../lib/identity";
import { getServerSupabase } from "../../lib/supabase";
import { adminAdjustCoins } from "../../lib/coins";

const ADMIN_EMAIL = "urbancodersofficial@gmail.com";

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (!allowMethod(req, res, "POST")) return;
  if (!isJsonRequest(req)) return sendError(res, 415, "Content-Type must be application/json", "INVALID_CONTENT_TYPE");

  const body = await readJsonBody(req);
  if (!body || typeof body !== "object") {
    return sendError(res, 400, "Invalid request body.", "INVALID_BODY");
  }

  const { userId, amount, reason, accessToken } = body as Record<string, unknown>;

  if (typeof userId !== "string" || userId.length === 0) {
    return sendError(res, 400, "User ID is required.", "INVALID_USER_ID");
  }
  if (typeof amount !== "number" || !Number.isInteger(amount) || amount === 0) {
    return sendError(res, 400, "Amount must be a non-zero integer.", "INVALID_AMOUNT");
  }
  if (Math.abs(amount) > 10000) {
    return sendError(res, 400, "Adjustment amount cannot exceed 10,000 coins.", "AMOUNT_TOO_LARGE");
  }
  if (typeof reason !== "string" || reason.trim().length === 0) {
    return sendError(res, 400, "Reason is required.", "REASON_REQUIRED");
  }

  // Verify admin
  const identity = await resolveIdentity(typeof accessToken === "string" ? accessToken : undefined);
  if (!identity.authenticated) {
    return sendError(res, 401, "Authentication required.", "UNAUTHORIZED");
  }

  const supabase = getServerSupabase();
  const { data: adminUser } = await supabase
    .from("users")
    .select("email, role")
    .eq("id", identity.userId)
    .maybeSingle();

  const isAdmin = adminUser?.email?.toLowerCase() === ADMIN_EMAIL || adminUser?.role === "admin";
  if (!isAdmin) {
    return sendError(res, 403, "Admin access required.", "FORBIDDEN");
  }

  try {
    const result = await adminAdjustCoins(userId, amount, reason.trim());
    if (!result.success) {
      return sendError(res, 400, "Adjustment failed. Check user balance.", "ADJUSTMENT_FAILED");
    }
    sendJson(res, 200, { success: true, newBalance: result.newBalance });
  } catch (err) {
    console.error("[ADMIN_COIN_ADJUST] Error:", err);
    sendError(res, 500, "Failed to adjust coins.", "ADJUST_ERROR");
  }
}
