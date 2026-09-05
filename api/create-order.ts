// ============================================================================
// POST /api/create-order
//
// Receives ONLY cart product ids + quantities (+ optional customer info).
// The server fetches real products from the database, validates availability,
// calculates every price/gst/discount/delivery amount itself, converts the
// total to paise, and creates the Razorpay order. The browser never supplies
// prices or totals.
//
// Idempotent per `transactionId`: repeated calls re-use the same pending
// Razorpay order instead of creating duplicates.
// ============================================================================
import type { IncomingMessage, ServerResponse } from "node:http";
import { allowMethod, isJsonRequest, readJsonBody, sendError, sendJson } from "./lib/http";
import { getRazorpay, RazorpayServiceError } from "./lib/razorpay";
import { getServerSupabase } from "./lib/supabase";
import {
  CURRENCY,
  MAX_QUANTITY_PER_ITEM,
  MIN_PAYABLE_PAISE,
  computeOrderAmounts,
  inrLabelFromPaise,
  validateCartLines,
} from "./lib/amounts";
import {
  createPaymentRecord,
  findPaymentByTransactionId,
  buildPaymentSnapshot,
  generateOrderNumber,
  ensureOrderRowWithItems,
  type PaymentRecordRow,
} from "./lib/payments";
import { isRazorpayConfigured, razorpayPublicKeyId } from "./lib/env";
import { normalizeIndianPhone } from "./lib/phone";
import { resolveIdentity, createUserScopedClient, type ResolvedIdentity } from "./lib/identity";
import {
  addressFromProfileRow,
  addressToProfilePatch,
  isCompleteProfileAddress,
  validateDeliveryAddress,
  type DeliveryAddress,
} from "./lib/address";
import { distanceToShopKm } from "./lib/location";
import { validateRedemption, redeemCoinsAtomicForOrder, coinFailureMessage } from "./lib/coins";

const nowIso = () => new Date().toISOString();

const TRANSACTION_ID_RE = /^[A-Za-z0-9_-]{8,64}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface CreateOrderRequest {
  transactionId?: unknown;
  items?: unknown;
  customerName?: unknown;
  customerPhone?: unknown;
  discount?: unknown;
  /** Optional Supabase session JWT for identity-aware checkout. */
  accessToken?: unknown;
  /** Delivery address snapshot (required — no address, no payment). */
  deliveryAddress?: unknown;
  /** Whether to redeem Food Factory Coins for this order. */
  useCoins?: unknown;
}

