// Centralized API service layer for all HTTP requests
import axios from 'axios';
import { getApiUrl, getSocketUrl } from '../config/api';
import API_CONFIG from '../config/api';

// Mock data for frontend-only testing
const mockMenuItems = [
  { id: 1, name: 'Chicken Momo', price: 180, category: 'Appetizers', description: 'Steamed chicken dumplings', image: '/images/Momo Platter.jpg' },
  { id: 2, name: 'Chicken Thali', price: 350, category: 'Main Course', description: 'Complete chicken meal set', image: '/images/Chicken Thali Set for 50 people at best restaurant in Duwakot, Near Kathmandu medical college and teaching hospital at duwakot .jpg' },
  { id: 3, name: 'Burger Combo', price: 280, category: 'Fast Food', description: 'Burger with fries and drink', image: '/images/Gourmet Burgers.jpg' },
  { id: 4, name: 'Cheese Pizza', price: 450, category: 'Pizza', description: 'Classic cheese pizza', image: '/images/Cheesy Delights.jpg' },
  { id: 5, name: 'Fried Rice', price: 220, category: 'Main Course', description: 'Chicken fried rice', image: '/images/Combo Meals.jpg' }
];

// Create mock orders with mutable status for testing
let mockOrders = [
  { id: 1, table_id: 5, customer_name: 'John Doe', customer_phone: '9841234567', items: [{ name: 'Chicken Momo', quantity: 2, price: 180 }], total_amount: 360, status: 'pending', order_type: 'dine-in', created_at: new Date().toISOString(), order_number: 'ORD001' },
  { id: 2, table_id: 'Delivery', customer_name: 'Jane Smith', customer_phone: '9847654321', items: [{ name: 'Burger Combo', quantity: 1, price: 280 }], total_amount: 280, status: 'preparing', order_type: 'delivery', created_at: new Date().toISOString(), delivery_address: 'Duwakot, Bhaktapur', order_number: 'ORD002' },
  { id: 3, table_id: 3, customer_name: 'Mike Johnson', customer_phone: '9841111111', items: [{ name: 'Chicken Thali', quantity: 1, price: 350 }, { name: 'Cheese Pizza', quantity: 1, price: 450 }], total_amount: 800, status: 'ready', order_type: 'dine-in', created_at: new Date().toISOString(), order_number: 'ORD003' },
  { id: 4, table_id: 7, customer_name: 'Sarah Wilson', customer_phone: '9842222222', items: [{ name: 'Fried Rice', quantity: 2, price: 220 }], total_amount: 440, status: 'completed', order_type: 'dine-in', created_at: new Date().toISOString(), order_number: 'ORD004' },
  { id: 5, table_id: 'Delivery', customer_name: 'David Brown', customer_phone: '9843333333', items: [{ name: 'Cheese Pizza', quantity: 1, price: 450 }], total_amount: 450, status: 'pending', order_type: 'delivery', created_at: new Date().toISOString(), delivery_address: 'Kathmandu, Nepal', order_number: 'ORD005' }
];

// Check if we're in mock mode - disabled for production
const isMockMode = () => false;

