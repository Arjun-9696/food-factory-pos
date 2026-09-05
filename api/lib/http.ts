// ============================================================================
// Small HTTP helpers shared by every serverless handler.
// Handlers accept plain Node IncomingMessage/ServerResponse so they can run
// under Vercel serverless functions AND the Vite dev middleware unchanged.
// ============================================================================
import type { IncomingMessage, ServerResponse } from "node:http";

const MAX_BODY_BYTES = 1_000_000;

export type ApiHandler = (req: IncomingMessage, res: ServerResponse) => Promise<void>;

/** Reject non-JSON / malformed bodies deterministically. */
export function isJsonRequest(req: IncomingMessage): boolean {
  const contentType = req.headers["content-type"] || "";
  return contentType.includes("application/json") || contentType.includes("application/*") || contentType.includes("+json");
}

export function readRawBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    let settled = false;

    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        settled = true;
        reject(new Error("PAYLOAD_TOO_LARGE"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on("end", () => {
      if (settled) return;
      resolve(Buffer.concat(chunks).toString("utf8"));
    });

    req.on("error", (err) => {
      if (settled) return;
      settled = true;
      reject(err);
    });
  });
}

export function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return readRawBody(req).then((raw) => {
    if (!raw) return {};
    try {
      return JSON.parse(raw);
    } catch {
      throw new Error("INVALID_JSON");
    }
  });
}

export function sendJson(res: ServerResponse, statusCode: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.writeHead(statusCode);
  res.end(payload);
}

/**
 * User-safe error response. Never leaks stack traces, SQL, filesystem paths,
 * Razorpay secrets, or internal keys.
 */
export function sendError(res: ServerResponse, statusCode: number, message: string, code = "ERROR"): void {
  sendJson(res, statusCode, { success: false, code, message });
}

/** Optional use within handlers that are mounted behind a CORS proxy. */
export function allowMethod(req: IncomingMessage, res: ServerResponse, method: string): boolean {
  if (req.method === "OPTIONS") {
    res.setHeader("Allow", `${method}, OPTIONS`);
    sendJson(res, 204, {});
    return false;
  }
  if ((req.method || "GET").toUpperCase() !== method.toUpperCase()) {
    res.setHeader("Allow", method);
    sendError(res, 405, "Method not allowed", "METHOD_NOT_ALLOWED");
    return false;
  }
  return true;
}