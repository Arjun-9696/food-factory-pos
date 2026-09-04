// ============================================================================
// POST /api/webhooks/razorpay
//
// Additional server-side payment confirmation, independent of the browser.
// Handles the case where the customer's payment succeeds but their browser
// disconnects before the frontend verification request completes.
//
// - Signature verified with the Razorpay webhook secret (never trust the body).
// - Idempotent: duplicate webhooks and verify-then-webhook races are safe.
// - Always responds quickly (Razorpay requires a fast <fast 2xx> response).
// ============================================================================
import type { IncomingMessage, ServerResponse } from "node:http";
import { allowMethod, readRawBody, sendError, sendJson } from "../lib/http";
import { verifyWebhookSignature } from "../lib/razorpay";
import {
  findPaymentByRazorpayOrderId,
  finalizePaidPayment,
  markPaymentFailed,
} from "../lib/payments";
import { razorpayWebhookSecret } from "../lib/env";

interface RazorpayWebhookEvent {
  event?: string;
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        order_id?: string;
        amount?: number;
        currency?: string;
        status?: string;
      };
    };
    order?: {
      entity?: {
        id?: string;
        amount?: number;
        currency?: string;
      };
    };
  };
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (!allowMethod(req, res, "POST")) return;

  if (!razorpayWebhookSecret()) {
    console.error("webhook: RAZORPAY_WEBHOOK_SECRET not configured.");
    sendError(res, 500, "Webhook is not configured.", "WEBHOOK_NOT_CONFIGURED");
    return;
  }

  let rawBody: string;
  try {
    rawBody = await readRawBody(req);
  } catch (err) {
    const code = err instanceof Error ? err.message : "READ_FAILED";
    sendError(res, code === "PAYLOAD_TOO_LARGE" ? 413 : 400, "Invalid webhook body.", code === "PAYLOAD_TOO_LARGE" ? "PAYLOAD_TOO_LARGE" : "INVALID_BODY");
    return;
  }

  const signature = req.headers["x-razorpay-signature"];
  if (typeof signature !== "string" || !verifyWebhookSignature(rawBody, signature)) {
    console.error("webhook: signature verification FAILED for an incoming event.");
    sendError(res, 400, "Invalid webhook signature.", "WEBHOOK_SIGNATURE_MISMATCH");
    return;
  }

  let event: RazorpayWebhookEvent;
  try {
    event = JSON.parse(rawBody || "{}") as RazorpayWebhookEvent;
  } catch {
    sendError(res, 400, "Invalid webhook JSON.", "INVALID_JSON");
    return;
  }

  try {
    await handleEvent(event);
  } catch (err) {
    console.error("webhook: processing error", err instanceof Error ? err.message : err);
  }

  // Always acknowledge quickly — Razorpay retries on non-2xx and we are idempotent.
  sendJson(res, 200, { success: true, received: true });
}

async function handleEvent(event: RazorpayWebhookEvent): Promise<void> {
  const eventName = event.event || "";

  switch (eventName) {
    case "payment.captured":
    case "order.paid": {
      const entity =
        eventName === "payment.captured"
          ? event.payload?.payment?.entity
          : event.payload?.order?.entity;
      const razorpayOrderId = entity?.order_id || entity?.id;
      const razorpayPaymentId = eventName === "payment.captured" ? entity?.id : null;
      const razorpayAmountPaise = Number(entity?.amount) || 0;

      if (!razorpayOrderId) {
        console.error(`webhook: ${eventName} without an order id.`);
        return;
      }

      console.log(`webhook received { event: "${eventName}", razorpayOrderId: "${razorpayOrderId}" }`);

      const record = await findPaymentByRazorpayOrderId(razorpayOrderId);
      if (!record) {
        console.error(`webhook: no matching payment record { razorpayOrderId: "${razorpayOrderId}" }`);
        return;
      }

      if (record.payment_status === "paid" && record.ff_order_number) {
        console.log(`webhook: duplicate/verified event ignored { razorpayOrderId: "${razorpayOrderId}" }`);
        return;
      }

      if (razorpayAmountPaise && razorpayAmountPaise !== record.amount_paise) {
        console.error(`webhook: AMOUNT MISMATCH { razorpayOrderId: "${razorpayOrderId}", expected: ${record.amount_paise}, got: ${razorpayAmountPaise} }`);
        return;
      }

      if (record.payment_status === "failed") {
        console.log(`webhook: ignoring payment for a failed record { razorpayOrderId: "${razorpayOrderId}" }`);
        return;
      }

      const finalized = await finalizePaidPayment(record, {
        razorpayPaymentId: razorpayPaymentId ?? record.razorpay_payment_id ?? "",
        razorpaySignature: null,
      });
      console.log(
        `webhook: payment confirmed { event: "${eventName}", foodFactoryOrderId: "${finalized.orderNumber}", razorpayOrderId: "${razorpayOrderId}" }`,
      );
      return;
    }

    case "payment.failed": {
      const entity = event.payload?.payment?.entity;
      const razorpayOrderId = entity?.order_id;
      const razorpayPaymentId = entity?.id || null;
      if (!razorpayOrderId) return;

      const record = await findPaymentByRazorpayOrderId(razorpayOrderId);
      if (!record || record.payment_status === "paid") return;

      await markPaymentFailed(razorpayOrderId, razorpayPaymentId);
      console.log(`webhook: payment failed recorded { razorpayOrderId: "${razorpayOrderId}" }`);
      return;
    }

    default:
      // Events we don't need (e.g. payment.authorized) are acknowledged harmlessly.
      console.log(`webhook received unhandled event { event: "${eventName}" }`);
  }
}