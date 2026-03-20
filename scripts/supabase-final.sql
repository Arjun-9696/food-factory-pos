-- ============================================================================
-- FOOD FACTORY POS - Complete Working Schema
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- DROP ALL TABLES
-- ============================================================================
DROP TABLE IF EXISTS public.cart CASCADE;
DROP TABLE IF EXISTS public.order_items CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.customers CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- ============================================================================
-- CATEGORIES TABLE (no foreign keys - standalone)
-- ============================================================================
CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    emoji TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- PRODUCTS TABLE (no foreign keys - standalone)
-- ============================================================================
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    price FLOAT NOT NULL DEFAULT 0,
    food_type TEXT DEFAULT 'veg',
    is_veg BOOLEAN DEFAULT true,
    image TEXT,
    available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_products_category ON public.products(category);
CREATE INDEX idx_products_available ON public.products(available);

-- ============================================================================
-- CUSTOMERS TABLE (standalone - no foreign keys)
-- ============================================================================
CREATE TABLE public.customers (
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
-- ORDERS TABLE (standalone - no foreign keys to avoid issues)
-- ============================================================================
CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number BIGINT GENERATED ALWAYS AS IDENTITY (START WITH 100000 INCREMENT BY 1) UNIQUE NOT NULL,
    user_id TEXT,
    customer_id UUID REFERENCES customers(id),
    customer_name TEXT,
    customer_phone TEXT,
    subtotal FLOAT NOT NULL DEFAULT 0,
    discount FLOAT DEFAULT 0,
    gst FLOAT DEFAULT 0,
    grand_total FLOAT NOT NULL DEFAULT 0,
    status TEXT DEFAULT 'pending',
    payment_method TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_orders_user_id ON public.orders(user_id);
CREATE INDEX idx_orders_customer_id ON public.orders(customer_id);
CREATE INDEX idx_orders_created_at ON public.orders(created_at);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_customer_phone ON public.orders(customer_phone);

-- ============================================================================
-- ORDER ITEMS TABLE (standalone - no foreign keys)
-- ============================================================================
CREATE TABLE public.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    product_price FLOAT NOT NULL DEFAULT 0,
    quantity INTEGER NOT NULL DEFAULT 1,
    total FLOAT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_order_items_order_id ON public.order_items(order_id);

-- ============================================================================
-- CART TABLE (standalone)
-- ============================================================================
CREATE TABLE public.cart (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT,
    product_id TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- PROFILES TABLE (standalone - no foreign key to avoid issues)
-- ============================================================================
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT UNIQUE,
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
-- INSERT SAMPLE CATEGORIES
-- ============================================================================
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
-- INSERT SAMPLE PRODUCTS (you can add more)
-- ============================================================================
INSERT INTO public.products (name, description, category, price, food_type, is_veg, available) VALUES
-- Burgers
('Classic Burger', 'Juicy beef patty with fresh veggies', 'Burger', 149, 'nonveg', false, true),
('Veggie Burger', 'Crispy vegetable patty with lettuce', 'Burger', 129, 'veg', true, true),
('Chicken Burger', 'Grilled chicken with mayo', 'Burger', 169, 'nonveg', false, true),
-- Pizza
('Margherita Pizza', 'Classic tomato and mozzarella', 'Pizza', 299, 'veg', true, true),
('Chicken Pizza', 'Loaded with chicken toppings', 'Pizza', 349, 'nonveg', false, true),
('Veggie Pizza', 'Mix of fresh vegetables', 'Pizza', 279, 'veg', true, true),
-- Smoothies
('Mango Smoothie', 'Fresh mango blended with milk', 'Smoothies', 89, 'veg', true, true),
('Strawberry Smoothie', 'Sweet strawberries with yogurt', 'Smoothies', 99, 'veg', true, true),
('Banana Smoothie', 'Creamy banana milkshake', 'Smoothies', 79, 'veg', true, true),
-- Mojitos
('Mint Mojito', 'Refreshing mint and lime', 'Mojito', 79, 'veg', true, true),
('Watermelon Mojito', 'Fresh watermelon drink', 'Mojito', 99, 'veg', true, true),
('Lemon Mojito', 'Classic lemon refreshment', 'Mojito', 69, 'veg', true, true),
-- Lassi
('Sweet Lassi', 'Creamy yogurt drink', 'Lassi', 59, 'veg', true, true),
('Mango Lassi', 'Mango yogurt drink', 'Lassi', 79, 'veg', true, true),
('Rose Lassi', 'Rose flavored lassi', 'Lassi', 69, 'veg', true, true),
-- Shakes
('Chocolate Shake', 'Rich chocolate milkshake', 'Shakes', 99, 'veg', true, true),
('Vanilla Shake', 'Classic vanilla shake', 'Shakes', 89, 'veg', true, true),
('Oreo Shake', 'Oreo cookie shake', 'Shakes', 119, 'veg', true, true),
-- Chinese
('Fried Rice', 'Wok-tossed rice with veggies', 'Chinese', 149, 'veg', true, true),
('Chicken Fried Rice', 'Chicken fried rice', 'Chinese', 179, 'nonveg', false, true),
('Manchurian', 'Crispy manchurian balls', 'Chinese', 159, 'veg', true, true),
-- Fast Food
('French Fries', 'Crispy salted fries', 'Fast Food', 79, 'veg', true, true),
('Chicken Nuggets', 'Crispy chicken nuggets', 'Fast Food', 149, 'nonveg', false, true),
('Onion Rings', 'Crispy onion rings', 'Fast Food', 99, 'veg', true, true),
-- Dessert
('Chocolate Cake', 'Rich chocolate cake', 'Dessert', 199, 'veg', true, true),
('Ice Cream', 'Vanilla ice cream scoop', 'Dessert', 49, 'veg', true, true),
('Brownie', 'Fudgy chocolate brownie', 'Dessert', 129, 'veg', true, true),
-- Falooda
('Rose Falooda', 'Rose vermicelli drink', 'Falooda', 99, 'veg', true, true),
('Mango Falooda', 'Mango falooda', 'Falooda', 129, 'veg', true, true),
('Strawberry Falooda', 'Strawberry falooda', 'Falooda', 119, 'veg', true, true)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
