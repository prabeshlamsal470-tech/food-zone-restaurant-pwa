// Centralized API service layer for all HTTP requests
import axios from 'axios';
import { getApiUrl, getSocketUrl } from '../config/api';
import API_CONFIG from '../config/api';




// Create axios instance with base configuration
const apiClient = axios.create({
  baseURL: getApiUrl(),
  timeout: 60000, // 60 seconds for Render cold starts
  headers: {
    'Content-Type': 'application/json',
  },
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

// Enhanced order submission with backend health checks and notifications
const createOrderWithHealthCheck = async (orderData) => {
  // Import health checker dynamically to avoid circular dependencies
  const { default: backendHealthChecker } = await import('../utils/backendHealthChecker');
  
  // Show connecting notification
  const showConnectingNotification = () => {
    const notification = document.createElement('div');
    notification.id = 'order-connecting-notification';
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #3b82f6, #1d4ed8);
      color: white;
      padding: 16px 20px;
      border-radius: 12px;
      box-shadow: 0 8px 16px rgba(0,0,0,0.2);
      z-index: 10000;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      max-width: 350px;
    `;
    
    notification.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
        <div style="width: 20px; height: 20px; border: 2px solid white; border-top: 2px solid transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
        <strong>Submitting Order...</strong>
      </div>
      <p style="margin: 0; opacity: 0.9; font-size: 13px;">Processing your order securely</p>
    `;
    
    document.body.appendChild(notification);
    return notification;
  };
  
  // Show success notification
  const showSuccessNotification = (order) => {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #10b981, #059669);
      color: white;
      padding: 16px 20px;
      border-radius: 12px;
      box-shadow: 0 8px 16px rgba(0,0,0,0.2);
      z-index: 10000;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      max-width: 350px;
    `;
    
    notification.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
        <svg style="width: 20px; height: 20px;" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
        </svg>
        <strong>Order Submitted Successfully!</strong>
      </div>
      <p style="margin: 0; opacity: 0.9; font-size: 13px;">Order #${order.order_number || 'PENDING'} ${orderData.orderType === 'dine-in' ? `for Table ${orderData.tableId}` : 'for delivery'}</p>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 5000);
  };
  
  // Show error notification
  const showErrorNotification = (message) => {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #ef4444, #dc2626);
      color: white;
      padding: 16px 20px;
      border-radius: 12px;
      box-shadow: 0 8px 16px rgba(0,0,0,0.2);
      z-index: 10000;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      max-width: 350px;
    `;
    
    notification.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
        <svg style="width: 20px; height: 20px;" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
        </svg>
        <strong>Order Failed</strong>
      </div>
      <p style="margin: 0; opacity: 0.9; font-size: 13px;">${message}</p>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 8 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 8000);
  };
  
  const connectingNotification = showConnectingNotification();
  
  try {
    // Check backend health first
    const isHealthy = await backendHealthChecker.checkBackendHealth();
    
    if (!isHealthy) {
      // Try to wake backend
      await backendHealthChecker.wakeBackend();
      
      // Wait a moment and check again
      await new Promise(resolve => setTimeout(resolve, 2000));
      const isAwakeNow = await backendHealthChecker.checkBackendHealth();
      
      if (!isAwakeNow) {
        // Store order locally as fallback
        const fallbackOrder = {
          ...orderData,
          order_number: `LOCAL_${Date.now()}`,
          timestamp: new Date().toISOString(),
          status: 'pending_sync'
        };
        
        const localOrders = JSON.parse(localStorage.getItem('pendingOrders') || '[]');
        localOrders.push(fallbackOrder);
        localStorage.setItem('pendingOrders', JSON.stringify(localOrders));
        
        // Remove connecting notification
        if (connectingNotification.parentNode) {
          connectingNotification.parentNode.removeChild(connectingNotification);
        }
        
        showErrorNotification('Server is starting up. Please wait 30-60 seconds and try again.');
        throw new Error('Backend unavailable - order saved locally');
      }
    }
    
    // Submit order to backend
    const response = await apiClient.post(API_CONFIG.ENDPOINTS.ORDERS, orderData);
    
    // Remove connecting notification
    if (connectingNotification.parentNode) {
      connectingNotification.parentNode.removeChild(connectingNotification);
    }
    
    // Show success notification
    if (response.data && response.data.order) {
      showSuccessNotification(response.data.order);
    }
    
    return response;
    
  } catch (error) {
    // Remove connecting notification
    if (connectingNotification.parentNode) {
      connectingNotification.parentNode.removeChild(connectingNotification);
    }
    
    // Show error notification with specific message
    let errorMessage = 'Connection failed. Please check your internet and try again.';
    
    if (error.response?.status === 404) {
      errorMessage = 'Order service not available. Please try again or contact staff.';
    } else if (error.response?.status === 500) {
      errorMessage = 'Server error occurred. Your order was not submitted. Please try again.';
    } else if (error.response?.status === 400) {
      errorMessage = `Order validation failed: ${error.response?.data?.error || 'Invalid order data'}`;
    } else if (error.message.includes('Backend unavailable')) {
      errorMessage = 'Server is starting up. Please wait 30-60 seconds and try again.';
    }
    
    showErrorNotification(errorMessage);
    throw error;
  }
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
  
  // Enhanced order submission with health checks and notifications
  createOrder: createOrderWithHealthCheck,
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
