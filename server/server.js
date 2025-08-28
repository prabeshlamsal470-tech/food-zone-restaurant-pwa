const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const { Customer, Order, TableSession, TablePayment } = require('./database/models');
const CacheManager = require('./utils/cacheManager');
const { pool, query } = require('./database/config');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? ["https://foodzone.com.np", "https://www.foodzone.com.np", "https://foodzone.com", "https://www.foodzone.com", "https://foodzoneduwakot.netlify.app", "https://astounding-malabi-c1d59c.netlify.app", "https://food-zone-restaurant.windsurf.build", "https://foodzone-updated.windsurf.build", "https://main--astounding-malabi-c1d59c.netlify.app"]
      : ["http://localhost:3000", "http://127.0.0.1:3000"],
    methods: ["GET", "POST"]
  }
});

// Middleware
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ["https://foodzone.com.np", "https://www.foodzone.com.np", "https://foodzone.com", "https://www.foodzone.com", "https://foodzoneduwakot.netlify.app", "https://astounding-malabi-c1d59c.netlify.app", "https://food-zone-restaurant.windsurf.build", "https://foodzone-updated.windsurf.build", "https://main--astounding-malabi-c1d59c.netlify.app"]
    : ["http://localhost:3000", "http://127.0.0.1:3000"],
  credentials: true
};
app.use(cors(corsOptions));
app.use(express.json());

// Serve static files including images
app.use(express.static(path.join(__dirname, 'public')));

// In-memory storage for table sessions (temporary data)
const tableSessions = new Map(); // tableId -> { timestamp, cartItems }

// Initialize Active Cache Manager
let cacheManager;

// Initialize restaurant settings from database
let restaurantSettings = {
  tableCount: 25 // Default, will be loaded from database
};

// Initialize menu_items table
async function initializeMenuTable() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS menu_items (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        price DECIMAL(8,2) NOT NULL,
        category VARCHAR(100) NOT NULL,
        description TEXT,
        image_url VARCHAR(500),
        is_available BOOLEAN DEFAULT true,
        preparation_time INTEGER DEFAULT 15,
        is_vegetarian BOOLEAN DEFAULT false,
        is_spicy BOOLEAN DEFAULT false,
        allergens TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Menu items table initialized');
  } catch (error) {
    console.error('❌ Error initializing menu table:', error);
  }
}

// Load settings from database on startup
async function loadSettings() {
  try {
    await initializeMenuTable();
    const result = await query('SELECT setting_key, setting_value FROM restaurant_settings');
    result.rows.forEach(row => {
      if (row.setting_key === 'table_count') {
        restaurantSettings.tableCount = parseInt(row.setting_value);
      }
    });
    console.log('✅ Restaurant settings loaded:', restaurantSettings);
  } catch (error) {
    console.error('❌ Error loading settings:', error);
  }
}

// Initialize database with sample data if empty
async function initializeDatabaseWithSampleData() {
  try {
    // Check if database has any orders
    const orderCount = await query('SELECT COUNT(*) as count FROM orders');
    if (parseInt(orderCount.rows[0].count) === 0) {
      console.log('🔄 Database is empty, populating with sample data...');
      
      // Insert sample data directly
      const sampleQueries = [
        // Insert customers
        `INSERT INTO customers (name, phone, email, total_orders, total_spent) VALUES
         ('John Doe', '9841234567', 'john@example.com', 3, 850.00),
         ('Jane Smith', '9847654321', 'jane@example.com', 2, 560.00),
         ('Ram Sharma', '9851111111', 'ram@example.com', 1, 320.00),
         ('Sita Patel', '9862222222', 'sita@example.com', 4, 1200.00),
         ('Mike Johnson', '9873333333', 'mike@example.com', 1, 180.00)`,
        
        // Insert orders
        `INSERT INTO orders (order_number, order_type, customer_id, customer_name, customer_phone, delivery_address, table_id, subtotal, total, status, payment_method, notes) VALUES
         ('FZ-2024-001', 'delivery', 2, 'Jane Smith', '9847654321', 'Duwakot, Bhaktapur', NULL, 280.00, 330.00, 'completed', 'digital', 'Extra spicy'),
         ('FZ-2024-002', 'dine-in', 1, 'John Doe', '9841234567', NULL, 5, 360.00, 360.00, 'completed', 'cash', NULL),
         ('FZ-2024-003', 'delivery', 4, 'Sita Patel', '9862222222', 'Madhyapur Thimi', NULL, 450.00, 500.00, 'preparing', 'digital', 'Call before delivery'),
         ('FZ-2024-004', 'dine-in', 3, 'Ram Sharma', '9851111111', NULL, 12, 320.00, 320.00, 'ready', NULL, 'Birthday special'),
         ('FZ-2024-005', 'delivery', 5, 'Mike Johnson', '9873333333', 'Bhaktapur Durbar Square', NULL, 180.00, 230.00, 'pending', 'card', 'Office delivery')`,
        
        // Insert order items
        `INSERT INTO order_items (order_id, menu_item_id, menu_item_name, menu_item_category, price, quantity, subtotal) VALUES
         (1, 46, 'Chicken MoMo (Steam)', 'MoMo', 140.00, 2, 280.00),
         (2, 34, 'Veg MoMo (Steam)', 'MoMo', 120.00, 1, 120.00),
         (2, 75, '9 Inch Chicken Pizza', 'Pizza', 450.00, 1, 450.00),
         (3, 89, 'Veg Biryani', 'Rice & Biryani', 280.00, 1, 280.00),
         (4, 90, 'Chicken Biryani', 'Rice & Biryani', 320.00, 1, 320.00),
         (5, 24, 'Chicken Sandwich', 'Sandwiches & Burgers', 180.00, 1, 180.00)`
      ];
      
      for (const sampleQuery of sampleQueries) {
        await query(sampleQuery);
      }
      console.log('✅ Sample data populated successfully');
    }
  } catch (error) {
    console.error('❌ Error initializing sample data:', error);
  }
}

// Initialize settings and sample data on startup
loadSettings();
setTimeout(() => {
  initializeDatabaseWithSampleData();
}, 3000); // Wait 3 seconds for database connection to stabilize

