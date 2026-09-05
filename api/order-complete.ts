// ============================================================================
// POST /api/order-complete — Admin order status update with coin awarding.
// Replaces the direct Supabase client update in the admin Orders page.
// Ensures coins are awarded server-side when an order transitions to "completed".
// ============================================================================
import type { IncomingMessage, ServerResponse } from "node:http";
import { allowMethod, isJsonRequest, readJsonBody, sendJson, sendError } from "./lib/http";
import { resolveIdentity } from "./lib/identity";
import { getServerSupabase } from "./lib/supabase";
import { earnCoinsForCompletedOrder, reverseCoinsForOrder } from "./lib/coins";

const VALID_STATUSES = ["pending", "preparing", "ready", "completed", "cancelled"];
const ADMIN_EMAIL = "urbancodersofficial@gmail.com";

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (!allowMethod(req, res, "POST")) return;
  if (!isJsonRequest(req)) return sendError(res, 415, "Content-Type must be application/json", "INVALID_CONTENT_TYPE");

  const body = await readJsonBody(req);
  if (!body || typeof body !== "object") {
    return sendError(res, 400, "Invalid request body.", "INVALID_BODY");
  }

  const { orderId, status, accessToken } = body as Record<string, unknown>;

  if (typeof orderId !== "string" || orderId.length === 0) {
    return sendError(res, 400, "Order ID is required.", "INVALID_ORDER_ID");
  }
  if (typeof status !== "string" || !VALID_STATUSES.includes(status)) {
    return sendError(res, 400, "Invalid order status.", "INVALID_STATUS");
  }

  // Verify admin identity
  const identity = await resolveIdentity(typeof accessToken === "string" ? accessToken : undefined);
  if (!identity.authenticated) {
    return sendError(res, 401, "Authentication required.", "UNAUTHORIZED");
  }

  // Check if user is admin
  const supabase = getServerSupabase();
  const { data: user } = await supabase
    .from("users")
    .select("email, role")
    .eq("id", identity.userId)
    .maybeSingle();

  const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL || user?.role === "admin";
  if (!isAdmin) {
    return sendError(res, 403, "Admin access required.", "FORBIDDEN");
  }

  // Fetch current order
  const { data: order, error: fetchError } = await supabase
    .from("orders")
    .select("id, status, user_id")
    .eq("id", orderId)
    .maybeSingle();

  if (fetchError || !order) {
    return sendError(res, 404, "Order not found.", "ORDER_NOT_FOUND");
  }

  const previousStatus = order.status;
  const now = new Date().toISOString();

  // Build update payload
  const timestampField = `${status}_at`;
  const updatePayload: Record<string, unknown> = {
    status,
    updated_at: now,
    [timestampField]: now,
  };

  // Update order status
  const { error: updateError } = await supabase
    .from("orders")
    .update(updatePayload)
    .eq("id", orderId);

  if (updateError) {
    console.error("[ORDER_COMPLETE] Update error:", updateError);
    return sendError(res, 500, "Failed to update order status.", "UPDATE_FAILED");
  }

  // Award coins if newly completed
  let coinResult = null;
  if (status === "completed" && previousStatus !== "completed") {
    coinResult = await earnCoinsForCompletedOrder(orderId);
    console.log(`[ORDER_COMPLETE] Order ${orderId} completed. Coin result:`, coinResult);
  }

  // Reverse coins if an order with earned coins is being cancelled after completion
  if (status === "cancelled" && previousStatus === "completed") {
    coinResult = await reverseCoinsForOrder(orderId, `Coins reversed for cancelled order #${orderId}`);
    console.log(`[ORDER_COMPLETE] Order ${orderId} cancelled after completion. Coin reversal:`, coinResult);
  }

  sendJson(res, 200, {
    success: true,
    orderId,
    previousStatus,
    newStatus: status,
    coins: coinResult,
  });
}
