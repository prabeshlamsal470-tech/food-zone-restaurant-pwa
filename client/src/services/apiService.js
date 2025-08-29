// Centralized API service layer for all HTTP requests
import axios from 'axios';
import { getApiUrl, getSocketUrl } from '../config/api';
import API_CONFIG from '../config/api';




// Create axios instance with base configuration
const apiClient = axios.create({
  baseURL: getApiUrl(),
  timeout: 45000, // 45 seconds timeout for database connection issues
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
  (response) => {
    // Check if response is HTML instead of JSON
    const contentType = response.headers['content-type'];
    if (contentType && contentType.includes('text/html')) {
      console.error('Received HTML response instead of JSON:', response.data);
      throw new Error('Server returned HTML instead of JSON - API endpoint may be incorrect');
    }
    return response;
  },
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    
    // Handle HTML error responses
    if (error.response?.headers['content-type']?.includes('text/html')) {
      console.error('Server returned HTML error page instead of JSON');
      error.message = 'Server configuration error - received HTML instead of JSON';
    }
    
    return Promise.reject(error);
  }
);



// API Service methods
export const apiService = {
  // Menu services
  getMenu: async () => {
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
    
    try {
      // Fetch from API and cache
      const response = await apiClient.get(API_CONFIG.ENDPOINTS.MENU);
      
      // Validate response is JSON
      if (typeof response.data === 'string' && response.data.includes('<html>')) {
        throw new Error('Received HTML response instead of JSON from menu API');
      }
      
      sessionStorage.setItem('menuCache', JSON.stringify(response.data));
      sessionStorage.setItem('menuCacheTime', Date.now().toString());
      return response;
    } catch (error) {
      console.error('Menu API error:', error);
      
      // Return cached data if available, even if expired
      if (cachedMenu) {
        console.log('Using expired cache due to API error');
        return Promise.resolve({ data: JSON.parse(cachedMenu) });
      }
      
      throw error;
    }
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
  createPayment: async (paymentData) => {
    try {
      const response = await apiClient.post(API_CONFIG.ENDPOINTS.PAYMENTS, paymentData);
      return response.data;
    } catch (error) {
      console.error('Payment creation error:', error);
      throw error;
    }
  },
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
    // Add timeout and better error handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    try {
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
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Request timeout - please check your connection');
      }
      throw error;
    }
  },
  
  put: async (endpoint, data, options = {}) => {
    // Add timeout and better error handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    try {
      const response = await fetch(getApiUrl(endpoint), {
        method: 'PUT',
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
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Request timeout - please check your connection');
      }
      throw error;
    }
  }
};

export { getSocketUrl };
export default apiService;