// Geo Tage Food Zone Menu Items
const menuItems = [
  // Combo Meals
  { id: 1, name: "Veg Combo", price: 599, category: "Combo Meals", description: "Veg Burger, Tofu Stick, Cheese Fries, Cheese Corndog + Free Coke/Bubble Tea" },
  { id: 2, name: "Non-Veg Combo", price: 599, category: "Combo Meals", description: "Chicken Burger, Chicken Sausage, Cheese Fries, Corndog + Free Coke/Bubble Tea" },
  
  // Nanglo Khaja Set
  { id: 3, name: "Non-Veg Nanglo Khaja Set", price: 1999, category: "Nanglo Khaja Set", description: "Chicken Biryani, Chicken Momo, Chicken Sausage, Veg Chowmein, Mustang Aalu, Wai Wai Sadeko, Hot Wings, Drumstick, Chicken Burger, Chicken Pizza + 250ml Coke Free" },
  { id: 4, name: "Veg Nanglo Khaja Set", price: 1499, category: "Nanglo Khaja Set", description: "Veg Biryani, Veg Momo, Tofu Stick, Mustang Aalu, Veg Burger, Cheese Pizza, Paneer Pakoda, Wai Wai Sadeko, Potato Cheese Ball + 250ml Coke Free" },
  
  // Khaja & Khana Sets
  { id: 5, name: "Veg Khaja Set", price: 250, category: "Khaja & Khana Sets" },
  { id: 6, name: "Non-Veg Khaja Set", price: 300, category: "Khaja & Khana Sets" },
  { id: 7, name: "Veg Khana Set", price: 250, category: "Khaja & Khana Sets" },
  { id: 8, name: "Non-Veg Khana Set", price: 300, category: "Khaja & Khana Sets" },
  { id: 9, name: "Food Zone Special", price: 400, category: "Khaja & Khana Sets" },
  
  // Breakfast Menu
  { id: 10, name: "Bread Omelette", price: 150, category: "Breakfast" },
  { id: 11, name: "Bread Jam", price: 100, category: "Breakfast" },
  { id: 12, name: "French Toast", price: 150, category: "Breakfast" },
  { id: 13, name: "Butter Toast", price: 100, category: "Breakfast" },
  { id: 14, name: "Honey Butter Toast", price: 150, category: "Breakfast" },
  { id: 15, name: "Cheese Toast", price: 150, category: "Breakfast" },
  { id: 16, name: "Cheese Tomato Toast", price: 180, category: "Breakfast" },
  { id: 17, name: "Aalu Paratha", price: 140, category: "Breakfast", description: "With Dahi & Mix Pickle" },
  { id: 18, name: "Pancake", price: 150, category: "Breakfast" },
  { id: 19, name: "Bread Roll", price: 150, category: "Breakfast" },
  { id: 20, name: "Regular Breakfast", price: 250, category: "Breakfast", description: "Veg/Chicken Sandwich, Masala Tea, Omelette" },
  { id: 21, name: "Food Zone Special Breakfast", price: 350, category: "Breakfast", description: "Cheese Tomato Toast, Omelette, Salad, Milk Masala Tea, Hash Brown Potatoes" },
  
  // Sandwiches & Burgers
  { id: 22, name: "Veg Sandwich", price: 180, category: "Sandwiches & Burgers" },
  { id: 23, name: "Egg Sandwich", price: 180, category: "Sandwiches & Burgers" },
  { id: 24, name: "Chicken Sandwich", price: 180, category: "Sandwiches & Burgers" },
  { id: 25, name: "Veg Cheese Sandwich", price: 250, category: "Sandwiches & Burgers" },
  { id: 26, name: "Chicken Cheese Sandwich", price: 250, category: "Sandwiches & Burgers" },
  { id: 27, name: "Club Sandwich", price: 300, category: "Sandwiches & Burgers" },
  { id: 28, name: "Veg Burger", price: 180, category: "Sandwiches & Burgers" },
  { id: 29, name: "Chicken Burger", price: 180, category: "Sandwiches & Burgers" },
  { id: 30, name: "Veg Cheese Burger", price: 250, category: "Sandwiches & Burgers" },
  { id: 31, name: "Chicken Cheese Burger", price: 250, category: "Sandwiches & Burgers" },
  
  // Fries
  { id: 32, name: "French Fries", price: 160, category: "Fries" },
  { id: 33, name: "Fries Chilly", price: 220, category: "Fries" },
  
  // MoMo
  { id: 34, name: "Veg MoMo (Steam)", price: 120, category: "MoMo" },
  { id: 35, name: "Veg MoMo (Fried)", price: 170, category: "MoMo" },
  { id: 36, name: "Veg MoMo (Jhol)", price: 170, category: "MoMo" },
  { id: 37, name: "Veg MoMo (Chilly)", price: 200, category: "MoMo" },
  { id: 38, name: "Veg MoMo (Sadeko)", price: 200, category: "MoMo" },
  { id: 39, name: "Veg MoMo (Kothey)", price: 200, category: "MoMo" },
  { id: 40, name: "Buff MoMo (Steam)", price: 120, category: "MoMo" },
  { id: 41, name: "Buff MoMo (Fried)", price: 170, category: "MoMo" },
  { id: 42, name: "Buff MoMo (Jhol)", price: 170, category: "MoMo" },
  { id: 43, name: "Buff MoMo (Chilly)", price: 200, category: "MoMo" },
  { id: 44, name: "Buff MoMo (Sadeko)", price: 200, category: "MoMo" },
  { id: 45, name: "Buff MoMo (Kothey)", price: 200, category: "MoMo" },
  { id: 46, name: "Chicken MoMo (Steam)", price: 140, category: "MoMo" },
  { id: 47, name: "Chicken MoMo (Fried)", price: 190, category: "MoMo" },
  { id: 48, name: "Chicken MoMo (Jhol)", price: 190, category: "MoMo" },
  { id: 49, name: "Chicken MoMo (Chilly)", price: 220, category: "MoMo" },
  { id: 50, name: "Chicken MoMo (Sadeko)", price: 220, category: "MoMo" },
  { id: 51, name: "Chicken MoMo (Kothey)", price: 220, category: "MoMo" },
  
  // Chowmein
  { id: 52, name: "Veg Chowmein (Half)", price: 70, category: "Chowmein" },
  { id: 53, name: "Veg Chowmein (Full)", price: 110, category: "Chowmein" },
  { id: 54, name: "Buff Chowmein (Half)", price: 90, category: "Chowmein" },
  { id: 55, name: "Buff Chowmein (Full)", price: 150, category: "Chowmein" },
  { id: 56, name: "Chicken Chowmein (Half)", price: 90, category: "Chowmein" },
  { id: 57, name: "Chicken Chowmein (Full)", price: 150, category: "Chowmein" },
  { id: 58, name: "Egg Chowmein (Half)", price: 90, category: "Chowmein" },
  { id: 59, name: "Egg Chowmein (Full)", price: 150, category: "Chowmein" },
  { id: 60, name: "Mix Chowmein", price: 200, category: "Chowmein" },
  
  // Corn Dog & Hot Dog
  { id: 61, name: "Sausage Corn Dog", price: 130, category: "Corn Dog & Hot Dog" },
  { id: 62, name: "Cheese Corn Dog", price: 180, category: "Corn Dog & Hot Dog" },
  { id: 63, name: "Hot Dog (Chicken)", price: 190, category: "Corn Dog & Hot Dog" },
  
  // Thukpa
  { id: 64, name: "Veg Thukpa (Half)", price: 100, category: "Thukpa" },
  { id: 65, name: "Veg Thukpa (Full)", price: 150, category: "Thukpa" },
  { id: 66, name: "Egg Thukpa (Half)", price: 140, category: "Thukpa" },
  { id: 67, name: "Egg Thukpa (Full)", price: 180, category: "Thukpa" },
  { id: 68, name: "Chicken Thukpa (Half)", price: 140, category: "Thukpa" },
  { id: 69, name: "Chicken Thukpa (Full)", price: 180, category: "Thukpa" },
  { id: 70, name: "Mixed Thukpa", price: 200, category: "Thukpa" },
  
  // Pizza
  { id: 71, name: "9 Inch Cheese Pizza", price: 400, category: "Pizza" },
  { id: 72, name: "12 Inch Cheese Pizza", price: 400, category: "Pizza" },
  { id: 73, name: "9 Inch Veg Pizza", price: 450, category: "Pizza" },
  { id: 74, name: "12 Inch Veg Pizza", price: 450, category: "Pizza" },
  { id: 75, name: "9 Inch Chicken Pizza", price: 450, category: "Pizza" },
  { id: 76, name: "12 Inch Chicken Pizza", price: 450, category: "Pizza" },
  { id: 77, name: "9 Inch Mixed Pizza", price: 500, category: "Pizza" },
  { id: 78, name: "12 Inch Mixed Pizza", price: 500, category: "Pizza" },
  { id: 79, name: "Extra Cheese", price: 100, category: "Pizza" },
  
  // Rice & Biryani
  { id: 80, name: "Veg Fry Rice (Half)", price: 100, category: "Rice & Biryani" },
  { id: 81, name: "Veg Fry Rice (Full)", price: 150, category: "Rice & Biryani" },
  { id: 82, name: "Egg Fry Rice (Half)", price: 120, category: "Rice & Biryani" },
  { id: 83, name: "Egg Fry Rice (Full)", price: 160, category: "Rice & Biryani" },
  { id: 84, name: "Buff Fry Rice (Half)", price: 120, category: "Rice & Biryani" },
  { id: 85, name: "Buff Fry Rice (Full)", price: 180, category: "Rice & Biryani" },
  { id: 86, name: "Chicken Fry Rice (Half)", price: 120, category: "Rice & Biryani" },
  { id: 87, name: "Chicken Fry Rice (Full)", price: 180, category: "Rice & Biryani" },
  { id: 88, name: "Mixed Fry Rice", price: 200, category: "Rice & Biryani" },
  { id: 89, name: "Veg Biryani", price: 280, category: "Rice & Biryani" },
  { id: 90, name: "Chicken Biryani", price: 320, category: "Rice & Biryani" },
  { id: 91, name: "Egg Biryani", price: 300, category: "Rice & Biryani" },
  
  // Curries
  { id: 92, name: "Aalu Matar", price: 130, category: "Curries" },
  { id: 93, name: "Mix Veg", price: 130, category: "Curries" },
  { id: 94, name: "Mushroom Curry", price: 180, category: "Curries" },
  { id: 95, name: "Matar Paneer", price: 250, category: "Curries" },
  { id: 96, name: "Paneer Butter Masala", price: 300, category: "Curries" },
  { id: 97, name: "Chicken Curry", price: 180, category: "Curries" },
  { id: 98, name: "Chicken Butter Masala", price: 250, category: "Curries" },
  { id: 99, name: "Chicken Curry Rice", price: 250, category: "Curries" },
  { id: 100, name: "Paneer Curry Rice", price: 300, category: "Curries" },
  { id: 101, name: "Veg Curry Rice", price: 200, category: "Curries" },
  
  // Peri Peri & Chicken Specials
  { id: 102, name: "Peri Peri Chicken", price: 350, category: "Peri Peri & Chicken Specials" },
  { id: 103, name: "Chicken '65'", price: 300, category: "Peri Peri & Chicken Specials" },
  { id: 104, name: "Chicken Popcorn", price: 250, category: "Peri Peri & Chicken Specials" },
  { id: 105, name: "Food Zone Special Dragon Chicken", price: 300, category: "Peri Peri & Chicken Specials" },
  
  // Fish Specials
  { id: 106, name: "Fish Finger (8 pcs)", price: 250, category: "Fish Specials" },
  { id: 107, name: "Fish & Chips", price: 350, category: "Fish Specials" },
  
  // Paneer & Veg Snacks
  { id: 108, name: "Paneer Pakoda", price: 300, category: "Paneer & Veg Snacks" },
  { id: 109, name: "Paneer Chilly", price: 300, category: "Paneer & Veg Snacks" },
  { id: 110, name: "Grill Potatoes", price: 150, category: "Paneer & Veg Snacks" },
  
  // Chopsuey
  { id: 111, name: "Veg Chopsuey", price: 300, category: "Chopsuey" },
  { id: 112, name: "Non-Veg Chopsuey", price: 320, category: "Chopsuey" },
  
  // Pasta & Extra Choice Items
  { id: 113, name: "Spaghetti Carbonara", price: 350, category: "Pasta" },
  { id: 114, name: "Spaghetti Bolognese", price: 300, category: "Pasta" },
  { id: 115, name: "Pesto Penne", price: 300, category: "Pasta" },
  { id: 116, name: "Pasta", price: 150, category: "Pasta" },
  
  // Food Zone Specials
  { id: 117, name: "Chicken Kathi Roll", price: 180, category: "Food Zone Specials" },
  { id: 118, name: "Paneer Kathi Roll", price: 200, category: "Food Zone Specials" },
  { id: 119, name: "Food Zone Special Chicken Burger [KFC]", price: 250, category: "Food Zone Specials" },
  { id: 120, name: "Food Zone Special Chicken [KFC] (4 pcs)", price: 300, category: "Food Zone Specials" },
  { id: 121, name: "Veg Manchurian with Rice", price: 250, category: "Food Zone Specials" },
  { id: 122, name: "Chicken Manchurian with Rice", price: 300, category: "Food Zone Specials" },
  { id: 123, name: "Veg MoMo Platter", price: 250, category: "Food Zone Specials" },
  { id: 124, name: "Buff MoMo Platter", price: 300, category: "Food Zone Specials" },
  { id: 125, name: "Chicken MoMo Platter", price: 300, category: "Food Zone Specials" },
  { id: 126, name: "Food Zone Special Noodles", price: 250, category: "Food Zone Specials" },
  { id: 127, name: "Meat Ball", price: 200, category: "Food Zone Specials" },
  
  // Hukka
  { id: 128, name: "Hukka", price: 400, category: "Hukka" },
  
  // Soups
  { id: 129, name: "Mushroom Soup", price: 150, category: "Soups" },
  { id: 130, name: "Hot & Sour Soup", price: 150, category: "Soups" },
  { id: 131, name: "Clear Soup", price: 100, category: "Soups" },
  { id: 132, name: "Chicken Soup", price: 150, category: "Soups" },
  
  // Hot Beverages
  { id: 133, name: "Black Tea", price: 20, category: "Hot Beverages" },
  { id: 134, name: "Ginger Tea", price: 25, category: "Hot Beverages" },
  { id: 135, name: "Black Masala", price: 30, category: "Hot Beverages" },
  { id: 136, name: "Marich Tea", price: 30, category: "Hot Beverages" },
  { id: 137, name: "Lemon Tea", price: 30, category: "Hot Beverages" },
  { id: 138, name: "Mint Tea", price: 30, category: "Hot Beverages" },
  { id: 139, name: "Milk Tea", price: 30, category: "Hot Beverages" },
  { id: 140, name: "Milk Masala Tea", price: 40, category: "Hot Beverages" },
  { id: 141, name: "Hot Lemon", price: 50, category: "Hot Beverages" },
  { id: 142, name: "Ginger Lemon Honey", price: 130, category: "Hot Beverages" },
  { id: 143, name: "Hot Chocolate", price: 190, category: "Hot Beverages" },
  
  // Cold Beverages
  { id: 144, name: "Ju Ju Dhau", price: 70, category: "Cold Beverages" },
  { id: 145, name: "Lassi Plain", price: 100, category: "Cold Beverages" },
  { id: 146, name: "Lassi Sweet", price: 120, category: "Cold Beverages" },
  { id: 147, name: "Lassi Banana", price: 130, category: "Cold Beverages" },
  { id: 148, name: "Lemonade", price: 100, category: "Cold Beverages" },
  { id: 149, name: "Cold Coffee", price: 190, category: "Cold Beverages" },
  { id: 150, name: "Oreo Milkshake", price: 190, category: "Cold Beverages" },
  { id: 151, name: "Chocolate Milkshake", price: 190, category: "Cold Beverages" },
  { id: 152, name: "Virgin Mojito", price: 90, category: "Cold Beverages" },
  { id: 153, name: "Black Coffee", price: 80, category: "Cold Beverages" },
  { id: 154, name: "Milk Coffee", price: 120, category: "Cold Beverages" },
  { id: 155, name: "Coke", price: 70, category: "Cold Beverages" },
  { id: 156, name: "Fanta", price: 70, category: "Cold Beverages" },
  { id: 157, name: "Sprite", price: 70, category: "Cold Beverages" }
];

