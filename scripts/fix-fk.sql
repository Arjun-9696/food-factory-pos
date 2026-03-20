-- ============================================================================
-- Fix foreign key issues - Run this in Supabase SQL Editor
-- ============================================================================

-- Fix orders table - remove foreign key constraint
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_user_id_fkey;
ALTER TABLE public.orders ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE public.orders ALTER COLUMN user_id DROP NOT NULL;

-- Fix profiles table - remove foreign key constraint  
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;
ALTER TABLE public.profiles ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE public.profiles ALTER COLUMN user_id DROP NOT NULL;
