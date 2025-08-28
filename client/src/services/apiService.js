// Centralized API service layer for all HTTP requests
import axios from 'axios';
import { getApiUrl, getSocketUrl } from '../config/api';
import API_CONFIG from '../config/api';




// Create axios instance with base configuration
const apiClient = axios.create({
  baseURL: getApiUrl(),
  timeout: 30000, // 30 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false, // Fixed: Disable credentials for cross-origin requests
});

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
  
  // Direct order submission without health checker interference
  createOrder: async (orderData) => {
    try {
      const response = await apiClient.post(API_CONFIG.ENDPOINTS.ORDER, orderData);
      return response.data;
    } catch (error) {
      console.error('Order submission error:', error);
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
    return apiClient.get(API_CONFIG.ENDPOINTS.CUSTOMERS);
  },
  getDatabaseSummary: () => {
    return apiClient.get(API_CONFIG.ENDPOINTS.DATABASE_SUMMARY);
  },
  getAnalytics: () => {
    return apiClient.get(API_CONFIG.ENDPOINTS.ANALYTICS);
  },
  
  // Settings services
  getTableSettings: () => apiClient.get(API_CONFIG.ENDPOINTS.SETTINGS_TABLES),
  updateTableSettings: (settings) => apiClient.post(API_CONFIG.ENDPOINTS.SETTINGS_TABLES, settings),
};

// Fetch API wrapper for components that use fetch directly
export const fetchApi = {
  get: async (endpoint, options = {}) => {
    
    // Add timeout with longer duration for Render cold starts
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout for cold starts
    
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
