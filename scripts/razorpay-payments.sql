-- ============================================================================
-- FOOD FACTORY POS - Razorpay payment ledger
-- ============================================================================
-- Adds a `payment_records` table used by the Razorpay serverless functions to:
--   * Track every Razorpay order/payment (idempotency + reconciliation)
--   * Store the server-side calculated amount and a snapshot of the cart
--   * Link a Razorpay payment to its Food Factory order
--
-- Run this in the Supabase SQL Editor (or via:
--   npm run razorpay:db
-- )
--
-- This migration is purely ADDITIVE — it does not modify any existing table.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.payment_records (
    id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- Client-supplied idempotency key (UUID generated per checkout attempt).
    transaction_id     TEXT UNIQUE NOT NULL,
    razorpay_order_id  TEXT UNIQUE,
    razorpay_payment_id TEXT,
    razorpay_signature TEXT,
    -- Food Factory internal order number (set once the payment is verified).
    ff_order_number    TEXT,
    amount_paise       INTEGER NOT NULL DEFAULT 0,
    amount_rupees      DOUBLE PRECISION NOT NULL DEFAULT 0,
    currency           TEXT NOT NULL DEFAULT 'INR',
    payment_status     TEXT NOT NULL DEFAULT 'pending'
                       CHECK (payment_status IN ('pending', 'paid', 'failed')),
    customer_name      TEXT,
    customer_phone     TEXT,
    snapshot           JSONB,
    metadata           JSONB,
    created_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_records_status
    ON public.payment_records (payment_status);
CREATE INDEX IF NOT EXISTS idx_payment_records_ff_order
    ON public.payment_records (ff_order_number);
CREATE INDEX IF NOT EXISTS idx_payment_records_payment_id
    ON public.payment_records (razorpay_payment_id);

-- ============================================================================
-- Keep updated_at in sync
-- ============================================================================
CREATE OR REPLACE FUNCTION update_payment_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_payment_records_updated_at
    ON public.payment_records;
CREATE TRIGGER update_payment_records_updated_at
    BEFORE UPDATE ON public.payment_records
    FOR EACH ROW EXECUTE FUNCTION update_payment_records_updated_at();

-- ============================================================================
-- Row Level Security
-- ============================================================================
-- The rest of this project grants the `anon` role full access on all tables
-- (supabase-schema.sql), and the serverless functions run under those keys.
-- Mirror that posture here for consistency, so the API layer can read/update
-- payment_records. Swap this for a service-role-key + closed RLS when you
-- harden the deployment.
ALTER TABLE public.payment_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read payment records"
    ON public.payment_records;
CREATE POLICY "Anyone can read payment records"
    ON public.payment_records FOR SELECT USING (true);

DROP POLICY IF EXISTS "Insert payment records"
    ON public.payment_records;
CREATE POLICY "Insert payment records"
    ON public.payment_records FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Update payment records"
    ON public.payment_records;
CREATE POLICY "Update payment records"
    ON public.payment_records FOR UPDATE USING (true);