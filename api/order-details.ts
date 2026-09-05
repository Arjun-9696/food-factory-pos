// ============================================================================
// GET /api/order-details?razorpay_order_id=... | transaction_id=... | ff_order_number=...
//
// Success-screen data source. Returns the SERVER-STORED order information
// (customer, items, amounts, payment ids, invoice status) straight from the
// payment record — the success page never trusts local cart state or URL
// params for money/customer data.
//
// Full details are returned ONLY for payments confirmed as PAID. For
// pending/failed/unknown references only the payment status is exposed.
// ============================================================================
import type { IncomingMessage, ServerResponse } from "node:http";
import { sendError, sendJson } from "./lib/http";
import {
  findPaymentByOrderNumber,
  findPaymentByRazorpayOrderId,
  findPaymentByTransactionId,
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
    if (!record && ffOrderNumber) record = await findPaymentByOrderNumber(ffOrderNumber);

    if (!record || record.payment_status !== "paid" || !record.ff_order_number) {
      sendJson(res, 200, {
        success: true,
        paymentStatus: record?.payment_status ?? "unknown",
        orderNumber: record?.ff_order_number ?? ffOrderNumber ?? null,
        razorpayOrderId: record?.razorpay_order_id ?? razorpayOrderId ?? null,
      });
      return;
    }

    const snapshot = record.snapshot;
    sendJson(res, 200, {
      success: true,
      paymentStatus: "paid",
      orderNumber: record.ff_order_number,
      customerName: record.customer_name,
      customerPhone: record.customer_phone,
      items: (snapshot?.items ?? []).map((it) => ({
        productId: it.productId,
        name: it.name,
        price: it.price,
        quantity: it.quantity,
        lineTotal: it.lineTotalPaise / 100,
      })),
      subtotal: snapshot?.subtotal ?? 0,
      discount: snapshot?.discount ?? 0,
      gst: snapshot?.gst ?? 0,
      delivery: snapshot?.delivery ?? 0,
      grandTotal: snapshot?.grandTotal ?? 0,
      deliveryAddress: record.delivery_address ?? null,
      amountPaise: record.amount_paise,
      amountLabel: inrLabelFromPaise(record.amount_paise),
      currency: record.currency,
      razorpayOrderId: record.razorpay_order_id,
      razorpayPaymentId: record.razorpay_payment_id,
      paidAt: record.paid_at,
      whatsappInvoiceStatus: record.whatsapp_invoice_status,
      invoiceSentAt: record.invoice_sent_at,
    });
  } catch (err) {
    console.error("order-details: unexpected error", err instanceof Error ? err.message : err);
    sendError(res, 500, "Unable to load order details. Please try again.", "DETAILS_FETCH_FAILED");
  }
}