// Clean expired table sessions (older than 5 minutes for active clearing)
const cleanExpiredSessions = () => {
  const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
  let clearedCount = 0;
  
  for (const [tableId, session] of tableSessions.entries()) {
    if (session.timestamp < fiveMinutesAgo) {
      tableSessions.delete(tableId);
      clearedCount++;
      console.log(`🧹 Auto-cleared expired table cache: Table ${tableId}`);
      
      // Emit cache cleared event to all connected clients
      io.emit('tableCacheCleared', { tableId });
    }
  }
  
  if (clearedCount > 0) {
    console.log(`🕒 ACTIVE CACHE CLEAR: Cleaned ${clearedCount} expired table sessions (older than 5 minutes)`);
  }
};

// Run cleanup every 1 minute for active cache clearing
setInterval(cleanExpiredSessions, 1 * 60 * 1000);

// Force cache clear on server startup
console.log('🚀 Starting active table cache clearing system...');
cleanExpiredSessions();

// Initialize Active Cache Manager after Socket.IO is ready
setTimeout(() => {
  cacheManager = new CacheManager(io);
  console.log('✅ ACTIVE CACHE MANAGER INITIALIZED');
}, 1000);

// Initialize database settings on startup
loadSettings();

// API Routes

// Clear table sessions endpoint for cache cleanup
app.post('/api/clear-table-sessions', (req, res) => {
  try {
    const clearedSessions = tableSessions.size;
    tableSessions.clear();
    
    // Also clear active cache manager if available
    let cacheCleared = 0;
    if (cacheManager) {
      cacheCleared = cacheManager.clearAll();
    }
    
    console.log(`🧹 ACTIVE CLEAR: ${clearedSessions} table sessions + ${cacheCleared} cache entries at ${new Date().toLocaleString()}`);
    
    res.json({
      success: true,
      message: `ACTIVE CLEAR: Cleared ${clearedSessions} table sessions + ${cacheCleared} cache entries`,
      clearedCount: clearedSessions,
      cacheCleared,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error clearing table sessions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear table sessions',
      error: error.message
    });
  }
});

