-- ============================================================================
-- Migration: add product `details` JSONB column
-- Purpose: stores optional rich product attributes rendered on the Product
--          Detail Page (short description, compare-at price, ingredients,
--          nutrition, dietary flags, spice level, prep time, badges).
--
-- The app is fully tolerant of this column being missing — it only reads it
-- when present. Run this to enable the admin "Menu Details" fields.
--
-- Run in Supabase Dashboard → SQL Editor, or:
--   supabase db execute -f scripts/migrations/2026-08-add-product-details.sql
-- ============================================================================

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS details JSONB;
