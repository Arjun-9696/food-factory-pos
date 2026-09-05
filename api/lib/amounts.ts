// ============================================================================
// SERVER-SIDE AMOUNT CALCULATION — the authoritative pricing layer.
// The browser is never trusted with prices. The server fetches products from
// the database, validates availability/quantity, and reproduces the exact
// Food Factory money rules in paise (integer arithmetic — no float drift):
//
//   subtotal   = Σ (product.price * quantity)          [database price]
//   discount   = min(requestedDiscount, subtotal)      [₹, ≥ 0]
//   gst        = round((subtotal - discount) * 5%)
//   delivery   = ₹0 within 2 km, else ₹20 per the Food Factory delivery rule
//   grandTotal = subtotal - discount + gst + delivery
//
// Razorpay is charged in the smallest currency unit (paise for INR).
// This pipeline exactly mirrors the CartContext display total so the amount
// the customer sees matches the amount Razorpay charges.
// ============================================================================

export const CURRENCY = "INR";
export const INR_PAISE_DIVISOR = 100;
export const GST_RATE = 0.05;
export const MIN_PAYABLE_PAISE = 100; // Razorpay minimum order amount is ₹1.
export const MAX_QUANTITY_PER_ITEM = 99;
export const FREE_DELIVERY_KM = 2;
export const DELIVERY_FEE_PAISE = 20 * INR_PAISE_DIVISOR;

export interface CartLineInput {
  productId: string;
  quantity: number;
}

export interface ServerPricedItem {
  productId: string;
  name: string;
  price: number; // rupees, stored canonically (price/100 * qty from DB float)
  quantity: number;
  pricePaise: number;
  lineTotalPaise: number;
}

export interface AmountBreakdown {
  subtotalPaise: number;
  discountPaise: number;
  coinDiscountPaise: number;
  gstPaise: number;
  deliveryPaise: number;
  totalPaise: number;
  // Rupee equivalents (for persistent storage / admin display).
  subtotal: number;
  discount: number;
  coinDiscount: number;
  /** Result of subtotal − discount − coinDiscount (never negative). GST is
   *  calculated on THIS amount — the authoritative taxable base. */
  taxableAmount: number;
  gst: number;
  delivery: number;
  grandTotal: number;
}

/**
 * Food Factory delivery rule: free within 2 km, ₹20 above that.
 * The cart UI currently does not select a delivery distance, so callers pass
 * the default 0 km (distance = 2 km assumed) → delivery charge ₹0.
 */
export function deliveryChargePaise(distanceKm = 0): number {
  return distanceKm > FREE_DELIVERY_KM ? DELIVERY_FEE_PAISE : 0;
}

/** Convert an INR amount to paise using safe rounding (no float drift). */
export function rupeesToPaise(rupees: number): number {
  if (!Number.isFinite(rupees) || rupees < 0) return 0;
  return Math.round(rupees * INR_PAISE_DIVISOR);
}

function roundPercentPaise(basePaise: number, rate: number): number {
  return Math.round(basePaise * rate);
}

export function computeOrderAmounts(
  pricedItems: Array<{ pricePaise: number; quantity: number }>,
  discountRupees: number,
  distanceKm = 0,
  coinDiscountRupees = 0,
): AmountBreakdown {
  const subtotalPaise = pricedItems.reduce((sum, it) => sum + it.pricePaise * it.quantity, 0);
  const requestedDiscountPaise = rupeesToPaise(discountRupees);
  const discountPaise = Math.min(requestedDiscountPaise, subtotalPaise);
  const requestedCoinDiscountPaise = rupeesToPaise(coinDiscountRupees);
  const coinDiscountPaise = Math.min(requestedCoinDiscountPaise, subtotalPaise - discountPaise);
  const taxablePaise = Math.max(0, subtotalPaise - discountPaise - coinDiscountPaise);
  const gstPaise = roundPercentPaise(taxablePaise, GST_RATE);
  const deliveryPaise = deliveryChargePaise(distanceKm);
  const totalPaise = taxablePaise + gstPaise + deliveryPaise;

  return {
    subtotalPaise,
    discountPaise,
    coinDiscountPaise,
    gstPaise,
    deliveryPaise,
    totalPaise,
    subtotal: subtotalPaise / INR_PAISE_DIVISOR,
    discount: discountPaise / INR_PAISE_DIVISOR,
    coinDiscount: coinDiscountPaise / INR_PAISE_DIVISOR,
    taxableAmount: taxablePaise / INR_PAISE_DIVISOR,
    gst: gstPaise / INR_PAISE_DIVISOR,
    delivery: deliveryPaise / INR_PAISE_DIVISOR,
    grandTotal: totalPaise / INR_PAISE_DIVISOR,
  };
}

export function inrLabelFromPaise(paise: number): string {
  return `₹${(paise / INR_PAISE_DIVISOR).toLocaleString("en-IN", {
    minimumFractionDigits: paise % INR_PAISE_DIVISOR === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Basic shape validation for the create-order payload. Returns an error message or null. */
export function validateCartLines(raw: unknown): { error: string } | { lines: CartLineInput[] } {
  if (!Array.isArray(raw) || raw.length === 0) {
    return { error: "Cart is empty." };
  }

  const seen = new Set<string>();
  const lines: CartLineInput[] = [];

  for (const entry of raw) {
    if (typeof entry !== "object" || entry === null) {
      return { error: "Invalid cart line." };
    }
    const { productId, quantity } = entry as { productId?: unknown; quantity?: unknown };
    if (typeof productId !== "string" || productId.length === 0 || productId.length > 256) {
      return { error: "Invalid product in cart." };
    }
    if (seen.has(productId)) {
      return { error: "Duplicate product in cart." };
    }
    seen.add(productId);
    if (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY_PER_ITEM) {
      return { error: "Invalid quantity for an item." };
    }
    lines.push({ productId, quantity });
  }

  return { lines };
}