// Get cache statistics endpoint
app.get('/api/cache/stats', (req, res) => {
  try {
    const stats = {
      tableSessions: tableSessions.size,
      cacheManager: cacheManager ? cacheManager.getStats() : null,
      timestamp: new Date().toISOString()
    };
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Force cache cleanup endpoint
app.post('/api/cache/force-cleanup', (req, res) => {
  try {
    let cleaned = 0;
    if (cacheManager) {
      cleaned = cacheManager.forceCleanup();
    }
    
    console.log(`⚡ FORCE CLEANUP: ${cleaned} cache entries removed`);
    res.json({
      success: true,
      message: `Force cleanup completed: ${cleaned} entries removed`,
      cleaned
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get menu items from database
app.get('/api/menu', async (req, res) => {
  try {
    const result = await query(`
      SELECT id, name, price, category, description, image_url, is_available, 
             preparation_time, is_vegetarian, is_spicy, allergens
      FROM menu_items 
      ORDER BY category, name
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Error fetching menu:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch menu items' 
    });
  }
});

// Get single menu item
app.get('/api/menu/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(`
      SELECT id, name, price, category, description, image_url, is_available, 
             preparation_time, is_vegetarian, is_spicy, allergens
      FROM menu_items 
      WHERE id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Error fetching menu item:', error);
    res.status(500).json({ error: 'Failed to fetch menu item' });
  }
});

// Create new menu item
app.post('/api/menu', async (req, res) => {
  try {
    const { name, price, category, description, image_url, is_available = true, preparation_time, is_vegetarian = false, is_spicy = false, allergens } = req.body;
    
    if (!name || !price || !category) {
      return res.status(400).json({ error: 'Name, price, and category are required' });
    }
    
    const result = await query(`
      INSERT INTO menu_items (name, price, category, description, image_url, is_available, preparation_time, is_vegetarian, is_spicy, allergens)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [name, price, category, description, image_url, is_available, preparation_time, is_vegetarian, is_spicy, allergens]);
    
    res.status(201).json({ success: true, item: result.rows[0] });
  } catch (error) {
    console.error('❌ Error creating menu item:', error);
    res.status(500).json({ error: 'Failed to create menu item' });
  }
});

// Update menu item
app.put('/api/menu/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, category, description, image_url, is_available, preparation_time, is_vegetarian, is_spicy, allergens } = req.body;
    
    const result = await query(`
      UPDATE menu_items 
      SET name = $1, price = $2, category = $3, description = $4, image_url = $5, 
          is_available = $6, preparation_time = $7, is_vegetarian = $8, is_spicy = $9, allergens = $10,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $11
      RETURNING *
    `, [name, price, category, description, image_url, is_available, preparation_time, is_vegetarian, is_spicy, allergens, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
    
    res.json({ success: true, item: result.rows[0] });
  } catch (error) {
    console.error('❌ Error updating menu item:', error);
    res.status(500).json({ error: 'Failed to update menu item' });
  }
});

// Delete menu item
app.delete('/api/menu/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await query(`
      DELETE FROM menu_items 
      WHERE id = $1
      RETURNING *
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
    
    res.json({ success: true, message: 'Menu item deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting menu item:', error);
    res.status(500).json({ error: 'Failed to delete menu item' });
  }
});

// Toggle menu item availability
app.patch('/api/menu/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await query(`
      UPDATE menu_items 
      SET is_available = NOT is_available, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
    
    res.json({ success: true, item: result.rows[0] });
  } catch (error) {
    console.error('❌ Error toggling menu item availability:', error);
    res.status(500).json({ error: 'Failed to toggle menu item availability' });
  }
});

app.post('/api/order', async (req, res) => {
  try {
    const { tableId, customerName, phone, address, deliveryNotes, coordinates, items, orderType, totalAmount, deliveryFee = 0 } = req.body;
    
    const isDelivery = tableId === 'Delivery' || orderType === 'delivery';
    const finalTableId = !isDelivery && tableId ? tableId : null;
    
    console.log('🔍 Order submission debug:', { 
      tableId, 
      tableIdType: typeof tableId,
      orderType, 
      isDelivery,
      finalTableId,
      finalTableIdType: typeof finalTableId
    });
    
    if (!customerName || !phone || !items || items.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Calculate order details
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const total = subtotal + deliveryFee;

    // Find or create customer
    const customer = await Customer.findOrCreate({
      name: customerName,
      phone: phone
    });

    // Calculate delivery distance if coordinates provided
    let deliveryDistance = 0;
    if (isDelivery && coordinates) {
      const restaurantLat = parseFloat(restaurantSettings.restaurant_latitude || 27.6710);
      const restaurantLng = parseFloat(restaurantSettings.restaurant_longitude || 85.4298);
      deliveryDistance = calculateDistance(restaurantLat, restaurantLng, coordinates.latitude, coordinates.longitude);
    }

    // Create order data
    const orderData = {
      orderType: isDelivery ? 'delivery' : 'dine-in',
      customerId: customer.id,
      customerName,
      customerPhone: phone,
      deliveryAddress: isDelivery ? address : null,
      deliveryLatitude: isDelivery && coordinates ? coordinates.latitude : null,
      deliveryLongitude: isDelivery && coordinates ? coordinates.longitude : null,
      deliveryLandmark: isDelivery ? coordinates?.landmark : null,
      deliveryDistance: isDelivery ? deliveryDistance : null,
      deliveryFee: isDelivery ? deliveryFee : 0,
      tableId: finalTableId,
      subtotal,
      discount: 0,
      total,
      paymentMethod: 'cash',
      notes: deliveryNotes,
      items
    };

    // Create order in database
    const order = await Order.create(orderData);
    
    // Clear table session after order (but not for delivery orders)
    if (!isDelivery) {
      tableSessions.delete(tableId);
    }

    // Emit new order to all connected clients
    io.emit('newOrder', order);
    
    console.log('✅ New order created:', order.order_number);
    res.json({ success: true, order });
    
  } catch (error) {
    console.error('❌ Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order', details: error.message });
  }
});

// Helper function to calculate distance between two points
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in kilometers
}

app.get('/api/orders', async (req, res) => {
  try {
    const { status, orderType, tableId } = req.query;
    const filters = {};
    
    if (status) filters.status = status;
    if (orderType) filters.orderType = orderType;
    if (tableId) filters.tableId = tableId;
    
    console.log('📊 Fetching orders with filters:', filters);
    const orders = await Order.findAll(filters);
    console.log(`📋 Found ${orders.length} orders`);
    console.log('📋 Order types:', orders.map(o => o.order_type));
    
    res.json(orders);
  } catch (error) {
    console.error('❌ Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders', details: error.message });
  }
});

app.get('/api/settings', async (req, res) => {
  try {
    const settings = await Settings.getAll();
    res.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings', details: error.message });
  }
});

app.get('/api/database/summary', async (req, res) => {
  try {
    // Simple summary for in-memory system
    const summary = {
      customers: 0, // In-memory system doesn't persist customers
      totalOrders: 0, // Will be counted from current orders
      orderItems: 0,
      addresses: 0,
      completedOrders: 0,
      activeOrders: tableSessions.size
    };
    
    console.log('📊 Database summary:', summary);
    res.json(summary);
  } catch (error) {
    console.error('Error getting database summary:', error);
    res.status(500).json({ error: 'Failed to get database summary', details: error.message });
  }
});

app.post('/api/database/clear-all', async (req, res) => {
  try {
    console.log('🧹 Database cleanup requested via API');
    
    // Clear database tables
    await query('DELETE FROM order_items');
    const ordersResult = await query('DELETE FROM orders RETURNING id');
    const customersResult = await query('DELETE FROM customers RETURNING id');
    await query('DELETE FROM customer_addresses');
    
    // Clear in-memory table sessions
    const sessionCount = tableSessions.size;
    tableSessions.clear();
    
    const ordersCleared = ordersResult.rowCount || 0;
    const customersCleared = customersResult.rowCount || 0;
    
    console.log(`🗑️ Cleared ${ordersCleared} orders, ${customersCleared} customers, ${sessionCount} table sessions`);
    
    // Emit cleanup event to all connected clients
    io.emit('databaseCleared', {
      customers: customersCleared,
      orders: ordersCleared,
      orderItems: ordersCleared, // Assume same count
      addresses: 0,
      tableSessions: sessionCount,
      message: 'All data cleared successfully'
    });
    
    const result = {
      success: true,
      customers: customersCleared,
      orders: ordersCleared,
      orderItems: ordersCleared,
      addresses: 0,
      tableSessions: sessionCount,
      message: 'All data cleared successfully'
    };
    
    console.log('✅ Simple cleanup completed:', result);
    res.json(result);
    
  } catch (error) {
    console.error('❌ Data cleanup failed:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to clear data', 
      details: error.message 
    });
  }
});

// Get order history
app.get('/api/order-history', async (req, res) => {
  try {
    // First get all orders
    const result = await query(`
      SELECT * FROM orders 
      WHERE status = 'completed'
      ORDER BY created_at DESC
      LIMIT 100
    `);
    
    console.log(`📊 Found ${result.rows.length} completed orders`);
    
    // Get items for each order
    const ordersWithItems = [];
    for (const order of result.rows) {
      try {
        const itemsResult = await query(
          'SELECT item_name as name, quantity, price, is_custom as "isCustom" FROM order_items WHERE order_id = $1',
          [order.id]
        );
        
        ordersWithItems.push({
          ...order,
          items: itemsResult.rows || []
        });
      } catch (itemError) {
        console.error(`Error fetching items for order ${order.id}:`, itemError);
        ordersWithItems.push({
          ...order,
          items: []
        });
      }
    }
    
    res.json(ordersWithItems);
  } catch (error) {
    console.error('Error fetching order history:', error);
    res.status(500).json({ error: 'Failed to fetch order history', details: error.message });
  }
});

// Delete order with password confirmation
app.delete('/api/order/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { password } = req.body;
    
    // Verify deletion password
    if (password !== '@Sujan123#') {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid deletion password' 
      });
    }
    
    // Delete order from database
    const result = await query(
      'DELETE FROM orders WHERE id = $1 RETURNING *',
      [orderId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Order not found' 
      });
    }
    
    const deletedOrder = result.rows[0];
    console.log(`🗑️ Order ${deletedOrder.order_number} deleted by admin`);
    
    // Emit order deletion to all connected clients
    io.emit('orderDeleted', { orderId: parseInt(orderId) });
    
    res.json({ 
      success: true, 
      message: 'Order deleted successfully',
      deletedOrder: deletedOrder.order_number
    });
    
  } catch (error) {
    console.error('❌ Error deleting order:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete order', 
      details: error.message 
    });
  }
});

