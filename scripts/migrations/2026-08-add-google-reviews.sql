-- ============================================================================
-- Migration: Admin-curated "Top Google Reviews"
-- Date: 2026-08
-- Run this in the Supabase SQL editor.
-- The shop owner pastes favourite Google Maps reviews once via the Admin
-- page; every product page shows them under the live Google rating summary.
-- No Places API billing needed for review text.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.google_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT NOT NULL DEFAULT '',
  relative_time TEXT NOT NULL DEFAULT '',
  display_order INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_google_reviews_order
  ON public.google_reviews (display_order, created_at DESC);
ALTER TABLE public.google_reviews ENABLE ROW LEVEL SECURITY;
-- Anyone can read (product pages render these).
CREATE POLICY "Anyone can read google reviews"
  ON public.google_reviews FOR SELECT
  USING (true);
-- Writes follow the same convention as the products table: gated inside the
-- app by the admin email check, permissive at the database level.
CREATE POLICY "Admins can insert google reviews"
  ON public.google_reviews FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can update google reviews"
  ON public.google_reviews FOR UPDATE USING (true);
CREATE POLICY "Admins can delete google reviews"
  ON public.google_reviews FOR DELETE USING (true);
