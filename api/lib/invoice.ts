// ============================================================================
// Invoice builder — turns a verified payment record into the Food Factory
// invoice consumed by the WhatsApp invoice service and the order-details API.
// Amounts come from the SERVER-STORED payment snapshot (never the browser).
// ============================================================================
import type { PaymentRecordRow } from "./payments";
import { CURRENCY } from "./amounts";
import type { DeliveryAddress } from "./address";

export interface InvoiceItem {
  name: string;
  price: number;
  quantity: number;
  lineTotal: number;
}

export interface OrderInvoice {
  orderNumber: string;
  customerName: string | null;
  customerPhone: string | null;
  deliveryAddress: DeliveryAddress | null;
  dateIso: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  gst: number;
  delivery: number;
  grandTotal: number;
  currency: string;
  paymentStatus: "paid";
  paymentMethod: "razorpay";
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  razorpaySignature: string | null;
}

export function buildInvoiceFromRecord(
  record: PaymentRecordRow,
  payment: { razorpayPaymentId: string; razorpaySignature: string | null },
): OrderInvoice {
  const snapshot = record.snapshot;
  const items: InvoiceItem[] = (snapshot?.items ?? []).map((it) => ({
    name: it.name,
    price: it.price,
    quantity: it.quantity,
    lineTotal: it.lineTotalPaise / 100,
  }));

  return {
    orderNumber: record.ff_order_number || "—",
    customerName: record.customer_name,
    customerPhone: record.customer_phone,
    deliveryAddress: record.delivery_address ?? null,
    dateIso: new Date().toISOString(),
    items,
    subtotal: snapshot?.subtotal ?? 0,
    discount: snapshot?.discount ?? 0,
    gst: snapshot?.gst ?? 0,
    delivery: snapshot?.delivery ?? 0,
    grandTotal: snapshot?.grandTotal ?? 0,
    currency: record.currency || CURRENCY,
    paymentStatus: "paid",
    paymentMethod: "razorpay",
    razorpayOrderId: record.razorpay_order_id,
    razorpayPaymentId: payment.razorpayPaymentId,
    razorpaySignature: payment.razorpaySignature,
  };
}

const money = (value: number, currency = "₹") =>
  currency === "INR" ? `₹${value.toFixed(2)}` : `${value.toFixed(2)} ${currency}`;

/** Plain-text (WhatsApp/fallback) representation of the invoice. */
export function formatInvoiceText(invoice: OrderInvoice): string {
  const lines: string[] = [];
  lines.push("*Food Factory - The Quality Taste*");
  lines.push(`Order: *${invoice.orderNumber}*`);
  lines.push(`Date: ${new Date(invoice.dateIso).toLocaleString("en-IN")}`);

  if (invoice.customerName) lines.push(`Customer: ${invoice.customerName}`);
  if (invoice.customerPhone) lines.push(`Phone: ${invoice.customerPhone}`);
  if (invoice.deliveryAddress) {
    lines.push("Delivery Address:");
    lines.push(`  ${formatAddressLine(invoice.deliveryAddress)}`);
  }

  lines.push("------------------------------");
  for (const item of invoice.items) {
    lines.push(`${item.quantity}x ${item.name} — ${money(item.lineTotal, invoice.currency)}`);
  }
  lines.push("------------------------------");
  lines.push(`Subtotal: ${money(invoice.subtotal, invoice.currency)}`);
  if (invoice.discount > 0) lines.push(`Discount: -${money(invoice.discount, invoice.currency)}`);
  lines.push(`GST (5%): ${money(invoice.gst, invoice.currency)}`);
  lines.push(`Delivery: ${money(invoice.delivery, invoice.currency)}${invoice.delivery <= 0 ? " (FREE)" : ""}`);
  lines.push(`*Grand Total: ${money(invoice.grandTotal, invoice.currency)}*`);
  lines.push("------------------------------");
  lines.push("*Payment: PAID (Razorpay Online Payment)*");
  if (invoice.razorpayPaymentId) lines.push(`Razorpay Payment ID: ${invoice.razorpayPaymentId}`);
  if (invoice.razorpayOrderId) lines.push(`Razorpay Order ID: ${invoice.razorpayOrderId}`);
  lines.push("");
  lines.push("Thank you! Visit again 🙏");

  return lines.join("\n");
}

function formatAddressLine(address: DeliveryAddress): string {
  return [address.houseNumber, address.street, address.area, address.city, address.state, address.postalCode, address.country]
    .filter((part) => part && part.trim().length > 0)
    .join(", ");
}