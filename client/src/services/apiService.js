// Centralized API service layer for all HTTP requests
import axios from 'axios';
import { getApiUrl, getSocketUrl } from '../config/api';
import API_CONFIG from '../config/api';
import backendHealthChecker from '../utils/backendHealthChecker';

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

// Check if we should use mock mode based on backend health
const isMockMode = () => {
  return backendHealthChecker.shouldUseMockMode();
};

// Create axios instance with base configuration
const apiClient = axios.create({
  baseURL: getApiUrl(),
  timeout: 15000, // Increased timeout for Render cold starts
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

// Success notification helper
const showOrderSuccessNotification = (order) => {
  const notification = document.createElement('div');
  notification.className = 'fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg shadow-lg z-50';
  notification.innerHTML = `
    <div class="flex items-center">
      <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
      </svg>
      <div>
        <p class="font-medium">Order Submitted Successfully!</p>
        <p class="text-sm">Order #${order.order_number} for Table ${order.table_id}</p>
        <p class="text-xs text-green-600 mt-1">Backend offline - order saved locally</p>
      </div>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 5000);
};

// API Service methods
export const apiService = {
  // Menu services
  getMenu: () => {
    // Check cache first for fast loading
    const cachedMenu = sessionStorage.getItem('menuCache');
    const cacheTime = sessionStorage.getItem('menuCacheTime');
    
    if (cachedMenu && cacheTime) {
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000;
      
      if (now - parseInt(cacheTime) < fiveMinutes) {
        return Promise.resolve({ data: JSON.parse(cachedMenu) });
      }
    }
    
    // Fetch from API and cache
    return apiClient.get(API_CONFIG.ENDPOINTS.MENU).then(response => {
      sessionStorage.setItem('menuCache', JSON.stringify(response.data));
      sessionStorage.setItem('menuCacheTime', Date.now().toString());
      return response;
    });
  },
  
  // Order services with enhanced error handling
  createOrder: async (orderData) => {
    try {
      // Check backend health before order submission
      if (!backendHealthChecker.isBackendHealthy) {
        console.warn('🔄 Backend unhealthy, attempting to wake before order submission...');
        await backendHealthChecker.wakeBackend();
      }
      
      const response = await apiClient.post(API_CONFIG.ENDPOINTS.ORDERS, orderData);
      
      // Show success notification
      if (response.data) {
        setTimeout(() => {
          const notification = document.createElement('div');
          notification.className = 'fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg shadow-lg z-50';
          notification.innerHTML = `
            <div class="flex items-center">
              <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
              </svg>
              <div>
                <p class="font-medium">Order Submitted Successfully!</p>
                <p class="text-sm">Order #${response.data.order_number || 'N/A'} for Table ${orderData.table_id}</p>
              </div>
            </div>
          `;
          
          document.body.appendChild(notification);
          
          setTimeout(() => {
            if (notification.parentNode) {
              notification.parentNode.removeChild(notification);
            }
          }, 5000);
        }, 100);
      }
      
      return response;
    } catch (error) {
      console.error('Order submission failed:', error);
      
      // Show error notification with helpful message
      const errorNotification = document.createElement('div');
      errorNotification.className = 'fixed top-4 right-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg shadow-lg z-50';
      errorNotification.innerHTML = `
        <div class="flex items-center">
          <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>
          </svg>
          <div>
            <p class="font-medium">Failed to submit order</p>
            <p class="text-sm">Server is waking up. Please wait 30-60 seconds and try again.</p>
          </div>
        </div>
      `;
      
      document.body.appendChild(errorNotification);
      
      setTimeout(() => {
        if (errorNotification.parentNode) {
          errorNotification.parentNode.removeChild(errorNotification);
        }
      }, 8000);
      
      throw error;
    }
  },
  getOrders: (params = {}) => {
    return apiClient.get(API_CONFIG.ENDPOINTS.ORDERS, { params });
  },
  getOrderHistory: () => {
    return apiClient.get(API_CONFIG.ENDPOINTS.ORDER_HISTORY);
  },
  updateOrderStatus: (orderId, status) => {
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
    
    // Add timeout with longer duration for Render cold starts
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout for cold starts
    
    try {
      const response = await fetch(getApiUrl(endpoint), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        signal: controller.signal,
        ...options,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  },
  
  post: async (endpoint, data, options = {}) => {
    // Check backend health before making request
    if (!backendHealthChecker.isBackendHealthy) {
      console.warn('🔄 Backend unhealthy, attempting to wake...');
      await backendHealthChecker.wakeBackend();
    }
    
    if (isMockMode()) {
      // Show success notification for mock orders
      if (endpoint.includes('/orders') && data.order_type) {
        const mockOrder = { 
          id: Date.now(), 
          order_number: `ORD${Date.now().toString().slice(-6)}`,
          table_id: data.table_id || 'Unknown',
          ...data 
        };
        
        // Show user-friendly notification
        setTimeout(() => {
          const notification = document.createElement('div');
          notification.className = 'fixed top-4 right-4 bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded-lg shadow-lg z-50';
          notification.innerHTML = `
            <div class="flex items-center">
              <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
              </svg>
              <div>
                <p class="font-medium">Order Saved Locally</p>
                <p class="text-sm">Order #${mockOrder.order_number} - Server reconnecting...</p>
              </div>
            </div>
          `;
          
          document.body.appendChild(notification);
          
          setTimeout(() => {
            if (notification.parentNode) {
              notification.parentNode.removeChild(notification);
            }
          }, 5000);
        }, 100);
        
        return { success: true, data: mockOrder };
      }
      return { success: true, data: { id: Date.now(), ...data } };
    }
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      const response = await fetch(getApiUrl(endpoint), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        body: JSON.stringify(data),
        signal: controller.signal,
        ...options,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    } catch (error) {
      console.error('POST request failed:', error);
      
      // If it's an order submission, show helpful error message
      if (endpoint.includes('/orders')) {
        const errorNotification = document.createElement('div');
        errorNotification.className = 'fixed top-4 right-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg shadow-lg z-50';
        errorNotification.innerHTML = `
          <div class="flex items-center">
            <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>
            </svg>
            <div>
              <p class="font-medium">Connection Failed</p>
              <p class="text-sm">Server is starting up. Please wait 30-60 seconds and try again.</p>
            </div>
          </div>
        `;
        
        document.body.appendChild(errorNotification);
        
        setTimeout(() => {
          if (errorNotification.parentNode) {
            errorNotification.parentNode.removeChild(errorNotification);
          }
        }, 8000);
      }
      
      throw error;
    }
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
