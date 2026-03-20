-- Fix orders table - remove foreign key constraint
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_user_id_fkey;

-- If the column has foreign key, change it
ALTER TABLE public.orders ALTER COLUMN user_id TYPE TEXT;
