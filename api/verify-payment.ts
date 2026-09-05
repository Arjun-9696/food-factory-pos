// ============================================================================
// POST /api/verify-payment
//
// 1. Looks up the Food Factory payment record by razorpay_order_id.
// 2. Verifies the HMAC-SHA256 signature using the STORED order id.
// 3. Re-verifies the payment with Razorpay (must be captured + amount match).
// 4. Marks the Food Factory order paid & creates the order (idempotent).
//
// Passing only frontend info is never enough — the signature and payment
// status are verified server-side against our own records and Razorpay.
// ============================================================================
import type { IncomingMessage, ServerResponse } from "node:http";
import { allowMethod, isJsonRequest, readJsonBody, sendError, sendJson } from "./lib/http";
import { getRazorpay, verifyPaymentSignature } from "./lib/razorpay";
import { findPaymentByRazorpayOrderId, finalizePaidPayment, markPaymentFailed } from "./lib/payments";
import { inrLabelFromPaise } from "./lib/amounts";
import { isRazorpayConfigured } from "./lib/env";

interface VerifyPaymentRequest {
  razorpay_payment_id?: unknown;
  razorpay_order_id?: unknown;
  razorpay_signature?: unknown;
}

const PAYMENT_ID_RE = /^pay_[A-Za-z0-9]{5,64}$/;
const ORDER_ID_RE = /^order_[A-Za-z0-9]{5,64}$/;
const SIGNATURE_RE = /^[A-Fa-f0-9]{32,128}$/;

function isPaymentCapturedStatus(status: unknown): boolean {
  return status === "captured";
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (!allowMethod(req, res, "POST")) return;
  if (!isJsonRequest(req)) {
    sendError(res, 415, "Please send JSON.", "INVALID_CONTENT_TYPE");
    return;
  }

  let body: VerifyPaymentRequest;
  try {
    body = (await readJsonBody(req)) as VerifyPaymentRequest;
  } catch (err) {
    const code = err instanceof Error ? err.message : "INVALID_JSON";
    sendError(res, code === "PAYLOAD_TOO_LARGE" ? 413 : 400, code === "PAYLOAD_TOO_LARGE" ? "Request is too large." : "Request body is invalid.", code);
    return;
  }

  const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = body;
  if (typeof razorpay_payment_id !== "string" || !PAYMENT_ID_RE.test(razorpay_payment_id)) {
    sendError(res, 400, "Missing or invalid payment reference.", "INVALID_PAYMENT_ID");
    return;
  }
  if (typeof razorpay_order_id !== "string" || !ORDER_ID_RE.test(razorpay_order_id)) {
    sendError(res, 400, "Missing or invalid order reference.", "INVALID_ORDER_ID");
    return;
  }
  if (typeof razorpay_signature !== "string" || !SIGNATURE_RE.test(razorpay_signature)) {
    sendError(res, 400, "Missing or invalid payment signature.", "INVALID_SIGNATURE");
    return;
  }

  if (!isRazorpayConfigured()) {
    console.error("Razorpay is not configured (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET).");
    sendError(res, 503, "Online payments are temporarily unavailable.", "PAYMENT_NOT_CONFIGURED");
    return;
  }

  try {
    // Find OUR record by the razorpay order id we stored at create-time.
    const record = await findPaymentByRazorpayOrderId(razorpay_order_id);
    if (!record) {
      console.error(`verify-payment: unknown razorpay order { razorpayOrderId: "${razorpay_order_id}" }`);
      sendError(res, 404, "Payment session not found.", "PAYMENT_SESSION_NOT_FOUND");
      return;
    }

    const storedOrderId = record.razorpay_order_id ?? razorpay_order_id;

    // Signature must be computed from the STORED order id, not the browser echo.
    const signatureValid = verifyPaymentSignature({
      storedOrderId,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    });

    if (!signatureValid) {
      console.error(
        `verify-payment: SIGNATURE MISMATCH { razorpayOrderId: "${storedOrderId}", razorpayPaymentId: "${razorpay_payment_id}" }`,
      );
      sendError(res, 400, "Payment verification failed.", "SIGNATURE_MISMATCH");
      return;
    }

    // Idempotent: already-processed payments return the stored success result.
    if (record.payment_status === "paid" && record.ff_order_number) {
      sendJson(res, 200, {
        success: true,
        paymentStatus: "paid",
        orderNumber: record.ff_order_number,
        amount: record.amount_paise,
        amountLabel: inrLabelFromPaise(record.amount_paise),
        currency: record.currency,
        razorpayPaymentId: razorpay_payment_id,
        razorpayOrderId: storedOrderId,
      });
      return;
    }

    // Server-side payment/order status verification with Razorpay itself.
    let payments;
    try {
      payments = await getRazorpay().orders.fetchPayments(storedOrderId);
    } catch (razorpayErr) {
      console.error("verify-payment: unable to fetch payments from Razorpay", razorpayErr instanceof Error ? razorpayErr.message : razorpayErr);
      sendError(res, 502, "Payment verification is taking longer than expected. Please check your order status.", "GATEWAY_FETCH_FAILED");
      return;
    }

    const payment = (payments?.items ?? []).find((p) => p.id === razorpay_payment_id);

    if (!payment) {
      console.error(`verify-payment: payment not found on razorpay order { razorpayOrderId: "${storedOrderId}" }`);
      sendError(res, 409, "Payment verification is taking longer than expected. Please check your order status.", "PAYMENT_NOT_FOUND");
      return;
    }

    const amountMatches = Number(payment.amount) === record.amount_paise;
    const currencyMatches = String(payment.currency).toUpperCase() === String(record.currency).toUpperCase();
    const captured = isPaymentCapturedStatus(payment.status);

    if (payment.status === "failed") {
      await markPaymentFailed(storedOrderId, razorpay_payment_id);
      console.error(`verify-payment: payment failed { razorpayOrderId: "${storedOrderId}", razorpayPaymentId: "${razorpay_payment_id}" }`);
      sendError(res, 402, "Payment failed. Please try again.", "PAYMENT_FAILED");
      return;
    }

    if (!captured || !amountMatches || !currencyMatches) {
      sendError(res, 409, "Payment is not confirmed yet. Please check your order status.", "PAYMENT_NOT_CAPTURED");
      return;
    }

    const finalized = await finalizePaidPayment(record, {
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
    });

    console.log(
      `Payment verification successful { foodFactoryOrderId: "${finalized.orderNumber}", razorpayOrderId: "${storedOrderId}", razorpayPaymentId: "${razorpay_payment_id}" }`,
    );

    sendJson(res, 200, {
      success: true,
      paymentStatus: "paid",
      orderNumber: finalized.orderNumber,
      amount: record.amount_paise,
      amountLabel: inrLabelFromPaise(record.amount_paise),
      currency: record.currency,
      razorpayPaymentId: razorpay_payment_id,
      razorpayOrderId: storedOrderId,
    });
  } catch (err) {
    if (err && typeof err === "object" && (err as { message?: string }).message) {
      const message = (err as { message: string }).message;
      if (message === "PAYMENT_SNAPSHOT_MISSING" || message === "ORDER_CREATE_FAILED" || message === "PAYMENT_RECORD_UPDATE_FAILED") {
        console.error("verify-payment: order finalization failed", message);
        sendError(res, 500, "Payment received but order confirmation failed. Please contact us.", "ORDER_CONFIRMATION_FAILED");
        return;
      }
    }
    console.error("verify-payment: unexpected error", err instanceof Error ? err.message : err);
    sendError(res, 500, "Payment verification failed. Please try again.", "VERIFY_FAILED");
  }
}