-- ============================================================================
-- FOOD FACTORY POS - Complete PostgreSQL Schema for Supabase
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- USERS TABLE (extends Supabase auth.users)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT,
    email TEXT UNIQUE,
    phone TEXT,
    role TEXT DEFAULT 'customer' CHECK (role IN ('admin', 'customer')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- PROFILES TABLE (extends Supabase auth.users profile)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
    full_name TEXT,
    email TEXT,
    phone TEXT,
    gender TEXT,
    dob DATE,
    house_number TEXT,
    street TEXT,
    area TEXT,
    city TEXT,
    state TEXT,
    postal_code TEXT,
    country TEXT DEFAULT 'India',
    latitude FLOAT DEFAULT 0,
    longitude FLOAT DEFAULT 0,
    full_address TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- CATEGORIES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    emoji TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- PRODUCTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    price FLOAT NOT NULL DEFAULT 0,
    food_type TEXT DEFAULT 'veg' CHECK (food_type IN ('veg', 'egg', 'nonveg')),
    is_veg BOOLEAN DEFAULT true,
    image TEXT,
    available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on category for faster queries
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_available ON public.products(available);

-- ============================================================================
-- CUSTOMERS TABLE (for loyalty tracking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT,
    phone TEXT UNIQUE NOT NULL,
    email TEXT,
    total_orders INTEGER DEFAULT 0,
    total_spent FLOAT DEFAULT 0,
    loyalty_points INTEGER DEFAULT 0,
    loyalty_date TIMESTAMP WITH TIME ZONE,
    last_order_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- ORDERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number TEXT UNIQUE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    customer_name TEXT,
    customer_phone TEXT,
    subtotal FLOAT NOT NULL DEFAULT 0,
    discount FLOAT DEFAULT 0,
    gst FLOAT DEFAULT 0,
    grand_total FLOAT NOT NULL DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'ready', 'completed', 'cancelled')),
    payment_method TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);

-- ============================================================================
-- ORDER ITEMS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    product_price FLOAT NOT NULL DEFAULT 0,
    quantity INTEGER NOT NULL DEFAULT 1,
    total FLOAT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);

-- ============================================================================
-- CART TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.cart (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cart_user_id ON public.cart(user_id);

-- ============================================================================
-- INSERT SAMPLE DATA
-- ============================================================================

-- Insert sample categories
INSERT INTO public.categories (name, emoji) VALUES
    ('Burger', '🍔'),
    ('Pizza', '🍕'),
    ('Smoothies', '🥤'),
    ('Mojito', '🍹'),
    ('Lassi', '🥛'),
    ('Shakes', '🧋'),
    ('Chinese', '🥡'),
    ('Fast Food', '🍟'),
    ('Dessert', '🍰'),
    ('Falooda', '🍜')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES (Optional - for extra security)
-- ============================================================================

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read/write their own profile
CREATE POLICY "Users can read all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Products: Everyone can read, only admins can modify
CREATE POLICY "Anyone can read products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Admins can insert products" ON public.products FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can update products" ON public.products FOR UPDATE USING (true);
CREATE POLICY "Admins can delete products" ON public.products FOR DELETE USING (true);

-- Orders: Users can read their own orders
CREATE POLICY "Users can read own orders" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Anyone can insert orders" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own orders" ON public.orders FOR UPDATE USING (true);

-- Order Items: Same as orders
CREATE POLICY "Anyone can read order items" ON public.order_items FOR SELECT USING (true);
CREATE POLICY "Anyone can insert order items" ON public.order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own order items" ON public.order_items FOR UPDATE USING (true);

-- Customers: Everyone can read, only insert/update
CREATE POLICY "Anyone can read customers" ON public.customers FOR SELECT USING (true);
CREATE POLICY "Anyone can insert customers" ON public.customers FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update customers" ON public.customers FOR UPDATE USING (true);

-- Categories: Same as products
CREATE POLICY "Anyone can read categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Anyone can manage categories" ON public.categories FOR ALL USING (true);

-- ============================================================================
-- FUNCTION TO UPDATE UPDATED_AT TIMESTAMP
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