// Customers endpoint
app.get('/api/customers', async (req, res) => {
  try {
    const result = await query(`
      SELECT c.*, 
             COUNT(o.id) as actual_order_count,
             MAX(o.created_at) as last_order_date,
             COALESCE(AVG(o.total), 0) as average_order_value
      FROM customers c
      LEFT JOIN orders o ON c.id = o.customer_id
      GROUP BY c.id, c.name, c.phone, c.total_orders, c.total_spent, c.created_at
      ORDER BY c.total_spent DESC, c.created_at DESC
      LIMIT 100
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Error fetching customers:', error);
    res.status(500).json({ error: 'Failed to fetch customers', details: error.message });
  }
});

// Analytics endpoint with detailed daily breakdown
app.get('/api/analytics', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Get basic stats - include all orders with total > 0 for revenue
    const totalOrdersResult = await query('SELECT COUNT(*) as count FROM orders');
    const totalRevenueResult = await query('SELECT SUM(total) as revenue FROM orders WHERE total > 0');
    const totalCustomersResult = await query('SELECT COUNT(*) as count FROM customers');
    const avgOrderValueResult = await query('SELECT AVG(total) as avg FROM orders WHERE total > 0');
    
    // Get today's stats
    const todayOrdersResult = await query('SELECT COUNT(*) as count FROM orders WHERE DATE(created_at) = $1', [today]);
    const todayRevenueResult = await query('SELECT SUM(total) as revenue FROM orders WHERE DATE(created_at) = $1 AND total > 0', [today]);
    
    // Get order types
    const dineInOrdersResult = await query('SELECT COUNT(*) as count FROM orders WHERE order_type = $1', ['dine-in']);
    const deliveryOrdersResult = await query('SELECT COUNT(*) as count FROM orders WHERE order_type = $1', ['delivery']);
    
    // Get last 7 days breakdown - include all orders with revenue
    const last7DaysResult = await query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as order_count,
        SUM(total) as revenue
      FROM orders 
      WHERE created_at >= CURRENT_DATE - INTERVAL '7 days' AND total > 0
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);
    
    // Get top items - from all orders
    const topItemsResult = await query(`
      SELECT 
        oi.item_name as name,
        SUM(oi.quantity) as count
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE o.total > 0
      GROUP BY oi.item_name
      ORDER BY count DESC
      LIMIT 5
    `);
    
    // Get completion rate
    const completedOrdersResult = await query('SELECT COUNT(*) as count FROM orders WHERE status = $1', ['completed']);
    const completionRate = totalOrdersResult.rows[0].count > 0 ? 
      (completedOrdersResult.rows[0].count / totalOrdersResult.rows[0].count) * 100 : 0;
    
    const analytics = {
      totalOrders: parseInt(totalOrdersResult.rows[0].count),
      totalRevenue: parseFloat(totalRevenueResult.rows[0].revenue || 0),
      totalCustomers: parseInt(totalCustomersResult.rows[0].count),
      avgOrderValue: parseFloat(avgOrderValueResult.rows[0].avg || 0),
      todayOrders: parseInt(todayOrdersResult.rows[0].count),
      todayRevenue: parseFloat(todayRevenueResult.rows[0].revenue || 0),
      dineInOrders: parseInt(dineInOrdersResult.rows[0].count),
      deliveryOrders: parseInt(deliveryOrdersResult.rows[0].count),
      completionRate: Math.round(completionRate),
      completedOrders: parseInt(completedOrdersResult.rows[0].count),
      last7Days: last7DaysResult.rows,
      topItems: topItemsResult.rows
    };
    
    res.json(analytics);
  } catch (error) {
    console.error('❌ Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics', details: error.message });
  }
});

// Update order status endpoint
app.put('/api/orders/:orderId/status', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }
    
    const completedAt = (status === 'completed' || status === 'cancelled') ? new Date().toISOString() : null;
    const updatedOrder = await Order.updateStatus(orderId, status, completedAt);
    
    if (!updatedOrder) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // Emit order status update
    io.emit('orderStatusUpdated', { orderId, status, completedAt });
    
    console.log(`✅ Order ${orderId} status updated to: ${status}`);
    res.json({ 
      success: true, 
      message: `Order status updated to ${status}`,
      order: updatedOrder 
    });
  } catch (error) {
    console.error('❌ Error updating order status:', error);
    res.status(500).json({ error: 'Failed to update order status', details: error.message });
  }
});

// Update order payment status endpoint
app.put('/api/orders/:orderId/payment-status', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { payment_status } = req.body;
    
    if (!payment_status) {
      return res.status(400).json({ error: 'Payment status is required' });
    }
    
    // Update payment status in database
    const result = await query(
      'UPDATE orders SET payment_status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [payment_status, orderId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    const updatedOrder = result.rows[0];
    
    // Emit payment status update
    io.emit('orderPaymentStatusUpdated', { orderId, payment_status });
    
    console.log(`✅ Order ${orderId} payment status updated to: ${payment_status}`);
    res.json({ 
      success: true, 
      message: `Payment status updated to ${payment_status}`,
      order: updatedOrder 
    });
  } catch (error) {
    console.error('❌ Error updating payment status:', error);
    res.status(500).json({ error: 'Failed to update payment status', details: error.message });
  }
});

// Settings endpoints
app.get('/api/settings/tables', (req, res) => {
  res.json(restaurantSettings);
});

app.post('/api/settings/tables', (req, res) => {
  const { tableCount } = req.body;
  
  if (!tableCount || tableCount < 1 || tableCount > 100) {
    return res.status(400).json({ error: 'Table count must be between 1 and 100' });
  }
  
  restaurantSettings.tableCount = tableCount;
  
  // Emit settings update to all connected clients
  io.emit('settingsUpdated', { tableCount });
  
  console.log(`Table count updated to ${tableCount}`);
  res.json({ success: true, tableCount });
});

app.post('/api/clear-table/:tableId', async (req, res) => {
  console.log('🔧 Clear table API called for tableId:', req.params.tableId);
  try {
    const { tableId } = req.params;
    const tableIdInt = parseInt(tableId);
    console.log('🔧 Parsed tableId as integer:', tableIdInt);
    
    // Clear table using database
    console.log('🔧 Calling Order.clearTable...');
    const clearedOrdersCount = await Order.clearTable(tableIdInt);
    console.log('🔧 Orders cleared from database:', clearedOrdersCount);
    
    // Clear table session - try both string and integer keys to ensure complete cleanup
    tableSessions.delete(tableId);        // Delete string key
    tableSessions.delete(tableIdInt);     // Delete integer key
    tableSessions.delete(String(tableIdInt)); // Delete string version of integer
    
    // Also clear any cart items or session data for this table
    // Check if there are any other session keys that might contain this table ID
    for (const [sessionKey, sessionData] of tableSessions.entries()) {
      if (sessionKey.toString().includes(tableId) || sessionKey.toString().includes(tableIdInt.toString())) {
        tableSessions.delete(sessionKey);
        console.log(`🧹 Cleared additional session key: ${sessionKey}`);
      }
    }
    
    // Emit table cleared event
    io.emit('tableCleared', { tableId: tableIdInt });
    
    console.log(`✅ Table ${tableId} cleared completely. ${clearedOrdersCount} orders moved to history. Table cache cleared.`);
    res.json({ 
      success: true, 
      message: `Table ${tableId} cleared successfully`, 
      movedToHistory: clearedOrdersCount,
      tableCacheCleared: true
    });
  } catch (error) {
    console.error('❌ Error clearing table:', error);
    res.status(500).json({ error: 'Failed to clear table', details: error.message });
  }
});

app.get('/api/table-session/:tableId', (req, res) => {
  const { tableId } = req.params;
  const session = tableSessions.get(tableId);
  
  if (!session) {
    return res.json({ exists: false });
  }
  
  const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
  if (session.timestamp < fiveMinutesAgo) {
    tableSessions.delete(tableId);
    console.log(`🧹 Expired table session cleared on access: ${tableId}`);
    io.emit('tableCacheCleared', { tableId });
    return res.json({ exists: false });
  }
  
  res.json({ exists: true, cartItems: session.cartItems });
});

app.post('/api/table-session/:tableId', (req, res) => {
  const { tableId } = req.params;
  const { cartItems } = req.body;
  
  tableSessions.set(tableId, {
    timestamp: Date.now(),
    cartItems: cartItems || []
  });
  
  res.json({ success: true });
});

// Admin authentication endpoint
app.post('/api/admin/auth', (req, res) => {
  try {
    const { password } = req.body;
    const adminPassword = process.env.ADMIN_PASSWORD || 'FoodZone2024!';
    
    if (password === adminPassword) {
      res.json({ success: true, message: 'Authentication successful' });
    } else {
      res.status(401).json({ success: false, message: 'Invalid password' });
    }
  } catch (error) {
    console.error('❌ Admin auth error:', error);
    res.status(500).json({ success: false, message: 'Authentication error' });
  }
});

// Database connection test endpoint
app.get('/api/test/db', async (req, res) => {
  try {
    const result = await query('SELECT NOW() as current_time, version() as db_version');
    res.json({ 
      success: true, 
      connected: true,
      timestamp: result.rows[0].current_time,
      version: result.rows[0].db_version
    });
  } catch (error) {
    console.error('❌ Database connection test failed:', error);
    res.status(500).json({ 
      success: false, 
      connected: false,
      error: error.message 
    });
  }
});

// Check database tables endpoint
app.get('/api/test/tables', async (req, res) => {
  try {
    const tables = await query(`
      SELECT table_name, table_schema 
      FROM information_schema.tables 
      WHERE table_type = 'BASE TABLE'
      ORDER BY table_schema, table_name
    `);
    
    const publicTables = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);
    
    res.json({
      success: true,
      allTables: tables.rows,
      publicTables: publicTables.rows.map(r => r.table_name),
      count: publicTables.rows.length
    });
  } catch (error) {
    console.error('❌ Table check failed:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Clear and repopulate menu data endpoint
app.post('/api/menu/reset', async (req, res) => {
  try {
    console.log('🔄 Clearing existing menu data and repopulating...');
    
    // Clear existing menu and order_items data
    await query('DELETE FROM order_items');
    await query('DELETE FROM menu_items');
    
    // New menu data based on provided list
    const menuItems = [
      // Combo Meals
      {name: 'Veg Combo', price: 599, category: 'Combo Meals', description: 'Veg Burger, Tofu Stick, Cheese Fries, Cheese Corndog + Free Coke/Bubble Tea'},
      {name: 'Non-Veg Combo', price: 599, category: 'Combo Meals', description: 'Chicken Burger, Chicken Sausage, Cheese Fries, Corndog + Free Coke/Bubble Tea'},
      
      // Nanglo Khaja Set
      {name: 'Non-Veg Nanglo Khaja Set', price: 1999, category: 'Nanglo Khaja Set', description: 'Chicken Biryani, Chicken Momo, Chicken Sausage, Veg Chowmein, Mustang Aalu, Wai Wai Sadeko, Hot Wings, Drumstick, Chicken Burger, Chicken Pizza + 250ml Coke Free'},
      {name: 'Veg Nanglo Khaja Set', price: 1499, category: 'Nanglo Khaja Set', description: 'Veg Biryani, Veg Momo, Tofu Stick, Mustang Aalu, Veg Burger, Cheese Pizza, Paneer Pakoda, Wai Wai Sadeko, Potato Cheese Ball + 250ml Coke Free'},
      
      // Khaja & Khana Sets
      {name: 'Veg Khaja Set', price: 250, category: 'Khaja & Khana Sets'},
      {name: 'Non-Veg Khaja Set', price: 300, category: 'Khaja & Khana Sets'},
      {name: 'Veg Khana Set', price: 250, category: 'Khaja & Khana Sets'},
      {name: 'Non-Veg Khana Set', price: 300, category: 'Khaja & Khana Sets'},
      {name: 'Food Zone Special', price: 400, category: 'Khaja & Khana Sets'},
      
      // Breakfast
      {name: 'Bread Omelette', price: 150, category: 'Breakfast'},
      {name: 'Bread Jam', price: 100, category: 'Breakfast'},
      {name: 'French Toast', price: 150, category: 'Breakfast'},
      {name: 'Butter Toast', price: 100, category: 'Breakfast'},
      {name: 'Honey Butter Toast', price: 150, category: 'Breakfast'},
      {name: 'Cheese Toast', price: 150, category: 'Breakfast'},
      {name: 'Cheese Tomato Toast', price: 180, category: 'Breakfast'},
      {name: 'Aalu Paratha', price: 140, category: 'Breakfast', description: 'With Dahi & Mix Pickle'},
      {name: 'Pancake', price: 150, category: 'Breakfast'},
      {name: 'Bread Roll', price: 150, category: 'Breakfast'},
      {name: 'Regular Breakfast', price: 250, category: 'Breakfast', description: 'Veg/Chicken Sandwich, Masala Tea, Omelette'},
      {name: 'Food Zone Special Breakfast', price: 350, category: 'Breakfast', description: 'Cheese Tomato Toast, Omelette, Salad, Milk Masala Tea, Hash Brown Potatoes'},
      
      // Sandwiches & Burgers
      {name: 'Veg Sandwich', price: 180, category: 'Sandwiches & Burgers'},
      {name: 'Egg Sandwich', price: 180, category: 'Sandwiches & Burgers'},
      {name: 'Chicken Sandwich', price: 180, category: 'Sandwiches & Burgers'},
      {name: 'Veg Cheese Sandwich', price: 250, category: 'Sandwiches & Burgers'},
      {name: 'Chicken Cheese Sandwich', price: 250, category: 'Sandwiches & Burgers'},
      {name: 'Club Sandwich', price: 300, category: 'Sandwiches & Burgers'},
      {name: 'Veg Burger', price: 180, category: 'Sandwiches & Burgers'},
      {name: 'Chicken Burger', price: 180, category: 'Sandwiches & Burgers'},
      {name: 'Veg Cheese Burger', price: 250, category: 'Sandwiches & Burgers'},
      {name: 'Chicken Cheese Burger', price: 250, category: 'Sandwiches & Burgers'},
      
      // Fries
      {name: 'French Fries', price: 160, category: 'Fries'},
      {name: 'Fries Chilly', price: 220, category: 'Fries'},
      
      // MoMo
      {name: 'Veg MoMo (Steam)', price: 120, category: 'MoMo'},
      {name: 'Veg MoMo (Fried)', price: 170, category: 'MoMo'},
      {name: 'Veg MoMo (Jhol)', price: 170, category: 'MoMo'},
      {name: 'Veg MoMo (Chilly)', price: 200, category: 'MoMo'},
      {name: 'Veg MoMo (Sadeko)', price: 200, category: 'MoMo'},
      {name: 'Veg MoMo (Kothey)', price: 200, category: 'MoMo'},
      {name: 'Buff MoMo (Steam)', price: 120, category: 'MoMo'},
      {name: 'Buff MoMo (Fried)', price: 170, category: 'MoMo'},
      {name: 'Buff MoMo (Jhol)', price: 170, category: 'MoMo'},
      {name: 'Buff MoMo (Chilly)', price: 200, category: 'MoMo'},
      {name: 'Buff MoMo (Sadeko)', price: 200, category: 'MoMo'},
      {name: 'Buff MoMo (Kothey)', price: 200, category: 'MoMo'},
      {name: 'Chicken MoMo (Steam)', price: 140, category: 'MoMo'},
      {name: 'Chicken MoMo (Fried)', price: 190, category: 'MoMo'},
      {name: 'Chicken MoMo (Jhol)', price: 190, category: 'MoMo'},
      {name: 'Chicken MoMo (Chilly)', price: 220, category: 'MoMo'},
      {name: 'Chicken MoMo (Sadeko)', price: 220, category: 'MoMo'},
      {name: 'Chicken MoMo (Kothey)', price: 220, category: 'MoMo'},
      
      // Chowmein
      {name: 'Veg Chowmein (Half)', price: 70, category: 'Chowmein'},
      {name: 'Veg Chowmein (Full)', price: 110, category: 'Chowmein'},
      {name: 'Buff Chowmein (Half)', price: 90, category: 'Chowmein'},
      {name: 'Buff Chowmein (Full)', price: 150, category: 'Chowmein'},
      {name: 'Chicken Chowmein (Half)', price: 90, category: 'Chowmein'},
      {name: 'Chicken Chowmein (Full)', price: 150, category: 'Chowmein'},
      {name: 'Egg Chowmein (Half)', price: 90, category: 'Chowmein'},
      {name: 'Egg Chowmein (Full)', price: 150, category: 'Chowmein'},
      {name: 'Mix Chowmein', price: 200, category: 'Chowmein'},
      
      // Corn Dog & Hot Dog
      {name: 'Sausage Corn Dog', price: 130, category: 'Corn Dog & Hot Dog'},
      {name: 'Cheese Corn Dog', price: 180, category: 'Corn Dog & Hot Dog'},
      {name: 'Hot Dog (Chicken)', price: 190, category: 'Corn Dog & Hot Dog'},
      
      // Thukpa
      {name: 'Veg Thukpa (Half)', price: 100, category: 'Thukpa'},
      {name: 'Veg Thukpa (Full)', price: 150, category: 'Thukpa'},
      {name: 'Egg Thukpa (Half)', price: 140, category: 'Thukpa'},
      {name: 'Egg Thukpa (Full)', price: 180, category: 'Thukpa'},
      {name: 'Chicken Thukpa (Half)', price: 140, category: 'Thukpa'},
      {name: 'Chicken Thukpa (Full)', price: 180, category: 'Thukpa'},
      {name: 'Mixed Thukpa', price: 200, category: 'Thukpa'},
      
      // Pizza
      {name: '9 Inch Cheese Pizza', price: 400, category: 'Pizza'},
      {name: '12 Inch Cheese Pizza', price: 400, category: 'Pizza'},
      {name: '9 Inch Veg Pizza', price: 450, category: 'Pizza'},
      {name: '12 Inch Veg Pizza', price: 450, category: 'Pizza'},
      {name: '9 Inch Chicken Pizza', price: 450, category: 'Pizza'},
      {name: '12 Inch Chicken Pizza', price: 450, category: 'Pizza'},
      {name: '9 Inch Mixed Pizza', price: 500, category: 'Pizza'},
      {name: '12 Inch Mixed Pizza', price: 500, category: 'Pizza'},
      {name: 'Extra Cheese', price: 100, category: 'Pizza'},
      
      // Rice & Biryani
      {name: 'Veg Fry Rice (Half)', price: 100, category: 'Rice & Biryani'},
      {name: 'Veg Fry Rice (Full)', price: 150, category: 'Rice & Biryani'},
      {name: 'Egg Fry Rice (Half)', price: 120, category: 'Rice & Biryani'},
      {name: 'Egg Fry Rice (Full)', price: 160, category: 'Rice & Biryani'},
      {name: 'Buff Fry Rice (Half)', price: 120, category: 'Rice & Biryani'},
      {name: 'Buff Fry Rice (Full)', price: 180, category: 'Rice & Biryani'},
      {name: 'Chicken Fry Rice (Half)', price: 120, category: 'Rice & Biryani'},
      {name: 'Chicken Fry Rice (Full)', price: 180, category: 'Rice & Biryani'},
      {name: 'Mixed Fry Rice', price: 200, category: 'Rice & Biryani'},
      {name: 'Veg Biryani', price: 280, category: 'Rice & Biryani'},
      {name: 'Chicken Biryani', price: 320, category: 'Rice & Biryani'},
      {name: 'Egg Biryani', price: 300, category: 'Rice & Biryani'},
      
      // Curries
      {name: 'Aalu Matar', price: 130, category: 'Curries'},
      {name: 'Mix Veg', price: 130, category: 'Curries'},
      {name: 'Mushroom Curry', price: 180, category: 'Curries'},
      {name: 'Matar Paneer', price: 250, category: 'Curries'},
      {name: 'Paneer Butter Masala', price: 300, category: 'Curries'},
      {name: 'Chicken Curry', price: 180, category: 'Curries'},
      {name: 'Chicken Butter Masala', price: 250, category: 'Curries'},
      {name: 'Chicken Curry Rice', price: 250, category: 'Curries'},
      {name: 'Paneer Curry Rice', price: 300, category: 'Curries'},
      {name: 'Veg Curry Rice', price: 200, category: 'Curries'},
      
      // Peri Peri & Chicken Specials
      {name: 'Peri Peri Chicken', price: 350, category: 'Peri Peri & Chicken Specials'},
      {name: 'Chicken 65', price: 300, category: 'Peri Peri & Chicken Specials'},
      {name: 'Chicken Popcorn', price: 250, category: 'Peri Peri & Chicken Specials'},
      {name: 'Food Zone Special Dragon Chicken', price: 300, category: 'Peri Peri & Chicken Specials'},
      
      // Fish Specials
      {name: 'Fish Finger (8 pcs)', price: 250, category: 'Fish Specials'},
      {name: 'Fish & Chips', price: 350, category: 'Fish Specials'},
      
      // Paneer & Veg Snacks
      {name: 'Paneer Pakoda', price: 300, category: 'Paneer & Veg Snacks'},
      {name: 'Paneer Chilly', price: 300, category: 'Paneer & Veg Snacks'},
      {name: 'Grill Potatoes', price: 150, category: 'Paneer & Veg Snacks'},
      
      // Chopsuey
      {name: 'Veg Chopsuey', price: 300, category: 'Chopsuey'},
      {name: 'Non-Veg Chopsuey', price: 320, category: 'Chopsuey'},
      
      // Pasta
      {name: 'Spaghetti Carbonara', price: 350, category: 'Pasta'},
      {name: 'Spaghetti Bolognese', price: 300, category: 'Pasta'},
      {name: 'Pesto Penne', price: 300, category: 'Pasta'},
      {name: 'Pasta', price: 150, category: 'Pasta'},
      
      // Food Zone Specials
      {name: 'Chicken Kathi Roll', price: 180, category: 'Food Zone Specials'},
      {name: 'Paneer Kathi Roll', price: 200, category: 'Food Zone Specials'},
      {name: 'Food Zone Special Chicken Burger [KFC]', price: 250, category: 'Food Zone Specials'},
      {name: 'Food Zone Special Chicken [KFC] (4 pcs)', price: 300, category: 'Food Zone Specials'},
      {name: 'Veg Manchurian with Rice', price: 250, category: 'Food Zone Specials'},
      {name: 'Chicken Manchurian with Rice', price: 300, category: 'Food Zone Specials'},
      {name: 'Veg MoMo Platter', price: 250, category: 'Food Zone Specials'},
      {name: 'Buff MoMo Platter', price: 300, category: 'Food Zone Specials'},
      {name: 'Chicken MoMo Platter', price: 300, category: 'Food Zone Specials'},
      {name: 'Food Zone Special Noodles', price: 250, category: 'Food Zone Specials'},
      {name: 'Meat Ball', price: 200, category: 'Food Zone Specials'},
      
      // Hukka
      {name: 'Hukka', price: 400, category: 'Hukka'},
      
      // Soups
      {name: 'Mushroom Soup', price: 150, category: 'Soups'},
      {name: 'Hot & Sour Soup', price: 150, category: 'Soups'},
      {name: 'Clear Soup', price: 100, category: 'Soups'},
      {name: 'Chicken Soup', price: 150, category: 'Soups'},
      
      // Hot Beverages
      {name: 'Black Tea', price: 20, category: 'Hot Beverages'},
      {name: 'Ginger Tea', price: 25, category: 'Hot Beverages'},
      {name: 'Black Masala', price: 30, category: 'Hot Beverages'},
      {name: 'Marich Tea', price: 30, category: 'Hot Beverages'},
      {name: 'Lemon Tea', price: 30, category: 'Hot Beverages'},
      {name: 'Mint Tea', price: 30, category: 'Hot Beverages'},
      {name: 'Milk Tea', price: 30, category: 'Hot Beverages'},
      {name: 'Milk Masala Tea', price: 40, category: 'Hot Beverages'},
      {name: 'Hot Lemon', price: 50, category: 'Hot Beverages'},
      {name: 'Ginger Lemon Honey', price: 130, category: 'Hot Beverages'},
      {name: 'Hot Chocolate', price: 190, category: 'Hot Beverages'},
      
      // Cold Beverages
      {name: 'Ju Ju Dhau', price: 70, category: 'Cold Beverages'},
      {name: 'Lassi Plain', price: 100, category: 'Cold Beverages'},
      {name: 'Lassi Sweet', price: 120, category: 'Cold Beverages'},
      {name: 'Lassi Banana', price: 130, category: 'Cold Beverages'},
      {name: 'Lemonade', price: 100, category: 'Cold Beverages'},
      {name: 'Cold Coffee', price: 190, category: 'Cold Beverages'},
      {name: 'Oreo Milkshake', price: 190, category: 'Cold Beverages'},
      {name: 'Chocolate Milkshake', price: 190, category: 'Cold Beverages'},
      {name: 'Virgin Mojito', price: 90, category: 'Cold Beverages'},
      {name: 'Black Coffee', price: 80, category: 'Cold Beverages'},
      {name: 'Milk Coffee', price: 120, category: 'Cold Beverages'},
      {name: 'Coke', price: 70, category: 'Cold Beverages'},
      {name: 'Fanta', price: 70, category: 'Cold Beverages'},
      {name: 'Sprite', price: 70, category: 'Cold Beverages'}
    ];
    
    // Insert new menu items
    for (const item of menuItems) {
      await query(
        'INSERT INTO menu_items (name, price, category, description) VALUES ($1, $2, $3, $4)',
        [item.name, item.price, item.category, item.description || null]
      );
    }
    
    console.log(`✅ Menu reset complete! Added ${menuItems.length} items`);
    res.json({ 
      success: true, 
      message: `Menu reset successfully with ${menuItems.length} items`,
      itemCount: menuItems.length
    });
    
  } catch (error) {
    console.error('❌ Menu reset failed:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Database initialization endpoint with table verification
app.post('/api/init/db', async (req, res) => {
  try {
    console.log('🔄 Initializing database schema...');
    
    // First check if tables already exist
    const tableCheck = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    console.log('📋 Existing tables:', tableCheck.rows.map(r => r.table_name));
    
    // Create tables in correct order (respecting foreign key dependencies)
    const initQueries = [
      // Skip PostGIS extension as it's not available on Railway
      // `CREATE EXTENSION IF NOT EXISTS postgis`,
      
      // Customers table
      `CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        phone VARCHAR(20) UNIQUE NOT NULL,
        email VARCHAR(100),
        total_orders INTEGER DEFAULT 0,
        total_spent DECIMAL(10,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Customer addresses table
      `CREATE TABLE IF NOT EXISTS customer_addresses (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
        label VARCHAR(50) DEFAULT 'Home',
        address TEXT NOT NULL,
        latitude DECIMAL(10,8),
        longitude DECIMAL(11,8),
        landmark VARCHAR(200),
        is_default BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Menu items table
      `CREATE TABLE IF NOT EXISTS menu_items (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        price DECIMAL(8,2) NOT NULL,
        category VARCHAR(100) NOT NULL,
        description TEXT,
        image_url VARCHAR(500),
        is_available BOOLEAN DEFAULT true,
        preparation_time INTEGER DEFAULT 15,
        is_vegetarian BOOLEAN DEFAULT false,
        is_spicy BOOLEAN DEFAULT false,
        allergens TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Table sessions table
      `CREATE TABLE IF NOT EXISTS table_sessions (
        id SERIAL PRIMARY KEY,
        table_id INTEGER NOT NULL CHECK (table_id >= 1 AND table_id <= 25),
        customer_name VARCHAR(100) NOT NULL,
        customer_phone VARCHAR(20) NOT NULL,
        session_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        session_end TIMESTAMP,
        status VARCHAR(20) DEFAULT 'occupied' CHECK (status IN ('occupied', 'ordering', 'dining', 'payment_pending', 'completed', 'cleared')),
        total_amount DECIMAL(10,2) DEFAULT 0,
        payment_status VARCHAR(20) DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'completed')),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Orders table
      `CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        order_number VARCHAR(20) UNIQUE NOT NULL,
        order_type VARCHAR(20) NOT NULL CHECK (order_type IN ('dine-in', 'delivery')),
        customer_id INTEGER REFERENCES customers(id),
        customer_name VARCHAR(100) NOT NULL,
        customer_phone VARCHAR(20) NOT NULL,
        delivery_address TEXT,
        delivery_latitude DECIMAL(10,8),
        delivery_longitude DECIMAL(11,8),
        delivery_landmark VARCHAR(200),
        delivery_distance DECIMAL(5,2),
        delivery_fee DECIMAL(8,2) DEFAULT 0,
        table_id INTEGER,
        table_session_id INTEGER REFERENCES table_sessions(id),
        subtotal DECIMAL(10,2) NOT NULL,
        discount DECIMAL(10,2) DEFAULT 0,
        total DECIMAL(10,2) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'ready', 'completed', 'cancelled')),
        payment_method VARCHAR(20) CHECK (payment_method IN ('cash', 'digital', 'card')),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP
      )`,
      
      // Order items table
      `CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
        menu_item_id INTEGER NOT NULL,
        menu_item_name VARCHAR(200) NOT NULL,
        menu_item_category VARCHAR(100),
        price DECIMAL(8,2) NOT NULL,
        quantity INTEGER NOT NULL CHECK (quantity > 0),
        subtotal DECIMAL(8,2) NOT NULL,
        special_instructions TEXT
      )`,
      
      // Restaurant settings table
      `CREATE TABLE IF NOT EXISTS restaurant_settings (
        id SERIAL PRIMARY KEY,
        setting_key VARCHAR(100) UNIQUE NOT NULL,
        setting_value TEXT NOT NULL,
        description TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Insert default settings
      `INSERT INTO restaurant_settings (setting_key, setting_value, description) VALUES
       ('table_count', '25', 'Total number of tables in restaurant'),
       ('restaurant_name', 'Food Zone Duwakot', 'Restaurant name'),
       ('restaurant_phone', '9851234567', 'Primary contact number'),
       ('restaurant_address', 'KMC Chowk, Duwakot, Bhaktapur', 'Restaurant address'),
       ('restaurant_latitude', '27.6710', 'Restaurant latitude coordinate'),
       ('restaurant_longitude', '85.4298', 'Restaurant longitude coordinate'),
       ('delivery_radius', '5.0', 'Maximum delivery radius in km'),
       ('min_delivery_amount', '200', 'Minimum order amount for delivery'),
       ('delivery_fee_base', '50', 'Base delivery fee')
       ON CONFLICT (setting_key) DO NOTHING`
    ];
    
    for (const initQuery of initQueries) {
      await query(initQuery);
    }
    
    // Check tables after creation
    const finalTableCheck = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    console.log('✅ Database schema initialized successfully');
    console.log('📋 Final tables:', finalTableCheck.rows.map(r => r.table_name));
    
    res.json({ 
      success: true, 
      message: 'Database initialized successfully',
      tables: finalTableCheck.rows.map(r => r.table_name)
    });
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Socket.IO connection handling
// Catch-all handler for React routing in production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    // Only serve index.html for non-API routes
    if (!req.path.startsWith('/api/')) {
      res.sendFile(path.join(__dirname, 'public', 'index.html'));
    } else {
      res.status(404).json({ error: 'API endpoint not found' });
    }
  });
}

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Admin connected');
  
  socket.on('disconnect', () => {
    console.log('Admin disconnected');
  });
});