// Create axios instance with base configuration
const apiClient = axios.create({
  baseURL: getApiUrl(),
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Mock API service for testing
const mockApiService = {
  updateOrderStatus: async (orderId, status) => {
    console.log(`Mock: Updating order ${orderId} to status ${status}`);
    // Update the mock order status
    const order = mockOrders.find(o => o.id === parseInt(orderId));
    if (order) {
      order.status = status;
    }
    return { success: true };
  },
  clearTableAdmin: async (tableId) => {
    console.log(`Mock: Clearing table ${tableId}`);
    return { data: { success: true, movedToHistory: 1 } };
  }
};

// Request interceptor - no longer needed since baseURL is set correctly
apiClient.interceptors.request.use((config) => {
  return config;
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// API Service methods
export const apiService = {
  // Menu services
  getMenu: () => {
    if (isMockMode()) {
      return Promise.resolve({ data: mockMenuItems });
    }
    return apiClient.get(API_CONFIG.ENDPOINTS.MENU);
  },
  
  // Order services
  createOrder: (orderData) => {
    if (isMockMode()) {
      return Promise.resolve({ data: { id: Date.now(), ...orderData, status: 'pending' } });
    }
    return apiClient.post(API_CONFIG.ENDPOINTS.ORDERS, orderData);
  },
  getOrders: (params = {}) => {
    if (isMockMode()) {
      return Promise.resolve({ data: mockOrders });
    }
    return apiClient.get(API_CONFIG.ENDPOINTS.ORDERS, { params });
  },
  getOrderHistory: () => {
    if (isMockMode()) {
      return Promise.resolve({ data: mockOrders });
    }
    return apiClient.get(API_CONFIG.ENDPOINTS.ORDER_HISTORY);
  },
  updateOrderStatus: (orderId, status) => {
    if (isMockMode()) {
      return Promise.resolve({ data: { success: true } });
    }
    return apiClient.put(API_CONFIG.ENDPOINTS.ORDER_STATUS(orderId), { status });
  },
  
  // Table services
  getTableStatuses: () => apiClient.get(API_CONFIG.ENDPOINTS.TABLES_STATUS),
  getTableSession: (tableId) => apiClient.get(API_CONFIG.ENDPOINTS.TABLE_SESSION(tableId)),
  clearTable: (tableId) => apiClient.post(API_CONFIG.ENDPOINTS.TABLE_CLEAR(tableId)),
  getTablePayments: (tableId) => apiClient.get(API_CONFIG.ENDPOINTS.TABLE_PAYMENTS(tableId)),
  createTablePayment: (tableId, paymentData) => 
    apiClient.post(API_CONFIG.ENDPOINTS.TABLE_PAYMENT(tableId), paymentData),
  clearTableAdmin: (tableId) => apiClient.post(API_CONFIG.ENDPOINTS.CLEAR_TABLE(tableId)),
  clearTableSessions: () => apiClient.post(API_CONFIG.ENDPOINTS.CLEAR_TABLE_SESSIONS),
  
  // Payment services
  updatePaymentStatus: (paymentId, statusData) => 
    apiClient.put(API_CONFIG.ENDPOINTS.PAYMENT_STATUS(paymentId), statusData),
  
  // Admin services
  getCustomers: () => {
    if (isMockMode()) {
      return Promise.resolve({ data: [] });
    }
    return apiClient.get(API_CONFIG.ENDPOINTS.CUSTOMERS);
  },
  getDatabaseSummary: () => {
    if (isMockMode()) {
      return Promise.resolve({ 
        data: { 
          totalOrders: 25, 
          totalRevenue: 15000, 
          totalCustomers: 18, 
          avgOrderValue: 600 
        } 
      });
    }
    return apiClient.get(API_CONFIG.ENDPOINTS.DATABASE_SUMMARY);
  },
  getAnalytics: () => {
    if (isMockMode()) {
      return Promise.resolve({ data: { orders: mockOrders } });
    }
    return apiClient.get(API_CONFIG.ENDPOINTS.ANALYTICS);
  },
  
  // Settings services
  getTableSettings: () => apiClient.get(API_CONFIG.ENDPOINTS.SETTINGS_TABLES),
  updateTableSettings: (settings) => apiClient.post(API_CONFIG.ENDPOINTS.SETTINGS_TABLES, settings),
};

// Fetch API wrapper for components that use fetch directly
export const fetchApi = {
  get: async (endpoint, options = {}) => {
    if (isMockMode()) {
      // Return mock data based on endpoint
      if (endpoint.includes('/menu')) {
        return { data: mockMenuItems };
      }
      if (endpoint.includes('/orders')) {
        console.log('Mock API: Returning orders:', mockOrders);
        return { data: mockOrders };
      }
      return { data: [] };
    }
    
    const response = await fetch(getApiUrl(endpoint), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  },
  
  post: async (endpoint, data, options = {}) => {
    if (isMockMode()) {
      // Return success response for POST requests
      return { success: true, data: { id: Date.now(), ...data } };
    }
    
    const response = await fetch(getApiUrl(endpoint), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: JSON.stringify(data),
      ...options,
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  },
  
  put: async (endpoint, data, options = {}) => {
    if (isMockMode()) {
      // Mock status update - just return success
      console.log('Mock PUT:', endpoint, data);
      return { success: true, data: data };
    }
    
    const response = await fetch(getApiUrl(endpoint), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: JSON.stringify(data),
      ...options,
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  }
};

export { getSocketUrl };
export default isMockMode() ? mockApiService : apiService;
