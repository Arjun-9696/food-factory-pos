// ============================================================================
// GET /api/order-status?razorpay_order_id=...
//
// Reliable payment-status recheck used when the browser loses the network
// connection after a successful payment. The server re-verifies against
// Razorpay itself when the record is still pending, so the success state is
// recovered even if the frontend verification request never arrived.
// ============================================================================
import type { IncomingMessage, ServerResponse } from "node:http";
import { sendError, sendJson } from "./lib/http";
import { getRazorpay } from "./lib/razorpay";
import {
  findPaymentByRazorpayOrderId,
  findPaymentByTransactionId,
  finalizePaidPayment,
  markPaymentFailed,
} from "./lib/payments";
import { inrLabelFromPaise } from "./lib/amounts";

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url || "/", "http://localhost");
  const razorpayOrderId = url.searchParams.get("razorpay_order_id");
  const transactionId = url.searchParams.get("transaction_id");
  const ffOrderNumber = url.searchParams.get("ff_order_number");

  if (!razorpayOrderId && !transactionId && !ffOrderNumber) {
    sendError(res, 400, "Missing order reference.", "INVALID_REFERENCE");
    return;
  }

  try {
    let record = razorpayOrderId ? await findPaymentByRazorpayOrderId(razorpayOrderId) : null;
    if (!record && transactionId) record = await findPaymentByTransactionId(transactionId);

    if (!record) {
      // Unknown reference — cannot claim success or failure for a payment we
      // have no record of.
      sendJson(res, 200, {
        success: true,
        paymentStatus: "unknown",
        orderNumber: ffOrderNumber || null,
        razorpayOrderId,
        razorpayPaymentId: null,
        amount: 0,
        amountLabel: "",
        currency: "INR",
        whatsappInvoiceStatus: null,
      });
      return;
    }

    if (record.payment_status === "paid" && record.ff_order_number) {
      sendJson(res, 200, {
        success: true,
        paymentStatus: "paid",
        orderNumber: record.ff_order_number,
        razorpayOrderId: record.razorpay_order_id,
        razorpayPaymentId: record.razorpay_payment_id,
        amount: record.amount_paise,
        amountLabel: inrLabelFromPaise(record.amount_paise),
        currency: record.currency,
        paidAt: record.paid_at,
        delivery: record.snapshot?.delivery ?? 0,
        deliveryAddress: record.delivery_address ?? null,
        whatsappInvoiceStatus: record.whatsapp_invoice_status,
      });
      return;
    }

    if (record.payment_status === "failed") {
      sendJson(res, 200, {
        success: true,
        paymentStatus: "failed",
        orderNumber: null,
        razorpayOrderId: record.razorpay_order_id,
        amount: record.amount_paise,
        amountLabel: inrLabelFromPaise(record.amount_paise),
        currency: record.currency,
      });
      return;
    }

    // Still pending — actively confirm with Razorpay (the browser may have died).
    const storedOrderId = record.razorpay_order_id;
    if (!storedOrderId) {
      sendJson(res, 200, { success: true, paymentStatus: "pending", orderNumber: null, razorpayOrderId: null, amount: record.amount_paise, amountLabel: inrLabelFromPaise(record.amount_paise), currency: record.currency });
      return;
    }

    let paymentStatus: "pending" | "failed" = "pending";
    let confirmedPaymentId: string | null = null;

    try {
      const payments = await getRazorpay().orders.fetchPayments(storedOrderId);
      const captured = (payments?.items ?? []).find(
        (p) =>
          (p.status === "captured" || p.status === "refunded") &&
          Number(p.amount) === record.amount_paise,
      );
      const failed = (payments?.items ?? []).find((p) => p.status === "failed");

      if (captured) {
        confirmedPaymentId = captured.id;
        paymentStatus = "paid";
      } else if (failed) {
        paymentStatus = "failed";
      }
    } catch {
      // Razorpay unreachable — report pending so the user can retry the check.
      paymentStatus = "pending";
    }

    if (paymentStatus === "paid" && confirmedPaymentId) {
      const finalized = await finalizePaidPayment(record, {
        razorpayPaymentId: confirmedPaymentId,
        razorpaySignature: null,
      });
      sendJson(res, 200, {
        success: true,
        paymentStatus: "paid",
        orderNumber: finalized.orderNumber,
        razorpayOrderId: storedOrderId,
        amount: record.amount_paise,
        amountLabel: inrLabelFromPaise(record.amount_paise),
        currency: record.currency,
        razorpayPaymentId: confirmedPaymentId,
        delivery: record.snapshot?.delivery ?? 0,
        deliveryAddress: record.delivery_address ?? null,
        whatsappInvoiceStatus: record.whatsapp_invoice_status,
      });
      return;
    }

    if (paymentStatus === "failed") {
      await markPaymentFailed(storedOrderId, null);
    }

    sendJson(res, 200, {
      success: true,
      paymentStatus,
      orderNumber: null,
      razorpayOrderId: storedOrderId,
      amount: record.amount_paise,
      amountLabel: inrLabelFromPaise(record.amount_paise),
      currency: record.currency,
    });
  } catch (err) {
    console.error("order-status: unexpected error", err instanceof Error ? err.message : err);
    sendError(res, 500, "Unable to check payment status. Please try again.", "STATUS_CHECK_FAILED");
  }
}