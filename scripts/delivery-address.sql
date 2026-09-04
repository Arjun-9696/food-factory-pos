-- ============================================================================
-- FOOD FACTORY POS - Delivery address + delivery charge
-- ============================================================================
-- Additive migration that extends the checkout with delivery addresses:
--   * payment_records.delivery_address JSONB — address snapshot captured at
--     payment creation (pinned from the customer's profile for signed-in
--     users, validated client snapshot for guests).
--   * orders.delivery_address   JSONB — same snapshot copied onto the order
--     so HISTORICAL ORDERS keep the address that was used, even if the
--     customer later edits their profile.
--   * orders.delivery           FLOAT — delivery fee (₹0 within 2 km, ₹20
--     beyond) that was charged for this order.
--
-- Run via:
--   npm run razorpay:db
-- Safe to re-run. Does not modify or delete any existing data.
-- ============================================================================

ALTER TABLE public.payment_records
    ADD COLUMN IF NOT EXISTS delivery_address JSONB;

ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS delivery_address JSONB;

ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS delivery DOUBLE PRECISION NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_orders_delivery
    ON public.orders (delivery);