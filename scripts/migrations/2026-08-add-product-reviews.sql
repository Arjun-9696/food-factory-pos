-- ============================================================================
-- Migration: Product reviews & ratings
-- Date: 2026-08
-- Run this in the Supabase SQL editor to enable customer reviews.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.product_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL DEFAULT 'Customer',
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One review per user per product (re-saving upserts).
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_reviews_unique
  ON public.product_reviews (product_id, user_id);

CREATE INDEX IF NOT EXISTS idx_product_reviews_product
  ON public.product_reviews (product_id, created_at DESC);

ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can read reviews (needed to show ratings on product pages).
CREATE POLICY "Anyone can read product reviews"
  ON public.product_reviews FOR SELECT
  USING (true);

-- Signed-in users can create a review, but only for themselves.
CREATE POLICY "Users can create own reviews"
  ON public.product_reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can edit ONLY their own review.
CREATE POLICY "Users can update own reviews"
  ON public.product_reviews FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete ONLY their own review.
CREATE POLICY "Users can delete own reviews"
  ON public.product_reviews FOR DELETE
  USING (auth.uid() = user_id);

-- Keep updated_at fresh.
CREATE TRIGGER update_product_reviews_updated_at BEFORE UPDATE ON public.product_reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