// ============================================
// TABLE MANAGEMENT API ENDPOINTS
// ============================================

// Get all table statuses for admin dashboard
app.get('/api/tables/status', async (req, res) => {
try {
console.log(' Getting all table statuses...');
const tableStatuses = await TableSession.getAllTableStatuses();
res.json(tableStatuses);
} catch (error) {
console.error(' Error getting table statuses:', error);
res.status(500).json({ error: 'Failed to get table statuses', details: error.message });
}
});

// Create new table session (when customer scans QR)
app.post('/api/tables/:tableId/session', async (req, res) => {
try {
const { tableId } = req.params;
const { customerName, customerPhone } = req.body;
    
console.log(` Creating session for table ${tableId}, customer: ${customerName}`);
    
if (!customerName || !customerPhone) {
  return res.status(400).json({ error: 'Customer name and phone are required' });
}
    
const tableIdInt = parseInt(tableId);
if (isNaN(tableIdInt) || tableIdInt < 1 || tableIdInt > 25) {
  return res.status(400).json({ error: 'Invalid table ID. Must be between 1 and 25' });
}
    
const session = await TableSession.createSession(tableIdInt, customerName, customerPhone);
    
// Emit table occupied event
io.emit('tableOccupied', { 
  tableId: tableIdInt, 
  customerName, 
  customerPhone,
  sessionId: session.id 
});
    
res.json({ success: true, session });
} catch (error) {
console.error(' Error creating table session:', error);
if (error.message.includes('already occupied')) {
  res.status(409).json({ error: error.message });
} else {
  res.status(500).json({ error: 'Failed to create table session', details: error.message });
}
}
});

