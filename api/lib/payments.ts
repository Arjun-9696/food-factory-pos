// ============================================================================
// Payment ledger + Food Factory order creation.
// All state changes live in the `payment_records` table (created by
// scripts/razorpay-payments.sql) and use the existing Supabase `orders` /
// `order_items` / `customers` tables — reusing the project's order model.
//
// Concurrency + idempotency guarantees:
//   * One payment can only ever produce ONE Food Factory order. Order creation
//     is fenced with a compare-and-set claim on `payment_records.ff_order_number`,
//     so simultaneous verify-payment + webhook calls can never create duplicates.
//   * Repeated verify calls, webhooks or dashboard retries are safe: paid
//     records return their stored order immediately.
//   * The WhatsApp invoice is sent at most once per payment (a separate CAS
//     claim on `whatsapp_invoice_status`), is never faked, and never blocks
//     payment success.
// ============================================================================
import { randomUUID } from "node:crypto";
import { getServerSupabase } from "./supabase";
import type {
  AmountBreakdown,
  ServerPricedItem,
} from "./amounts";
import { CURRENCY } from "./amounts";
import { buildInvoiceFromRecord } from "./invoice";
import { sendWhatsAppInvoice } from "./whatsapp";
import type { DeliveryAddress } from "./address";

export interface PaymentSnapshot {
  currency: string;
  items: ServerPricedItem[];
  subtotal: number;
  discount: number;
  coinDiscount: number;
  gst: number;
  delivery: number;
  grandTotal: number;
}

export type WhatsappInvoiceStatus = "PENDING" | "SENT" | "FAILED";

export interface PaymentRecordRow {
  id?: string;
  transaction_id: string;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  razorpay_signature: string | null;
  ff_order_number: string | null;
  amount_paise: number;
  amount_rupees: number;
  currency: string;
  payment_status: "pending" | "paid" | "failed";
  customer_name: string | null;
  customer_phone: string | null;
  snapshot: PaymentSnapshot | null;
  /** Delivery-address snapshot captured at payment creation (per order). */
  delivery_address: DeliveryAddress | null;
  metadata: Record<string, unknown> | null;
  paid_at: string | null;
  whatsapp_invoice_status: WhatsappInvoiceStatus | null;
  whatsapp_message_id: string | null;
  invoice_sent_at: string | null;
}

const nowIso = () => new Date().toISOString();
const waitMs = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// ---------------------------------------------------------------------------
// Lookups (unique keys)
// ---------------------------------------------------------------------------

export async function findPaymentByRazorpayOrderId(razorpayOrderId: string): Promise<PaymentRecordRow | null> {
  const { data } = await getServerSupabase()
    .from("payment_records")
    .select("*")
    .eq("razorpay_order_id", razorpayOrderId)
    .maybeSingle();
  return normalizeRecord(data);
}

export async function findPaymentByTransactionId(transactionId: string): Promise<PaymentRecordRow | null> {
  const { data } = await getServerSupabase()
    .from("payment_records")
    .select("*")
    .eq("transaction_id", transactionId)
    .maybeSingle();
  return normalizeRecord(data);
}

export async function findPaymentByRazorpayPaymentId(razorpayPaymentId: string): Promise<PaymentRecordRow | null> {
  const { data } = await getServerSupabase()
    .from("payment_records")
    .select("*")
    .eq("razorpay_payment_id", razorpayPaymentId)
    .maybeSingle();
  return normalizeRecord(data);
}

