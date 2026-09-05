-- ============================================================================
-- FOOD FACTORY POS - Payment confirmation + WhatsApp invoice fields
-- ============================================================================
-- Additive migration that extends `payment_records` (created by
-- scripts/razorpay-payments.sql) with:
--   * paid_at                 — when the payment was verified as captured
--   * whatsapp_invoice_status — 'PENDING' | 'SENT' | 'FAILED' (NULL = not attempted)
--   * whatsapp_message_id     — provider message id (only when actually sent)
--   * invoice_sent_at         — timestamp the invoice was delivered
--
-- Run via:
--   npm run razorpay:db
-- Safe to re-run. Does not modify or delete any existing data.
-- ============================================================================

ALTER TABLE public.payment_records
    ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.payment_records
    ADD COLUMN IF NOT EXISTS whatsapp_invoice_status TEXT;
ALTER TABLE public.payment_records
    ADD COLUMN IF NOT EXISTS whatsapp_message_id TEXT;
ALTER TABLE public.payment_records
    ADD COLUMN IF NOT EXISTS invoice_sent_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_payment_records_whatsapp_status
    ON public.payment_records (whatsapp_invoice_status)
    WHERE whatsapp_invoice_status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_records_paid_at
    ON public.payment_records (paid_at)
    WHERE paid_at IS NOT NULL;