function sanitizeName(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim().slice(0, 120);
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Resolve the authoritative delivery address for this checkout.
 *   * Authenticated → pinned from THEIR OWN profiles row (RLS user-scoped
 *     client). If the profile already has a complete address it wins; the
 *     cart editor persists to the profile first, so browser + profile agree.
 *   * Profile complete but unreachable → the validated client snapshot.
 *   * Guest → the validated client snapshot, attached to the payment/order.
 */
async function resolveDeliveryAddress(
  rawAddress: unknown,
  identity: ResolvedIdentity,
): Promise<{ error: string } | { address: DeliveryAddress }> {
  const clientResult = validateDeliveryAddress(rawAddress);

  if (!identity.authenticated || !identity.userId) {
    return clientResult;
  }

  try {
    const scoped = createUserScopedClient(identity.accessToken);
    const { data: profile } = await scoped
      .from("profiles")
      .select(
        "house_number, street, area, city, state, postal_code, country, latitude, longitude, full_address",
      )
      .eq("user_id", identity.userId)
      .maybeSingle();

    const pinned = addressFromProfileRow(profile ?? null);
    if (isCompleteProfileAddress(pinned)) {
      return { address: pinned };
    }

    // No usable profile address → accept the validated client snapshot and
    // persist it back to the profile (best effort) for the next order.
    if ("error" in clientResult) return clientResult;
    try {
      await scoped
        .from("profiles")
        .update(addressToProfilePatch(clientResult.address))
        .eq("user_id", identity.userId);
    } catch {
      // Checkout must never fail because profile persistence failed.
    }
    return clientResult;
  } catch {
    // Identity pinning failed (network/rls) → validate it like a guest.
    return clientResult;
  }
}

const HANDLER_VERSION = "2026-09-04-coins-v3";

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (!allowMethod(req, res, "POST")) return;

  if (!isJsonRequest(req)) {
    sendError(res, 415, "Please send JSON.", "INVALID_CONTENT_TYPE");
    return;
  }

  console.log(`[create-order] handler v${HANDLER_VERSION} invoked`);

  let body: CreateOrderRequest;
  try {
    body = (await readJsonBody(req)) as CreateOrderRequest;
  } catch (err) {
    const code = err instanceof Error ? err.message : "INVALID_JSON";
    if (code === "PAYLOAD_TOO_LARGE") {
      sendError(res, 413, "Request is too large.", code);
    } else {
      sendError(res, 400, "Request body is invalid.", code);
    }
    return;
  }

  const transactionId = body.transactionId;
  if (typeof transactionId !== "string" || !TRANSACTION_ID_RE.test(transactionId)) {
    sendError(res, 400, "Missing or invalid transaction id.", "INVALID_TRANSACTION");
    return;
  }

  // ---- Resolve the authenticated identity (never trust the browser alone). ----
  const identity = await resolveIdentity(body.accessToken);

  const clientName = sanitizeName(body.customerName);
  // A name is required for every checkout; for authenticated customers the
  // account name is authoritative and the browser value is only a fallback.
  const customerName = identity.authenticated && identity.name ? identity.name : clientName;
  if (!customerName) {
    sendError(res, 400, "Your name is required.", "INVALID_NAME");
    return;
  }

  // ---- Phone resolution: stored account number wins for authenticated users. ----
  const clientPhone = normalizeIndianPhone(typeof body.customerPhone === "string" ? body.customerPhone : "");
  const identityPhone = identity.authenticated && identity.phone
    ? normalizeIndianPhone(identity.phone)
    : null;

  let customerPhone: string | null;
  if (identity.authenticated && identityPhone) {
    customerPhone = identityPhone;
  } else {
    customerPhone = clientPhone;
  }
  if (!customerPhone) {
    sendError(res, 400, "A valid 10-digit mobile number is required.", "INVALID_PHONE");
    return;
  }

  // Authenticated user with no phone on file + a valid new number entered at
  // checkout → persist it to THEIR OWN profile (never overwrite an existing
  // number, never touch another user's row). Best effort.
  if (identity.authenticated && identity.userId && !identityPhone && clientPhone) {
    try {
      const scoped = createUserScopedClient(body.accessToken as string);
      await scoped
        .from("profiles")
        .update({ phone: clientPhone, updated_at: new Date().toISOString() })
        .eq("user_id", identity.userId)
        .or("phone.is.null,phone.eq.\"\"");
      await scoped
        .from("users")
        .update({ phone: clientPhone })
        .eq("id", identity.userId)
        .or("phone.is.null,phone.eq.\"\"");
    } catch {
      // Checkout must never fail because profile persistence failed.
    }
  }

  // ---- Delivery address: server is the source of truth. ----
  // No valid address → no payment, no order (the razor-sharp checkout rule).
  const deliveryResult = await resolveDeliveryAddress(body.deliveryAddress, identity);
  if ("error" in deliveryResult) {
    sendError(res, 400, deliveryResult.error, "INVALID_ADDRESS");
    return;
  }
  const deliveryAddress = deliveryResult.address;

  const discount =
    typeof body.discount === "number" && Number.isFinite(body.discount) && body.discount >= 0
      ? Math.min(body.discount, 100_000)
      : 0;

  const cartResult = validateCartLines(body.items);
  if ("error" in cartResult) {
    sendError(res, 400, cartResult.error, "INVALID_ITEMS");
    return;
  }
  const lines = cartResult.lines;

  try {
    // ---- Idempotency: re-use an already-created pending Razorpay order. ----
    const existing = await findPaymentByTransactionId(transactionId);
    // We purposefully store the coin flag in a function-scoped variable rather
    // than only inside the `if (existing)` block: the zero-value coin path below
    // must also know whether a prior attempt left a pending coin record so a
    // retry reuses it instead of double-processing the transaction.
    const isCoinRecord =
      existing != null &&
      ((existing.metadata ?? {}) as Record<string, unknown>).payment_method ===
        "FOOD_FACTORY_COINS";
    if (existing) {
      if (existing.payment_status === "paid") {
        if (isCoinRecord && existing.ff_order_number) {
          // Zero-value coin order already placed — return it idempotently.
          sendJson(res, 200, {
            success: true,
            alreadyPaid: true,
            orderNumber: existing.ff_order_number,
            orderId: "",
            keyId: "",
            amount: 0,
            amountLabel: "₹0",
            currency: "INR",
            transactionId,
            paymentMethod: "FOOD_FACTORY_COINS",
            paymentRequired: false,
          });
          return;
        }
        if (existing.razorpay_order_id) {
          sendJson(res, 200, {
            success: true,
            alreadyPaid: true,
            orderId: existing.razorpay_order_id,
            keyId: razorpayPublicKeyId(),
            amount: existing.amount_paise,
            amountLabel: inrLabelFromPaise(existing.amount_paise),
            currency: existing.currency,
            transactionId,
            paymentRequired: true,
          });
          return;
        }
      }
      if (!isCoinRecord && existing.razorpay_order_id && existing.payment_status === "pending") {
        sendJson(res, 200, {
          success: true,
          alreadyPaid: false,
          orderId: existing.razorpay_order_id,
          keyId: razorpayPublicKeyId(),
          amount: existing.amount_paise,
          amountLabel: inrLabelFromPaise(existing.amount_paise),
          currency: existing.currency,
          transactionId,
          paymentRequired: true,
        });
        return;
      }
      // A failed Razorpay transaction can be retried with a fresh Razorpay
      // order below; a failed COIN attempt is retried from scratch (the
      // order itself is voided on redemption failure).
    }

    // ---- Server-side product validation + pricing (source of truth). ----
    const productIds = lines.map((l) => l.productId).filter((id) => UUID_RE.test(id));
    if (productIds.length !== lines.length) {
      sendError(res, 400, "Invalid product in cart.", "INVALID_PRODUCT_ID");
      return;
    }

    const { data: products, error } = await getServerSupabase()
      .from("products")
      .select("id, name, price, available, category")
      .in("id", productIds);

    if (error) {
      console.error("create-order: product fetch failed", error.message);
      sendError(res, 503, "Unable to start payment. Please try again.", "PRODUCT_FETCH_FAILED");
      return;
    }

    const productMap = new Map<string, { id: string; name: string; price: number; available: boolean }>();
    for (const p of products || []) {
      productMap.set(String(p.id), {
        id: String(p.id),
        name: String(p.name ?? "Item"),
        price: Number(p.price) || 0,
        available: p.available !== false,
      });
    }

    const pricedItems = [];
    for (const line of lines) {
      const product = productMap.get(line.productId);
      if (!product) {
        sendError(res, 400, "Some items in your cart are no longer available.", "PRODUCT_UNAVAILABLE");
        return;
      }
      if (!product.available) {
        sendError(res, 400, `${product.name} is currently unavailable.`, "PRODUCT_UNAVAILABLE");
        return;
      }
      if (line.quantity > MAX_QUANTITY_PER_ITEM) {
        sendError(res, 400, `Quantity is too high for ${product.name}.`, "QUANTITY_LIMIT");
        return;
      }
      pricedItems.push({
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: line.quantity,
        pricePaise: Math.round(product.price * 100),
        lineTotalPaise: Math.round(product.price * 100) * line.quantity,
      });
    }

    // Delivery fee rule: free within 2 km, ₹20 beyond. The fee follows the
    // ACTUAL distance between the shop and the delivery coordinates; when a
    // customer has no coordinates the distance cannot be established and the
    // delivery is treated as FREE (never penalised by missing location).
    const distanceKm = distanceToShopKm(deliveryAddress.latitude, deliveryAddress.longitude) ?? 0;

    // ---- Coin redemption: server validates and computes discount. ----
    let coinDiscountRupees = 0;
    let coinRequestFailed = false;
    if (body.useCoins === true) {
      if (!identity.authenticated || !identity.userId) {
        console.log(`[create-order] useCoins requested but identity NOT authenticated — identity:`, JSON.stringify({ authenticated: identity.authenticated, userId: identity.userId }));
        coinRequestFailed = true;
      } else {
        const redemption = await validateRedemption(identity.userId, identity.accessToken);
        console.log(`[create-order] validateRedemption result:`, JSON.stringify(redemption));
        if (redemption.eligible) {
          coinDiscountRupees = redemption.discountAmount;
        } else {
          coinRequestFailed = true;
        }
      }
    }

    const amounts = computeOrderAmounts(pricedItems, discount, distanceKm, coinDiscountRupees);

    // If the customer asked to pay with coins but we couldn't apply them
    // (identity failed, insufficient balance, minimum not met, etc.), do NOT
    // silently fall through to Razorpay for the full amount — reject the
    // request with a clear message so the frontend can show it.
    if (coinRequestFailed && amounts.coinDiscount === 0) {
      sendError(res, 400, "Your Food Factory Coins could not be applied. Check your balance and try again.", "COINS_UNAVAILABLE");
      return;
    }

    if (amounts.totalPaise <= 0) {
      if (amounts.coinDiscount > 0 && identity.authenticated && identity.userId && identity.accessToken) {
        // Zero-value order fully covered by Food Factory Coins → place it
        // directly and atomically redeem the coins (no Razorpay involved).
        const snapshot = buildPaymentSnapshot(pricedItems, amounts);
        const orderRow = {
          customer_name: customerName,
          customer_phone: customerPhone,
          subtotal: amounts.subtotal,
          discount: amounts.discount,
          coin_discount: amounts.coinDiscount,
          gst: amounts.gst,
          delivery: amounts.delivery,
          grand_total: 0,
          status: "pending",
          payment_method: "FOOD_FACTORY_COINS",
          delivery_address: deliveryAddress ?? null,
          user_id: identity.userId,
          created_at: nowIso(),
          updated_at: nowIso(),
        };
        const itemRows = pricedItems.map((it) => ({
          product_name: it.name,
          product_price: it.price,
          quantity: it.quantity,
          total: it.lineTotalPaise / 100,
          created_at: nowIso(),
        }));

        let orderResult: { id: string; order_number: string };
        try {
          orderResult = await ensureOrderRowWithItems(generateOrderNumber(), orderRow, itemRows);
        } catch {
          sendError(res, 500, "Unable to place your order. Please try again.", "ORDER_CREATE_FAILED");
          return;
        }

        // Atomic redemption: wallet already place our order at the discounted
        // price, so a redeem failure voids the order and the user simply
        // retries — their balance was never at risk.
        const coinsToUse = Math.round(amounts.coinDiscount);
        const redemption = await redeemCoinsAtomicForOrder({
          accessToken: identity.accessToken,
          userId: identity.userId,
          coinsToUse,
          orderId: orderResult.id,
          orderNumber: orderResult.order_number,
          discountAmount: amounts.coinDiscount,
        });
        if (!redemption.success) {
          await getServerSupabase().from("orders").delete().eq("id", orderResult.id);
          sendError(res, 409, coinFailureMessage(redemption.code), "COIN_REDEMPTION_FAILED");
          return;
        }

        // Ledger (idempotency) entry + mark it paid. A retried transaction
        // after a failed redemption reuses its pending record (the deleted
        // order gets recreated here), keeping transaction_id unique.
        const record =
          existing && isCoinRecord && existing.payment_status === "pending"
            ? existing
            : await createPaymentRecord({
                transactionId,
                razorpayOrderId: null, // coin-only order → no Razorpay order id,
                amountPaise: 0,
                amountRupees: 0,
                customerName,
                customerPhone,
                customerUserId: identity.userId,
                snapshot,
                deliveryAddress,
                coinRedemption: { userId: identity.userId, discountAmount: amounts.coinDiscount },
                metadataAppend: { payment_method: "FOOD_FACTORY_COINS" },
              });
        await getServerSupabase()
          .from("payment_records")
          .update({ payment_status: "paid", ff_order_number: orderResult.order_number, paid_at: nowIso() })
          .eq("id", record.id)
          .in("payment_status", ["pending", "failed"]);

        console.log(
          `Zero-value order placed with coins { transactionId: "${transactionId}", orderNumber: "${orderResult.order_number}", coins: ${coinsToUse}, newBalance: ${redemption.newBalance} }`,
        );

        sendJson(res, 200, {
          success: true,
          alreadyPaid: true,
          orderNumber: orderResult.order_number,
          orderId: "",
          keyId: "",
          amount: 0,
          amountLabel: "₹0",
          currency: CURRENCY,
          transactionId,
          paymentMethod: "FOOD_FACTORY_COINS",
          paymentRequired: false,
          coinsUsed: coinsToUse,
          coinDiscount: amounts.coinDiscount,
          amountPaid: 0,
          finalAmount: 0,
          coinBalance: redemption.newBalance,
          remainingCoinBalance: redemption.newBalance,
          handlerVersion: HANDLER_VERSION,
        });
        return;
      }
      sendError(res, 400, "Minimum order amount is ₹1.", "AMOUNT_TOO_LOW");
      return;
    }
    if (amounts.totalPaise < MIN_PAYABLE_PAISE) {
      sendError(res, 400, "Minimum order amount is ₹1.", "AMOUNT_TOO_LOW");
      return;
    }

    const snapshot = buildPaymentSnapshot(pricedItems, amounts);

    if (!isRazorpayConfigured()) {
      console.error("Razorpay is not configured (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET).");
      sendError(res, 503, "Online payments are temporarily unavailable.", "PAYMENT_NOT_CONFIGURED");
      return;
    }

    // ---- Create the Razorpay order (amount is what WE calculated). ----
    const receipt = `FF-${transactionId.replace(/[^A-Za-z0-9]/g, "").slice(0, 24)}`.slice(0, 40);
    const razorpayOrder = await getRazorpay().orders.create({
      amount: amounts.totalPaise,
      currency: CURRENCY,
      receipt,
      notes: {
        transaction_id: transactionId,
        ...(customerName ? { customer_name: customerName } : {}),
      },
    });

    await createPaymentRecord({
      transactionId,
      razorpayOrderId: razorpayOrder.id,
      amountPaise: amounts.totalPaise,
      amountRupees: amounts.grandTotal,
      customerName,
      customerPhone,
      customerUserId: identity.userId,
      snapshot,
      deliveryAddress,
      ...(coinDiscountRupees > 0 ? { coinRedemption: { userId: identity.userId, discountAmount: coinDiscountRupees } } : {}),
    });

    console.log(
      `Payment order created { transactionId: "${transactionId}", razorpayOrderId: "${razorpayOrder.id}", amountPaise: ${amounts.totalPaise}, deliveryPaise: ${amounts.deliveryPaise} }`,
    );

    sendJson(res, 200, {
      success: true,
      alreadyPaid: false,
      orderId: razorpayOrder.id,
      keyId: razorpayPublicKeyId(),
      amount: amounts.totalPaise,
      amountLabel: inrLabelFromPaise(amounts.totalPaise),
      currency: CURRENCY,
      transactionId,
      paymentRequired: true,
      delivery: amounts.delivery,
      handlerVersion: HANDLER_VERSION,
    });
  } catch (err) {
    if (err instanceof RazorpayServiceError) throw err;
    if (err && typeof err === "object" && (err as { statusCode?: number }).statusCode === 401) {
      console.error("create-order: Razorpay authentication failed (check RAZORPAY_KEY_ID / KEY_SECRET).");
      sendError(res, 502, "Payment provider is unavailable. Please try again later.", "PAYMENT_GATEWAY_AUTH");
      return;
    }
    console.error("create-order: unexpected error", err instanceof Error ? err.message : err);
    sendError(res, 500, "Unable to start payment. Please try again.", "PAYMENT_START_FAILED");
  }
}