// ============================================================================
// Amounts with coin redemption — Food Factory Coins reduce the payable amount
// server-side. Pricing stays authoritative in the API layer; these tests lock
// down the discount/order-of-operations math.
// ============================================================================
import { describe, it, expect } from "vitest";
import { computeOrderAmounts, deliveryChargePaise } from "../../api/lib/amounts";

const MOMOS_PAISE = 30000; // ₹300
const PIZZA_PAISE = 20000; // ₹200

const cart = [
  { pricePaise: MOMOS_PAISE, quantity: 1 },
  { pricePaise: PIZZA_PAISE, quantity: 1 },
]; // subtotal ₹500

describe("computeOrderAmounts with coin redemption", () => {
  it("applies a coin discount to the grand total (subtotal ₹500, 100 coins)", () => {
    const a = computeOrderAmounts(cart, 0, 0, 100);
    expect(a.subtotal).toBe(500);
    expect(a.coinDiscountPaise).toBe(10000); // ₹100
    expect(a.coinDiscount).toBe(100);
    expect(a.taxableAmount).toBe(400); // GST is charged on the taxable base
    expect(a.gst).toBe(20); // 5% of ₹400
    expect(a.delivery).toBe(0);
    expect(a.grandTotal).toBe(420);
    expect(a.totalPaise).toBe(42000);
  });

  it("caps the coin discount when coins exceed the subtotal → zero-value order", () => {
    const smallCart = [{ pricePaise: 5000, quantity: 1 }]; // ₹50
    const a = computeOrderAmounts(smallCart, 0, 0, 100);
    expect(a.coinDiscount).toBe(50); // never negative / beyond order value
    expect(a.taxableAmount).toBe(0);
    expect(a.gst).toBe(0);
    expect(a.grandTotal).toBe(0);
    expect(a.totalPaise).toBe(0); // the zero-value case handled by create-order
  });

  it("applies regular discount first, coin discount on the remainder", () => {
    const a = computeOrderAmounts(cart, 100, 0, 50); // ₹100 off, then 50 coins
    expect(a.discount).toBe(100);
    expect(a.coinDiscount).toBe(50);
    expect(a.gst).toBe(17.5); // 5% of ₹350 (paise math: 1750 paise)
    expect(a.grandTotal).toBe(367.5);
  });

  it("keeps delivery separate from the coin discount", () => {
    const a = computeOrderAmounts(cart, 0, 3, 100); // beyond 2 km → ₹20
    expect(a.coinDiscount).toBe(100);
    expect(a.delivery).toBe(20);
    expect(a.grandTotal).toBe(440); // 500 - 100 + 20 GST + 20 delivery
  });

  it("treats negative or garbage coin discount as zero", () => {
    const a = computeOrderAmounts(cart, 0, 0, -50);
    expect(a.coinDiscount).toBe(0);
    expect(a.grandTotal).toBe(525); // full 5% GST on ₹500
  });

  it("deliveryChargePaise follows the 2km free rule", () => {
    expect(deliveryChargePaise(0)).toBe(0);
    expect(deliveryChargePaise(2)).toBe(0);
    expect(deliveryChargePaise(2.5)).toBe(2000);
  });
});