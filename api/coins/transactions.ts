// ============================================================================
// GET /api/coins/transactions — Paginated coin transaction history.
// ============================================================================
import type { IncomingMessage, ServerResponse } from "node:http";
import { allowMethod, sendJson, sendError } from "../lib/http";
import { resolveIdentity } from "../lib/identity";
import { getCoinTransactions } from "../lib/coins";

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (!allowMethod(req, res, "GET")) return;

  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const accessToken = url.searchParams.get("accessToken") || undefined;
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") || "20", 10)));

  const identity = await resolveIdentity(accessToken);
  if (!identity.authenticated) {
    return sendError(res, 401, "Authentication required.", "UNAUTHORIZED");
  }

  try {
    const result = await getCoinTransactions(identity.userId, page, limit, identity.accessToken);
    sendJson(res, 200, result);
  } catch (err) {
    console.error("[COINS_TRANSACTIONS] Error:", err);
    sendError(res, 500, "Failed to load transactions.", "TRANSACTIONS_ERROR");
  }
}