export async function findPaymentByOrderNumber(orderNumber: string): Promise<PaymentRecordRow | null> {
  const { data } = await getServerSupabase()
    .from("payment_records")
    .select("*")
    .eq("ff_order_number", orderNumber)
    .maybeSingle();
  return normalizeRecord(data);
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export async function createPaymentRecord(record: {
  transactionId: string;
  razorpayOrderId: string;
  amountPaise: number;
  amountRupees: number;
  customerName: string | null;
  customerPhone: string | null;
  customerUserId?: string;
  snapshot: PaymentSnapshot;
  deliveryAddress: DeliveryAddress | null;
  coinRedemption?: { userId: string; discountAmount: number };
  metadataAppend?: Record<string, unknown>;
}): Promise<PaymentRecordRow> {
  const metadata: Record<string, unknown> = record.customerUserId
    ? { customer_user_id: record.customerUserId }
    : { user_id: "guest" };
  if (record.coinRedemption) {
    metadata.coin_redemption = record.coinRedemption;
  }
  if (record.metadataAppend) {
    Object.assign(metadata, record.metadataAppend);
  }
  const row = {
    transaction_id: record.transactionId,
    razorpay_order_id: record.razorpayOrderId,
    amount_paise: record.amountPaise,
    amount_rupees: record.amountRupees,
    currency: CURRENCY,
    payment_status: "pending",
    customer_name: record.customerName,
    customer_phone: record.customerPhone,
    snapshot: record.snapshot,
    delivery_address: record.deliveryAddress ?? null,
    metadata,
  };
  const { data, error } = await getServerSupabase()
    .from("payment_records")
    .insert(row)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error("PAYMENT_RECORD_CREATE_FAILED");
  }
  return normalizeRecord(data)!;
}

export async function markPaymentFailed(razorpayOrderId: string, razorpayPaymentId: string | null): Promise<void> {
  await getServerSupabase()
    .from("payment_records")
    .update({
      payment_status: "failed",
      razorpay_payment_id: razorpayPaymentId ?? null,
    })
    .eq("razorpay_order_id", razorpayOrderId)
    .eq("payment_status", "pending");
}

// ---------------------------------------------------------------------------
// Food Factory order creation (reuses the existing order model)
// ---------------------------------------------------------------------------

export function generateOrderNumber(): string {
  const now = new Date();
  const yyyymmdd = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("");
  const suffix = randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase();
  return `FF-${yyyymmdd}-${suffix}`;
}

async function waitForOrder(orderNumber: string, timeoutMs: number): Promise<{ id: string; order_number: string } | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const { data } = await getServerSupabase()
      .from("orders")
      .select("id, order_number")
      .eq("order_number", orderNumber)
      .maybeSingle();
    if (data) return data as { id: string; order_number: string };
    await waitMs(150);
  }
  return null;
}

async function ensureItemsForOrder(orderId: string, itemRows: unknown[]): Promise<void> {
  const { data: existing } = await getServerSupabase()
    .from("order_items")
    .select("id")
    .eq("order_id", orderId)
    .limit(1)
    .maybeSingle();
  if (existing) return;
  const { error } = await getServerSupabase()
    .from("order_items")
    .insert(itemRows.map((it) => ({ ...(it as object), order_id: orderId })));
  if (error && error.code !== "23505") {
    throw new Error("ORDER_ITEMS_UPDATE_FAILED");
  }
}

/**
 * Create (or attach to) the unique FF order for this payment.
 * The order number is stable per payment; a concurrent duplicate insert hits
 * the unique constraint and is re-attached rather than creating a second row.
 */
export async function ensureOrderRowWithItems(
  initialOrderNumber: string,
  orderRow: Record<string, unknown>,
  itemRows: unknown[],
  onNumberChange?: (nextNumber: string) => Promise<void>,
): Promise<{ id: string; order_number: string }> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const orderNumber = attempt === 0 ? initialOrderNumber : generateOrderNumber();
    if (attempt > 0 && onNumberChange) {
      await onNumberChange(orderNumber);
    }

    const { data, error } = await getServerSupabase()
      .from("orders")
      .insert({ ...orderRow, order_number: orderNumber })
      .select("id, order_number")
      .maybeSingle();

    if (data) {
      try {
        await ensureItemsForOrder(data.id, itemRows);
        return data as { id: string; order_number: string };
      } catch (err) {
        if ((err as Error).message === "ORDER_ITEMS_UPDATE_FAILED") continue; // fresh number
        throw err;
      }
    }

    if (error?.code === "23505") {
      const existing = await getServerSupabase()
        .from("orders")
        .select("id, order_number")
        .eq("order_number", orderNumber)
        .maybeSingle();
      if (existing.data) {
        await ensureItemsForOrder(existing.data.id, itemRows);
        return existing.data as { id: string; order_number: string };
      }
      continue;
    }
    throw new Error("ORDER_CREATE_FAILED");
  }
  throw new Error("ORDER_CREATE_FAILED");
}

