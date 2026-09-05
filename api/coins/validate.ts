// ============================================================================
// POST /api/coins/validate — Validate coin redemption eligibility at checkout.
// Server-side validation: never trusts the browser for coin amounts.
// ============================================================================
import type { IncomingMessage, ServerResponse } from "node:http";
import { allowMethod, isJsonRequest, readJsonBody, sendJson, sendError } from "../lib/http";
import { resolveIdentity } from "../lib/identity";
import { validateRedemption } from "../lib/coins";

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (!allowMethod(req, res, "POST")) return;
  if (!isJsonRequest(req)) return sendError(res, 415, "Content-Type must be application/json", "INVALID_CONTENT_TYPE");

  const body = await readJsonBody(req);
  if (!body || typeof body !== "object") {
    return sendError(res, 400, "Invalid request body.", "INVALID_BODY");
  }

  const { accessToken } = body as Record<string, unknown>;

  const identity = await resolveIdentity(typeof accessToken === "string" ? accessToken : undefined);
  if (!identity.authenticated) {
    return sendError(res, 401, "Authentication required.", "UNAUTHORIZED");
  }

  try {
    const result = await validateRedemption(identity.userId, identity.accessToken);
    sendJson(res, 200, result);
  } catch (err) {
    console.error("[COINS_VALIDATE] Error:", err);
    sendError(res, 500, "Failed to validate redemption.", "VALIDATE_ERROR");
  }
}
