-- ============================================================================
-- INSERT ALL PRODUCTS FROM EXCEL
-- ============================================================================

-- First clear existing categories and products
DELETE FROM public.order_items;
DELETE FROM public.orders;
DELETE FROM public.customers;
DELETE FROM public.products;
DELETE FROM public.categories;

-- Insert categories
INSERT INTO public.categories (name, emoji) VALUES
('Burger', '🍔'),
('Pizza', '🍕'),
('Smoothies', '🥤'),
('Mojito', '🍹'),
('Lassi', '🥛'),
('Shakes', '🧋'),
('Chinese', '🥡'),
('Fast Food', '🍟'),
('Dessert', '🍰')
ON CONFLICT (name) DO NOTHING;

-- Insert all 37 products
INSERT INTO public.products (name, description, category, price, food_type, is_veg, available) VALUES
('Egg Burger', 'Soft bun with masala omelette', 'Burger', 120, 'nonveg', true, true),
('Chicken Special Burger', 'Crispy chicken patty with cheese', 'Burger', 180, 'nonveg', true, true),
('Veg Classic Burger', 'Veg patty with lettuce and mayo', 'Burger', 110, 'veg', true, true),
('Paneer Tikka Burger', 'Grilled paneer tikka in bun', 'Burger', 150, 'veg', true, true),
('Double Chicken Burger', 'Double crispy chicken patties', 'Burger', 220, 'nonveg', true, true),
('Margherita Pizza', 'Classic cheese pizza with tomato base', 'Pizza', 200, 'veg', true, true),
('Farmhouse Pizza', 'Veggies loaded pizza with fresh toppings', 'Pizza', 260, 'veg', true, true),
('Paneer Tikka Pizza', 'Paneer tikka topping on cheesy pizza', 'Pizza', 280, 'veg', true, true),
('Chicken Pepperoni Pizza', 'Pepperoni chicken pizza with extra cheese', 'Pizza', 320, 'nonveg', true, true),
('BBQ Chicken Pizza', 'BBQ chicken topping with smokey flavor', 'Pizza', 340, 'nonveg', true, true),
('Black Current Smoothie', 'Fresh black currant blended smoothie', 'Smoothies', 140, 'veg', true, true),
('Strawberry Smoothie', 'Sweet strawberry creamy smoothie', 'Smoothies', 130, 'veg', true, true),
('Mango Smoothie', 'Seasonal mango smoothie with real mango', 'Smoothies', 150, 'veg', true, true),
('Chocolate Smoothie', 'Chocolate milk smoothie rich and creamy', 'Smoothies', 150, 'veg', true, true),
('Mango Mojito', 'Fresh mango mint mojito with lime', 'Mojito', 120, 'veg', true, true),
('Classic Mint Mojito', 'Mint lemon mojito refreshing drink', 'Mojito', 100, 'veg', true, true),
('Blue Lagoon Mojito', 'Blue citrus mojito drink with mint', 'Mojito', 130, 'veg', true, true),
('Sweet Lassi', 'Traditional sweet yogurt drink creamy', 'Lassi', 80, 'veg', true, true),
('Salted Lassi', 'Salted refreshing yogurt drink unique taste', 'Lassi', 80, 'veg', true, true),
('Dry Fruit Lassi', 'Lassi with mixed dry fruits and nuts', 'Lassi', 120, 'veg', true, true),
('Chocolate Milkshake', 'Chocolate thick milkshake rich and creamy', 'Shakes', 130, 'veg', true, true),
('Oreo Milkshake', 'Oreo biscuit shake with cookies', 'Shakes', 150, 'veg', true, true),
('KitKat Shake', 'KitKat blended shake chocolate lovers', 'Shakes', 160, 'veg', true, true),
('Butterscotch Shake', 'Butterscotch flavor milkshake sweet', 'Shakes', 140, 'veg', true, true),
('Veg Noodles', 'Stir fried veg noodles with sauces', 'Chinese', 150, 'veg', true, true),
('Chicken Noodles', 'Chicken stir fried noodles spicy', 'Chinese', 180, 'nonveg', true, true),
('Veg Fried Rice', 'Veg fried rice with aromatic spices', 'Chinese', 160, 'veg', true, true),
('Chicken Fried Rice', 'Chicken fried rice with eggs and veggies', 'Chinese', 190, 'nonveg', true, true),
('Paneer Chilli', 'Spicy paneer chilli dry or gravy', 'Chinese', 200, 'veg', true, true),
('Chicken Chilli', 'Spicy chicken chilli with peppers', 'Chinese', 220, 'nonveg', true, true),
('French Fries', 'Crispy salted fries golden brown', 'Fast Food', 90, 'veg', true, true),
('Peri Peri Fries', 'Spicy peri peri fries hot and tangy', 'Fast Food', 110, 'veg', true, true),
('Cheese Fries', 'Fries topped with melted cheese', 'Fast Food', 130, 'veg', true, true),
('Chicken Nuggets', 'Crispy chicken nuggets juicy inside', 'Fast Food', 170, 'nonveg', true, true),
('Chocolate Brownie', 'Warm chocolate brownie fudgy and rich', 'Dessert', 120, 'veg', true, true),
('Ice Cream Sundae', 'Vanilla ice cream with chocolate syrup', 'Dessert', 140, 'veg', true, true),
('Choco Lava Cake', 'Chocolate lava cake with molten center', 'Dessert', 150, 'veg', true, true);

-- Verify
SELECT category, COUNT(*) as count FROM public.products GROUP BY category ORDER BY category;
SELECT COUNT(*) as total FROM public.products;
