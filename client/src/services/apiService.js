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

const mockOrders = [
  { id: 1, table_id: 5, customer_name: 'John Doe', customer_phone: '9841234567', items: [{ name: 'Chicken Momo', quantity: 2, price: 180 }], total: 360, status: 'pending', order_type: 'dine-in', created_at: new Date().toISOString() },
  { id: 2, table_id: 'Delivery', customer_name: 'Jane Smith', customer_phone: '9847654321', items: [{ name: 'Burger Combo', quantity: 1, price: 280 }], total: 280, status: 'preparing', order_type: 'delivery', created_at: new Date().toISOString(), delivery_address: 'Duwakot, Bhaktapur' }
];

// Check if we're in mock mode
const isMockMode = () => getApiUrl() === 'mock';

// Create axios instance with base configuration
const apiClient = axios.create({
  baseURL: isMockMode() ? 'https://mock-api' : getApiUrl(),
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add base URL
apiClient.interceptors.request.use((config) => {
  if (!config.url.startsWith('http')) {
    config.url = getApiUrl(config.url);
  }
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
        return mockMenuItems;
      }
      if (endpoint.includes('/orders')) {
        return mockOrders;
      }
      return [];
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
export default apiService;
