// ============================================================================
// Single reusable Razorpay service.
// The SDK is instantiated exactly once per process with the server-only
// credentials. The secret key never leaves this module (and never ships to
// the browser).
//
// Official docs:
//   https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/
// ============================================================================
import Razorpay from "razorpay";
import { createHmac, timingSafeEqual } from "node:crypto";
import {
  isRazorpayConfigured,
  razorpayKeySecret,
  razorpayPublicKeyId,
  razorpayWebhookSecret,
} from "./env";

let client: Razorpay | null = null;

/** Lazily-created, cached Razorpay client. Throws if server-side keys are missing. */
export function getRazorpay(): Razorpay {
  if (!isRazorpayConfigured()) {
    throw new Error("RAZORPAY_NOT_CONFIGURED");
  }
  if (!client) {
    client = new Razorpay({
      key_id: razorpayPublicKeyId(),
      key_secret: razorpayKeySecret(),
    });
  }
  return client;
}

/**
 * Verify the Razorpay Checkout return payload.
 *   expected = HMAC_SHA256(secret, `${orderId}|${paymentId}`)
 * The order id used is the STORED order id (from our DB), never blindly the
 * one echoed back from the browser. Comparison is timing-safe.
 */
export function verifyPaymentSignature(params: {
  storedOrderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const secret = razorpayKeySecret();
  if (!secret || !params.signature) return false;

  const expected = createHmac("sha256", secret)
    .update(`${params.storedOrderId}|${params.paymentId}`)
    .digest("hex");

  const expectedBuffer = Buffer.from(expected, "hex");
  const givenBuffer = Buffer.from(params.signature, "hex");

  if (expectedBuffer.length !== givenBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, givenBuffer);
}

/**
 * Verify a Razorpay webhook signature.
 * Per Razorpay: signature = HMAC_SHA256(webhookSecret, rawRequestBody).
 * Uses the SDK's official timing-safe helper.
 */
export function verifyWebhookSignature(rawBody: string, signature: string | undefined): boolean {
  const secret = razorpayWebhookSecret();
  if (!secret || !signature) return false;
  try {
    return Razorpay.validateWebhookSignature(rawBody, signature, secret);
  } catch {
    return false;
  }
}

/** A safe, loggable representation of a payment-related error (no secrets). */
export class RazorpayServiceError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "RazorpayServiceError";
  }
}