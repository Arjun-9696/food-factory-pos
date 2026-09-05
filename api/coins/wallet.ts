// ============================================================================
// GET /api/coins/wallet — Customer coin wallet information.
// Returns balance, rupee value, redemption eligibility, and progress.
// ============================================================================
import type { IncomingMessage, ServerResponse } from "node:http";
import { allowMethod, sendJson, sendError } from "../lib/http";
import { resolveIdentity } from "../lib/identity";
import { getCoinBalance } from "../lib/coins";

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (!allowMethod(req, res, "GET")) return;

  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const accessToken = url.searchParams.get("accessToken") || undefined;

  const identity = await resolveIdentity(accessToken);
  if (!identity.authenticated) {
    return sendError(res, 401, "Authentication required.", "UNAUTHORIZED");
  }

  try {
    const wallet = await getCoinBalance(identity.userId, identity.accessToken);
    sendJson(res, 200, wallet);
  } catch (err) {
    console.error("[COINS_WALLET] Error:", err);
    sendError(res, 500, "Failed to load coin wallet.", "WALLET_ERROR");
  }
}
