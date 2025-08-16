// Centralized API configuration for separate frontend/backend deployment
const API_CONFIG = {
  // Base URLs for different environments
  BASE_URL: process.env.REACT_APP_API_URL || 
    (process.env.NODE_ENV === 'production' 
      ? 'https://your-backend-domain.com' 
      : 'http://localhost:5001'),
  
  SOCKET_URL: process.env.REACT_APP_SOCKET_URL || 
    (process.env.NODE_ENV === 'production' 
      ? 'https://your-backend-domain.com' 
      : 'http://localhost:5001'),

  // API endpoints
  ENDPOINTS: {
    // Menu endpoints
    MENU: '/api/menu',
    
    // Order endpoints
    ORDERS: '/api/orders',
    ORDER_HISTORY: '/api/order-history',
    ORDER_STATUS: (orderId) => `/api/orders/${orderId}/status`,
    
    // Table endpoints
    TABLES_STATUS: '/api/tables/status',
    TABLE_SESSION: (tableId) => `/api/tables/${tableId}/session`,
    TABLE_CLEAR: (tableId) => `/api/tables/${tableId}/clear`,
    TABLE_PAYMENTS: (tableId) => `/api/tables/${tableId}/payments`,
    TABLE_PAYMENT: (tableId) => `/api/tables/${tableId}/payment`,
    CLEAR_TABLE: (tableId) => `/api/clear-table/${tableId}`,
    CLEAR_TABLE_SESSIONS: '/api/clear-table-sessions',
    
    // Payment endpoints
    PAYMENT_STATUS: (paymentId) => `/api/payments/${paymentId}/status`,
    
    // Admin endpoints
    CUSTOMERS: '/api/customers',
    DATABASE_SUMMARY: '/api/database/summary',
    ANALYTICS: '/api/analytics',
    
    // Settings endpoints
    SETTINGS_TABLES: '/api/settings/tables'
  }
};

// Helper function to get full API URL
export const getApiUrl = (endpoint) => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

// Helper function to get Socket.IO URL
export const getSocketUrl = () => {
  return API_CONFIG.SOCKET_URL;
};

export default API_CONFIG;