// Get active session for a specific table
app.get('/api/tables/:tableId/session', async (req, res) => {
try {
const { tableId } = req.params;
const tableIdInt = parseInt(tableId);
    
const session = await TableSession.getActiveSession(tableIdInt);
    
if (!session) {
  return res.status(404).json({ error: 'No active session found for this table' });
}
    
res.json(session);
} catch (error) {
console.error(' Error getting table session:', error);
res.status(500).json({ error: 'Failed to get table session', details: error.message });
}
});

// Update table session status
app.put('/api/tables/:tableId/session/status', async (req, res) => {
try {
const { tableId } = req.params;
const { status, totalAmount } = req.body;
    
console.log(` Updating table ${tableId} status to: ${status}`);
    
const tableIdInt = parseInt(tableId);
const updatedSession = await TableSession.updateSessionStatus(tableIdInt, status, totalAmount);
    
if (!updatedSession) {
  return res.status(404).json({ error: 'No active session found for this table' });
}
    
// Emit status update event
io.emit('tableStatusUpdate', { 
  tableId: tableIdInt, 
  status, 
  totalAmount,
  sessionId: updatedSession.id 
});
    
res.json({ success: true, session: updatedSession });
} catch (error) {
console.error(' Error updating table session status:', error);
res.status(500).json({ error: 'Failed to update table session status', details: error.message });
}
});