async function upsertCustomer(name: string | null, phone: string | null, grandTotal: number): Promise<void> {
  // Best-effort loyalty tracking, mirroring the existing POS behaviour.
  if (!phone) return;
  try {
    const supabase = getServerSupabase();
    const { data: existing } = await supabase
      .from("customers")
      .select("id, total_orders, total_spent, loyalty_points")
      .eq("phone", phone)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("customers")
        .update({
          name: name || "Guest",
          total_orders: (existing.total_orders || 0) + 1,
          total_spent: (existing.total_spent || 0) + grandTotal,
          loyalty_points: (existing.loyalty_points || 0) + Math.floor(grandTotal / 10),
          last_order_date: nowIso(),
          updated_at: nowIso(),
        })
        .eq("id", existing.id);
    } else {
      await supabase
        .from("customers")
        .insert({
          name: name || "Guest",
          phone,
          email: null,
          total_orders: 1,
          total_spent: grandTotal,
          loyalty_points: Math.floor(grandTotal / 10),
          last_order_date: nowIso(),
          created_at: nowIso(),
          updated_at: nowIso(),
        });
    }
  } catch {
    // Never fail an order because loyalty tracking failed.
  }
}

async function releaseOrderClaim(recordId: string): Promise<void> {
  try {
    await getServerSupabase()
      .from("payment_records")
      .update({ ff_order_number: null })
      .eq("id", recordId)
      .in("payment_status", ["pending", "failed"]);
  } catch {
    // best-effort
  }
}

// ---------------------------------------------------------------------------
// WhatsApp invoice delivery (idempotent, never blocks payment success)
// ---------------------------------------------------------------------------

async function ensureInvoiceAttempted(
  record: PaymentRecordRow,
  payment: { razorpayPaymentId: string; razorpaySignature: string | null },
  orderNumber: string,
): Promise<void> {
  if (!record.id || !record.customer_phone) return;

  // CAS claim → exactly one caller attempts the delivery.
  const claimed = await getServerSupabase()
    .from("payment_records")
    .update({ whatsapp_invoice_status: "PENDING" })
    .eq("id", record.id)
    .is("whatsapp_invoice_status", null)
    .select("id")
    .maybeSingle();
  if (!claimed.data) return;

  let result: Awaited<ReturnType<typeof sendWhatsAppInvoice>>;
  try {
    const invoice = buildInvoiceFromRecord({ ...record, ff_order_number: orderNumber }, payment);
    result = await sendWhatsAppInvoice({ invoice, customerPhone: record.customer_phone });
  } catch (err) {
    result = { status: "failed", error: err instanceof Error ? err.message : "whatsapp send error" };
  }

  const update =
    result.status === "sent"
      ? {
          whatsapp_invoice_status: "SENT" as const,
          whatsapp_message_id: result.messageId || null,
          invoice_sent_at: nowIso(),
        }
      : {
          whatsapp_invoice_status: "FAILED" as const,
          whatsapp_message_id: result.messageId || null,
        };

  try {
    await getServerSupabase().from("payment_records").update(update).eq("id", record.id);
  } catch {
    // Logged/ignored — the payment is already confirmed regardless.
  }
}

/**
 * Marks a pending payment as paid and creates the Food Factory order once.
 * Safe to call concurrently (double verification, verify-then-webhook, ...).
 */
