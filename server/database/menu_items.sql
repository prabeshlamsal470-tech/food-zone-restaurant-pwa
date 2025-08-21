-- Menu Items Table and Data for Food Zone Restaurant

-- Create menu_items table
CREATE TABLE IF NOT EXISTS menu_items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    price DECIMAL(8,2) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    image_url VARCHAR(500),
    is_available BOOLEAN DEFAULT true,
    preparation_time INTEGER DEFAULT 15, -- minutes
    is_vegetarian BOOLEAN DEFAULT false,
    is_spicy BOOLEAN DEFAULT false,
    allergens TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category);
CREATE INDEX IF NOT EXISTS idx_menu_items_available ON menu_items(is_available);

-- Insert Food Zone menu items
INSERT INTO menu_items (name, price, category, description, image_url, is_vegetarian, is_spicy) VALUES
-- Appetizers
('Chicken Momo', 180, 'Appetizers', 'Steamed chicken dumplings served with spicy tomato chutney', '/images/Momo Platter.jpg', false, false),
('Veg Momo', 150, 'Appetizers', 'Steamed vegetable dumplings with mixed vegetables', '/images/Momo Platter.jpg', true, false),
('Chicken Chhoila', 220, 'Appetizers', 'Grilled chicken with Nepali spices and herbs', '/images/chicken-chhoila.jpg', false, true),
('Pani Puri', 120, 'Appetizers', 'Crispy shells with spiced water and chutneys', '/images/pani-puri.jpg', true, true),
('Samosa Chat', 140, 'Appetizers', 'Crispy samosas with yogurt and chutneys', '/images/samosa-chat.jpg', true, false),

-- Main Course
('Chicken Thali', 350, 'Main Course', 'Complete chicken meal with rice, dal, vegetables and pickle', '/images/Chicken Thali Set for 50 people at best restaurant in Duwakot, Near Kathmandu medical college and teaching hospital at duwakot .jpg', false, false),
('Veg Thali', 280, 'Main Course', 'Complete vegetarian meal with rice, dal, vegetables and pickle', '/images/veg-thali.jpg', true, false),
('Chicken Biryani', 320, 'Main Course', 'Aromatic basmati rice with spiced chicken', '/images/chicken-biryani.jpg', false, true),
('Mutton Curry', 450, 'Main Course', 'Tender mutton cooked in traditional Nepali spices', '/images/mutton-curry.jpg', false, true),
('Dal Bhat Set', 250, 'Main Course', 'Traditional Nepali meal with rice, lentils and vegetables', '/images/dal-bhat.jpg', true, false),
('Chicken Fried Rice', 220, 'Main Course', 'Wok-fried rice with chicken and vegetables', '/images/Combo Meals.jpg', false, false),
('Veg Fried Rice', 180, 'Main Course', 'Wok-fried rice with mixed vegetables', '/images/veg-fried-rice.jpg', true, false),

-- Fast Food
('Chicken Burger', 280, 'Fast Food', 'Grilled chicken burger with fries and salad', '/images/Gourmet Burgers.jpg', false, false),
('Veg Burger', 220, 'Fast Food', 'Vegetarian burger with fries and salad', '/images/veg-burger.jpg', true, false),
('Chicken Sandwich', 200, 'Fast Food', 'Grilled chicken sandwich with vegetables', '/images/chicken-sandwich.jpg', false, false),
('Club Sandwich', 250, 'Fast Food', 'Triple layer sandwich with chicken and vegetables', '/images/club-sandwich.jpg', false, false),
('French Fries', 120, 'Fast Food', 'Crispy golden french fries', '/images/french-fries.jpg', true, false),

-- Pizza
('Margherita Pizza', 380, 'Pizza', 'Classic pizza with tomato sauce and mozzarella', '/images/Cheesy Delights.jpg', true, false),
('Chicken Pizza', 450, 'Pizza', 'Pizza topped with grilled chicken and vegetables', '/images/chicken-pizza.jpg', false, false),
('Pepperoni Pizza', 420, 'Pizza', 'Spicy pepperoni pizza with cheese', '/images/pepperoni-pizza.jpg', false, true),
('Veg Supreme Pizza', 400, 'Pizza', 'Loaded with fresh vegetables and cheese', '/images/veg-pizza.jpg', true, false),

-- Beverages
('Fresh Lime Soda', 80, 'Beverages', 'Refreshing lime soda with mint', '/images/lime-soda.jpg', true, false),
('Mango Lassi', 120, 'Beverages', 'Creamy mango yogurt drink', '/images/mango-lassi.jpg', true, false),
('Masala Tea', 50, 'Beverages', 'Traditional spiced tea', '/images/masala-tea.jpg', true, false),
('Coffee', 60, 'Beverages', 'Hot brewed coffee', '/images/coffee.jpg', true, false),
('Cold Coffee', 100, 'Beverages', 'Iced coffee with milk and sugar', '/images/cold-coffee.jpg', true, false),
('Soft Drinks', 70, 'Beverages', 'Coca Cola, Pepsi, Sprite, Fanta', '/images/soft-drinks.jpg', true, false),

-- Desserts
('Gulab Jamun', 100, 'Desserts', 'Sweet milk dumplings in sugar syrup', '/images/gulab-jamun.jpg', true, false),
('Rasgulla', 90, 'Desserts', 'Spongy cottage cheese balls in syrup', '/images/rasgulla.jpg', true, false),
('Ice Cream', 80, 'Desserts', 'Vanilla, Chocolate, Strawberry flavors', '/images/ice-cream.jpg', true, false),
('Kheer', 110, 'Desserts', 'Traditional rice pudding with nuts', '/images/kheer.jpg', true, false),

-- Snacks
('Chatpate', 60, 'Snacks', 'Spicy puffed rice snack with vegetables', '/images/chatpate.jpg', true, true),
('Sekuwa', 180, 'Snacks', 'Grilled meat skewers with spices', '/images/sekuwa.jpg', false, true),
('Pakoda', 100, 'Snacks', 'Deep fried vegetable fritters', '/images/pakoda.jpg', true, false),
('Chana Chaat', 90, 'Snacks', 'Spiced chickpea salad with chutneys', '/images/chana-chaat.jpg', true, true),

-- Specials
('Chef Special Thali', 450, 'Specials', 'Premium thali with multiple curries and specialties', '/images/chef-special.jpg', false, false),
('Newari Khaja Set', 380, 'Specials', 'Traditional Newari snack platter', '/images/newari-khaja.jpg', false, true),
('BBQ Platter', 550, 'Specials', 'Mixed grilled meats with sides', '/images/bbq-platter.jpg', false, true),
('Family Combo', 800, 'Specials', 'Complete meal for 4 people with variety of dishes', '/images/family-combo.jpg', false, false);

-- Update trigger for menu_items
CREATE TRIGGER update_menu_items_updated_at BEFORE UPDATE ON menu_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