// Clear table session (admin action)
app.post('/api/tables/:tableId/clear', async (req, res) => {
try {
const { tableId } = req.params;
const tableIdInt = parseInt(tableId);
    
console.log(` Admin clearing table ${tableId}...`);
    
// Clear table session in database
const clearedSession = await TableSession.clearSession(tableIdInt);
    
if (!clearedSession) {
  return res.status(404).json({ error: 'No active session found for this table' });
}
    
// Clear any existing orders for this table (move to history)
const clearedOrdersCount = await Order.clearTable(tableIdInt);
    
// Clear table session from memory
tableSessions.delete(tableId);
tableSessions.delete(tableIdInt);
tableSessions.delete(String(tableIdInt));
    
// Emit table cleared event
io.emit('tableCleared', { tableId: tableIdInt, sessionId: clearedSession.id });
    
console.log(` Table ${tableId} cleared completely. Session ended, ${clearedOrdersCount} orders moved to history.`);
    
res.json({ 
  success: true, 
  message: `Table ${tableId} cleared successfully`,
  clearedSession,
  movedToHistory: clearedOrdersCount
});
} catch (error) {
console.error(' Error clearing table:', error);
res.status(500).json({ error: 'Failed to clear table', details: error.message });
}
});

// Get table session history
app.get('/api/tables/:tableId/history', async (req, res) => {
try {
const { tableId } = req.params;
const { limit = 10 } = req.query;
    
const tableIdInt = parseInt(tableId);
const history = await TableSession.getSessionHistory(tableIdInt, parseInt(limit));
    
res.json(history);
} catch (error) {
console.error(' Error getting table history:', error);
res.status(500).json({ error: 'Failed to get table history', details: error.message });
}
});

// ============================================
// API ENDPOINTS
// ============================================

// Create payment for table session
app.post('/api/tables/:tableId/payments', async (req, res) => {
  try {
    const { tableId } = req.params;
    const { amount, paymentMethod, transactionId } = req.body;
    
    console.log(`💳 Processing payment for table ${tableId}, amount: $${amount}`);
    
    const tableIdInt = parseInt(tableId);
    const activeSession = await TableSession.getActiveSession(tableIdInt);
    
    if (!activeSession) {
      return res.status(404).json({ error: 'No active session found for this table' });
    }
    
    const payment = await TablePayment.createPayment(
  activeSession.id, 
  amount, 
  paymentMethod, 
  transactionId
);
    
// Update session status to payment_pending
await TableSession.updateSessionStatus(tableIdInt, 'payment_pending', amount);
    
// Emit payment initiated event
io.emit('paymentInitiated', { 
  tableId: tableIdInt, 
  sessionId: activeSession.id,
  paymentId: payment.id,
  amount 
});
    
    res.json({ success: true, payment });
  } catch (error) {
    console.error('❌ Error creating payment:', error);
    res.status(500).json({ error: 'Failed to create payment', details: error.message });
  }
});

// Update payment status
app.put('/api/payments/:paymentId/status', async (req, res) => {
try {
const { paymentId } = req.params;
const { status, gatewayResponse } = req.body;
    
console.log(` Updating payment ${paymentId} status to: ${status}`);
    
const updatedPayment = await TablePayment.updatePaymentStatus(
  parseInt(paymentId), 
  status, 
  gatewayResponse
);
    
if (!updatedPayment) {
  return res.status(404).json({ error: 'Payment not found' });
}
    
// If payment completed, update session payment status
if (status === 'completed') {
  // Get the table session and update payment status
  const sessionQuery = await pool.query(
    'SELECT table_id FROM table_sessions WHERE id = $1',
    [updatedPayment.table_session_id]
  );
      
  if (sessionQuery.rows[0]) {
    const tableId = sessionQuery.rows[0].table_id;
    await TableSession.updateSessionStatus(tableId, 'completed');
        
    // Emit payment completed event
    io.emit('paymentCompleted', { 
      tableId, 
      sessionId: updatedPayment.table_session_id,
      paymentId: updatedPayment.id 
    });
  }
}
    
res.json({ success: true, payment: updatedPayment });
} catch (error) {
console.error(' Error updating payment status:', error);
res.status(500).json({ error: 'Failed to update payment status', details: error.message });
}
});

// Get payments for a table session
app.get('/api/tables/:tableId/payments', async (req, res) => {
try {
const { tableId } = req.params;
const tableIdInt = parseInt(tableId);
    
const activeSession = await TableSession.getActiveSession(tableIdInt);
    
if (!activeSession) {
  return res.status(404).json({ error: 'No active session found for this table' });
}
    
const payments = await TablePayment.getSessionPayments(activeSession.id);
res.json(payments);
} catch (error) {
console.error(' Error getting table payments:', error);
res.status(500).json({ error: 'Failed to get table payments', details: error.message });
}
});

// Direct endpoint to populate menu data (for production deployment)
app.post('/api/populate-menu', async (req, res) => {
  try {
    console.log('🔄 Populating menu data...');
    
    // First ensure table exists
    await initializeMenuTable();
    
    // Clear existing data
    await query('DELETE FROM menu_items');
    
    // Insert all menu items
    for (const item of menuItems) {
      await query(`
        INSERT INTO menu_items (name, price, category, description, image_url, is_available, preparation_time, is_vegetarian, is_spicy) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        item.name,
        item.price,
        item.category,
        item.description || '',
        item.image_url || '/images/default-food.jpg',
        item.is_available !== false,
        item.preparation_time || 15,
        item.is_vegetarian || false,
        item.is_spicy || false
      ]);
    }
    
    const count = await query('SELECT COUNT(*) as count FROM menu_items');
    console.log(`✅ Menu populated with ${count.rows[0].count} items`);
    
    res.json({ 
      success: true, 
      message: `Menu populated with ${count.rows[0].count} items`,
      count: parseInt(count.rows[0].count)
    });
  } catch (error) {
    console.error('❌ Error populating menu:', error);
    res.status(500).json({ error: 'Failed to populate menu', details: error.message });
  }
});

// Clear all test data endpoint (orders, customers, sessions)
app.post('/api/clear-all-data', async (req, res) => {
  try {
    console.log('🧹 Clearing all test data from database...');
    
    const clearedTables = [];
    
    // Clear orders and related data
    try {
      await query('DELETE FROM order_items');
      clearedTables.push('order_items');
      console.log('✅ Cleared order_items');
    } catch (e) {
      console.log('⚠️ order_items table not found, skipping');
    }
    
    try {
      await query('DELETE FROM orders');
      clearedTables.push('orders');
      console.log('✅ Cleared orders');
    } catch (e) {
      console.log('⚠️ orders table not found, skipping');
    }
    
    // Clear customers
    try {
      await query('DELETE FROM customers');
      clearedTables.push('customers');
      console.log('✅ Cleared customers');
    } catch (e) {
      console.log('⚠️ customers table not found, skipping');
    }
    
    // Clear table sessions and payments (if they exist)
    try {
      await query('DELETE FROM table_payments');
      clearedTables.push('table_payments');
      console.log('✅ Cleared table_payments');
    } catch (e) {
      console.log('⚠️ table_payments table not found, skipping');
    }
    
    try {
      await query('DELETE FROM table_sessions');
      clearedTables.push('table_sessions');
      console.log('✅ Cleared table_sessions');
    } catch (e) {
      console.log('⚠️ table_sessions table not found, skipping');
    }
    
    // Clear any cached sessions in memory
    tableSessions.clear();
    clearedTables.push('memory_cache');
    
    console.log('✅ All available test data cleared successfully');
    
    res.json({ 
      success: true, 
      message: 'All available test data cleared successfully',
      cleared: clearedTables
    });
  } catch (error) {
    console.error('❌ Error clearing test data:', error);
    res.status(500).json({ error: 'Failed to clear test data', details: error.message });
  }
});

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
console.log(`Server running on port ${PORT}`);
});