export async function finalizePaidPayment(
  record: PaymentRecordRow,
  payment: { razorpayPaymentId: string; razorpaySignature: string | null },
): Promise<{ orderNumber: string; alreadyProcessed: boolean }> {
  // Fast path — already finalized (also re-attempts a missed invoice send).
  if (record.payment_status === "paid" && record.ff_order_number) {
    await ensureInvoiceAttempted(record, payment, record.ff_order_number);
    return { orderNumber: record.ff_order_number, alreadyProcessed: true };
  }

  const snapshot = record.snapshot;
  if (!snapshot || snapshot.items.length === 0) {
    throw new Error("PAYMENT_SNAPSHOT_MISSING");
  }
  if (!record.id) {
    throw new Error("PAYMENT_RECORD_ID_MISSING");
  }

  const orderRow = {
    customer_name: record.customer_name,
    customer_phone: record.customer_phone,
    subtotal: snapshot.subtotal,
    discount: snapshot.discount,
    coin_discount: snapshot.coinDiscount ?? 0,
    gst: snapshot.gst,
    delivery: snapshot.delivery ?? 0,
    grand_total: snapshot.grandTotal,
    status: "pending",
    payment_method: "razorpay",
    delivery_address: record.delivery_address ?? null,
    ...(record.metadata?.customer_user_id
      ? { user_id: String(record.metadata.customer_user_id) }
      : {}),
    created_at: nowIso(),
    updated_at: nowIso(),
  };
  const itemRows = snapshot.items.map((it) => ({
    product_name: it.name,
    product_price: it.price,
    quantity: it.quantity,
    total: it.lineTotalPaise / 100,
    created_at: nowIso(),
  }));

  // ---- Fence FF-order creation: exactly one concurrent caller may create it.
  let orderNumber = record.ff_order_number || generateOrderNumber();
  const claim = await getServerSupabase()
    .from("payment_records")
    .update({ ff_order_number: orderNumber })
    .eq("id", record.id)
    .is("ff_order_number", null)
    .select("id")
    .maybeSingle();
  const isProducer = Boolean(claim.data);

  if (isProducer) {
    try {
      const orderResult = await ensureOrderRowWithItems(
        orderNumber,
        orderRow,
        itemRows,
        async (nextNumber) => {
          await getServerSupabase()
            .from("payment_records")
            .update({ ff_order_number: nextNumber })
            .eq("id", record.id);
        },
      );
      orderNumber = orderResult.order_number;
    } catch (err) {
      // Release the claim so the next retry path can recreate the order.
      await releaseOrderClaim(record.id);
      throw err;
    }
  } else {
    // Another caller is creating the order — wait for it to appear.
    const existing = await waitForOrder(orderNumber, 6000);
    if (!existing) {
      // The producer died mid-flight — reclaim ownership and create ourselves.
      const reclaim = await getServerSupabase()
        .from("payment_records")
        .update({ ff_order_number: null })
        .eq("id", record.id)
        .eq("ff_order_number", orderNumber)
        .in("payment_status", ["pending", "failed"])
        .select("id")
        .maybeSingle();
      if (reclaim.data) {
        await getServerSupabase()
          .from("payment_records")
          .update({ ff_order_number: orderNumber })
          .eq("id", record.id);
        const orderResult = await ensureOrderRowWithItems(orderNumber, orderRow, itemRows);
        orderNumber = orderResult.order_number;
      } else {
        // Very slow producer — wait once more, then give up so the caller can
        // report "please re-check order status" and the record stays retryable.
        const lateOrder = await waitForOrder(orderNumber, 4000);
        if (!lateOrder) throw new Error("ORDER_CREATE_FAILED");
      }
    }
  }

  // Loyalty tracking (never blocks order confirmation).
  await upsertCustomer(record.customer_name, record.customer_phone, snapshot.grandTotal);

  // Mark the payment paid and link the Food Factory order number.
  const { error } = await getServerSupabase()
    .from("payment_records")
    .update({
      payment_status: "paid",
      razorpay_payment_id: payment.razorpayPaymentId,
      razorpay_signature: payment.razorpaySignature,
      ff_order_number: orderNumber,
      paid_at: nowIso(),
    })
    .eq("id", record.id)
    .in("payment_status", ["pending", "failed"]);

  if (error) {
    throw new Error("PAYMENT_RECORD_UPDATE_FAILED");
  }

  // WhatsApp invoice — best effort, idempotent, never affects success.
  await ensureInvoiceAttempted(record, payment, orderNumber);

  // Settle coin redemption for an ONLINE (Razorpay-gated) order, if the
  // customer opted in. Runs atomically + idempotently via ff_redeem_coins_service
  // (row-locked, one REDEMPTION per order), so concurrent verify-payment +
  // webhook calls can never deduct the wallet twice and a balance that changed
  // after checkout can never be over-drafted.
  //
  // The coin amount is the AUTHORITATIVE snapshot.coinDiscount captured at
  // checkout (1 coin = ₹1) — never recomputed from the live wallet or browser.
  // The order's coin_discount was already persisted at create/settlement and is
  // NOT overwritten here.
  if (record.metadata?.coin_redemption && record.metadata.customer_user_id) {
    try {
      const { redeemCoinsForPlacedOrder } = await import("./coins");
      const coinInfo = record.metadata.coin_redemption as { userId: string; discountAmount: number };
      const { data: orderRow } = await getServerSupabase()
        .from("orders")
        .select("id")
        .eq("order_number", orderNumber)
        .maybeSingle();
      const orderId = orderRow?.id;
      if (!orderId) {
        console.error("[COIN_REDEMPTION_SKIPPED] Order row not found for settlement");
      } else {
        const coinsToUse = Math.round(snapshot.coinDiscount ?? 0);
        const discountAmount = snapshot.coinDiscount ?? 0;
        const redemption = await redeemCoinsForPlacedOrder({
          userId: coinInfo.userId,
          coinsToUse,
          orderId,
          orderNumber,
          discountAmount,
        });
        if (redemption.success) {
          console.log(
            `[COIN_REDEMPTION_CONFIRMED] Order ${orderNumber}: ${coinsToUse} coins redeemed (new balance ${redemption.newBalance})`,
          );
        } else {
          // The order is already confirmed and the cart cleared; a redemption
          // failure is logged for admin review but never fails the order.
          console.error(
            `[COIN_REDEMPTION_FAILED] Order ${orderNumber}: ${redemption.code ?? "unknown"} — admin review required`,
          );
        }
      }
    } catch (err) {
      console.error("[COIN_REDEMPTION_FAILED] Best effort — order still confirmed:", err);
    }
  }

  return { orderNumber, alreadyProcessed: false };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeRecord(data: unknown): PaymentRecordRow | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  const status = String(d.whatsapp_invoice_status ?? "").toUpperCase();
  return {
    id: d.id ? String(d.id) : undefined,
    transaction_id: String(d.transaction_id ?? ""),
    razorpay_order_id: d.razorpay_order_id ? String(d.razorpay_order_id) : null,
    razorpay_payment_id: d.razorpay_payment_id ? String(d.razorpay_payment_id) : null,
    razorpay_signature: d.razorpay_signature ? String(d.razorpay_signature) : null,
    ff_order_number: d.ff_order_number ? String(d.ff_order_number) : null,
    amount_paise: Number(d.amount_paise) || 0,
    amount_rupees: Number(d.amount_rupees) || 0,
    currency: String(d.currency || CURRENCY),
    payment_status: (["pending", "paid", "failed"].includes(String(d.payment_status))
      ? String(d.payment_status)
      : "pending") as PaymentRecordRow["payment_status"],
    customer_name: d.customer_name ? String(d.customer_name) : null,
    customer_phone: d.customer_phone ? String(d.customer_phone) : null,
    snapshot: (d.snapshot as PaymentSnapshot) ?? null,
    delivery_address: (d.delivery_address as DeliveryAddress | null) ?? null,
    metadata: (d.metadata as Record<string, unknown>) ?? null,
    paid_at: d.paid_at ? String(d.paid_at) : null,
    whatsapp_invoice_status: (["PENDING", "SENT", "FAILED"].includes(status)
      ? status
      : null) as PaymentRecordRow["whatsapp_invoice_status"],
    whatsapp_message_id: d.whatsapp_message_id ? String(d.whatsapp_message_id) : null,
    invoice_sent_at: d.invoice_sent_at ? String(d.invoice_sent_at) : null,
  };
}

function buildPaymentSnapshot(items: ServerPricedItem[], amounts: AmountBreakdown): PaymentSnapshot {
  return {
    currency: CURRENCY,
    items,
    subtotal: amounts.subtotal,
    discount: amounts.discount,
    coinDiscount: amounts.coinDiscount,
    gst: amounts.gst,
    delivery: amounts.delivery,
    grandTotal: amounts.grandTotal,
  };
}

export { buildPaymentSnapshot };