import React, { useState, useEffect } from 'react';
import { fetchApi, getSocketUrl, apiService } from '../services/apiService';
import io from 'socket.io-client';
import OfflineStorageManager from '../utils/offlineStorage';
import audioManager from '../utils/audioNotifications';
import AdminSettings from '../components/AdminSettings';

const Admin = () => {
  const [orders, setOrders] = useState([]);
  const [orderHistory, setOrderHistory] = useState([]);
  const [customers] = useState([]);
  const [dbSummary, setDbSummary] = useState(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    // Check localStorage for existing authentication
    return localStorage.getItem('adminAuthenticated') === 'true';
  });
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  // const [socket] = useState(null); // Commented out to avoid unused variable warning

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [tableToDelete, setTableToDelete] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ show: false, orderId: null, message: '' });
  const [deleteDialog, setDeleteDialog] = useState({ show: false, orderId: null, orderNumber: '', password: '' });
  const [activeTab, setActiveTab] = useState('dine-in'); // 'dine-in', 'delivery', 'history', 'customers', or 'settings'

  // PWA and notification states
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushManager] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineStorage, setOfflineStorage] = useState(null);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    // Audio alert manager placeholder
    const audioAlertManager = {
      playNotificationAlert: () => {
        audioManager.playTableOrderSound();
      }
    };
    fetchOrders();
    initializeOfflineStorage();
    
    // Initialize PWA inline to avoid dependency issues
    const initializePWAInline = async () => {
      try {
        if (offlineStorage) {
          await offlineStorage.init();
        }
        
        if (pushManager && !pushEnabled) {
          try {
            const initialized = await pushManager.initialize();
            setPushEnabled(initialized);
          } catch (error) {
            console.error('Push manager initialization failed:', error);
          }
        }
      } catch (error) {
        console.error('PWA initialization failed:', error);
      }
    };
    
    initializePWAInline();
    fetchDatabaseSummary();

    // Initialize audio notifications
    audioManager.requestPermissions();

    // PWA features initialized inline above

    // Socket connection for real-time updates
    const newSocket = io(getSocketUrl());
    // setSocket(newSocket); // Commented out to avoid unused variable warning
    
    newSocket.on('newOrder', (order) => {
      console.log('📨 New order received:', order);
      setOrders(prevOrders => [...prevOrders, order]);
      
      // Play notification sound based on order type
      if (order.order_type === 'delivery') {
        audioManager.playDeliveryOrderSound();
      } else {
        audioManager.playTableOrderSound();
      }
      
      // Play enhanced triple bell alert
      if (audioAlertManager) {
        audioAlertManager.playNotificationAlert();
      }

      // Show push notification
      if (pushManager && pushEnabled) {
        const notificationTitle = order.order_type === 'delivery' ? '🚚 New Delivery Order' : '🍽️ New Table Order';
        const notificationBody = `Order #${order.order_number || order.id} from ${order.customer_name}`;
        try {
          pushManager.showLocalNotification(notificationTitle, {
            body: notificationBody,
            icon: '/icon-192x192.png',
            badge: '/icon-192x192.png',
            vibrate: [200, 100, 200],
            requireInteraction: true,
            actions: [
              { action: 'view', title: 'View Order' },
              { action: 'dismiss', title: 'Dismiss' }
            ]
          });
        } catch (error) {
          console.error('Push notification failed:', error);
        }
      }

      // Show in-app notification
      showNotification(
        order.order_type === 'delivery' ? '🚚 New Delivery Order' : '🍽️ New Table Order',
        `Order #${order.order_number || order.id} from ${order.customer_name}`,
        'info'
      );

      // Store offline if needed
      if (offlineStorage) {
        offlineStorage.storeOrder(order);
      }
    });

    newSocket.on('orderStatusUpdated', ({ orderId, status }) => {
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId ? { ...order, status } : order
        )
      );
    });

    newSocket.on('tableCleared', ({ tableId }) => {
      console.log('🧹 Table cleared event received for table:', tableId);
      // Filter out orders for the cleared table
      setOrders(prevOrders => 
        prevOrders.filter(order => order.table_id !== tableId)
      );
    });

    // Online/offline event listeners
    const handleOnline = () => {
      setIsOnline(true);
      if (offlineStorage) {
        offlineStorage.syncPendingActions();
      }
      showNotification('Connection Restored', 'Back online - syncing data', 'success');
    };

    const handleOffline = () => {
      setIsOnline(false);
      showNotification('Offline Mode', 'Working offline - changes will sync when reconnected', 'warning');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      if (newSocket) {
        newSocket.close();
      }
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [offlineStorage, pushEnabled, pushManager]);

  useEffect(() => {
    if (activeTab === 'history' && orderHistory.length === 0) {
      fetchOrderHistory();
    }
  }, [activeTab, orderHistory.length]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const data = await fetchApi.get('/api/orders');
      setOrders(data);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderHistory = async () => {
    try {
      setIsLoadingHistory(true);
      const data = await fetchApi.get('/api/order-history');
      setOrderHistory(data);
    } catch (err) {
      console.error('Error fetching order history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };


  const fetchDatabaseSummary = async () => {
    try {
      const data = await fetchApi.get('/api/database/summary');
      setDbSummary(data);
    } catch (err) {
      console.error('Error fetching database summary:', err);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetchApi.post('/api/admin/auth', { password });
      
      if (response.success) {
        setIsAuthenticated(true);
        localStorage.setItem('adminAuthenticated', 'true');
        setPassword('');
        setError(null);
      } else {
        setError('Incorrect password. Please try again.');
        setPassword('');
      }
    } catch (err) {
      console.error('Authentication error:', err);
      setError('Authentication failed. Please try again.');
      setPassword('');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('adminAuthenticated');
    setPassword('');
    setError(null);
  };


  // Initialize offline storage
  const initializeOfflineStorage = async () => {
    try {
      const storage = new OfflineStorageManager();
      await storage.init();
      setOfflineStorage(storage);
    } catch (error) {
      console.error('Offline storage initialization failed:', error);
    }
  };

  // Toggle push notifications
  const togglePushNotifications = async () => {
    if (!pushManager) {
      showNotification('Push Notifications', 'Push manager not available', 'error');
      return;
    }
    
    if (pushEnabled) {
      try {
        await pushManager.unsubscribe();
        setPushEnabled(false);
        showNotification('Push Notifications', 'Disabled', 'info');
      } catch (error) {
        console.error('Failed to unsubscribe from push notifications:', error);
        showNotification('Push Notifications', 'Failed to disable', 'error');
      }
    } else {
      try {
        const initialized = await pushManager.initialize();
        setPushEnabled(initialized);
        showNotification('Push Notifications', initialized ? 'Enabled - Local notifications active' : 'Failed to enable', initialized ? 'success' : 'error');
      } catch (error) {
        console.error('Failed to initialize push notifications:', error);
        showNotification('Push Notifications', 'Failed to enable', 'error');
      }
    }
  };

  // Notification functions
  const showNotification = (title, message, type = 'info') => {
    const notification = {
      id: Date.now(),
      title,
      message,
      type,
      timestamp: new Date().toISOString()
    };
    
    setNotifications(prev => [notification, ...prev.slice(0, 4)]); // Keep only 5 notifications
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 5000);
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };


  const handleClearTable = (tableId) => {
    console.log('🔧 Clear table clicked for table:', tableId);
    setTableToDelete(tableId);
    setShowConfirmModal(true);
    console.log('🔧 Modal should show now');
  };

  const confirmClearTable = async () => {
    console.log('🔧 Confirm clear table called for table:', tableToDelete);
    if (tableToDelete) {
      try {
        console.log('🔧 Making API call to clear table:', tableToDelete);
        // Call server to clear table (database handles everything)
        const response = await apiService.clearTableAdmin(tableToDelete);
        console.log('🔧 API response:', response.data);
        
        if (response.data.success) {
          // Refresh orders from database to get updated state
          console.log('🔧 Refreshing orders from database...');
          await fetchOrders();
          
          console.log(`✅ Table ${tableToDelete} cleared successfully. ${response.data.movedToHistory} orders moved to history.`);
          // Success - no alert needed, the UI will update automatically
        }
        
        setShowConfirmModal(false);
        setTableToDelete(null);
      } catch (error) {
        console.error('❌ Error clearing table:', error);
        console.error('❌ Full error details:', error.response?.data || error.message);
        // Error logged to console - no alert popup needed
      }
    } else {
      console.log('❌ No table to delete');
    }
  };

  const cancelClearTable = () => {
    setShowConfirmModal(false);
    setTableToDelete(null);
  };

  const handleCompleteDeliveryOrder = async (orderId) => {
    setConfirmDialog({
      show: true,
      orderId,
      message: 'Mark this delivery order as complete?'
    });
  };


  const confirmCompleteOrder = async () => {
    const { orderId } = confirmDialog;
    setConfirmDialog({ show: false, orderId: null, message: '' });
    
    try {
      await apiService.updateOrderStatus(orderId, 'completed');
      await fetchOrders();
      console.log(`✅ Delivery order ${orderId} marked as completed`);
    } catch (error) {
      console.error('Error completing delivery order:', error);
    }
  };

  const handleDeleteOrder = (orderId, orderNumber) => {
    setDeleteDialog({
      show: true,
      orderId,
      orderNumber,
      password: ''
    });
  };

  const confirmDeleteOrder = async () => {
    if (deleteDialog.password !== '@Sujan123#') {
      alert('❌ Incorrect password');
      return;
    }

    try {
      const result = await fetchApi.delete(`/api/orders/${deleteDialog.orderId}`);
      
      if (result.success) {
        setDeleteDialog({ show: false, orderId: null, orderNumber: '', password: '' });
        await fetchOrderHistory();
        console.log(`🗑️ Order ${result.deletedOrder} deleted successfully`);
      } else {
        alert('❌ ' + result.error);
      }
    } catch (error) {
      console.error('Error deleting order:', error);
      alert('❌ Failed to delete order');
    }
  };

  const openInGoogleMaps = (latitude, longitude) => {
    if (latitude && longitude) {
      // Open Google Search with coordinates
      const searchUrl = `https://www.google.com/search?q=${latitude}%2C+${longitude}`;
      window.open(searchUrl, '_blank');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString || dateString === 'Invalid Date') return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'N/A';
    }
  };

  const getTotalOrderValue = (items, fallbackTotal) => {
    if (!items || items.length === 0) return fallbackTotal || 0;
    return items.reduce((total, item) => total + (item.price * item.quantity), 0);
  };


  // Show login form if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🔐</div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Admin Access</h1>
            <p className="text-gray-600">Enter password to access Food Zone Admin Panel</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Admin Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors"
                  placeholder="Enter admin password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-600 text-sm">❌ {error}</p>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              🚀 Access Admin Panel
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              🍽️ Food Zone Restaurant Management System
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Confirmation Dialog */}
      {confirmDialog.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
            <h3 className="text-lg font-semibold mb-4">Confirm Action</h3>
            <p className="text-gray-600 mb-6">{confirmDialog.message}</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDialog({ show: false, orderId: null, message: '' })}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmCompleteOrder}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Order Dialog */}
      {deleteDialog.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4 text-red-600">🗑️ Delete Order</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete Order #{deleteDialog.orderNumber}?
            </p>
            <p className="text-sm text-red-500 mb-4">
              ⚠️ This action cannot be undone and will permanently remove the order from the database.
            </p>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enter deletion password to confirm:
              </label>
              <input
                type="password"
                value={deleteDialog.password}
                onChange={(e) => setDeleteDialog(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Enter @Sujan123#"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteDialog({ show: false, orderId: null, orderNumber: '', password: '' })}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteOrder}
                disabled={deleteDialog.password !== '@Sujan123#'}
                className={`px-4 py-2 rounded transition-colors ${
                  deleteDialog.password === '@Sujan123#'
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                🗑️ Delete Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Table Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="text-center">
              <div className="text-4xl mb-4">⚠️</div>
              <h3 className="text-lg font-semibold mb-2">Clear Table {tableToDelete}?</h3>
              <p className="text-gray-600 mb-6">
                This will mark all active orders for this table as completed and make the table available for new customers.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={cancelClearTable}
                  className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmClearTable}
                  className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  Yes, Clear Table
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notification Toast Container */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`max-w-sm w-full bg-white shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden transform transition-all duration-300 ease-in-out ${
              notification.type === 'success' ? 'border-l-4 border-green-500' :
              notification.type === 'error' ? 'border-l-4 border-red-500' :
              notification.type === 'warning' ? 'border-l-4 border-yellow-500' :
              'border-l-4 border-blue-500'
            }`}
          >
            <div className="p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  {notification.type === 'success' && <div className="text-green-500">✅</div>}
                  {notification.type === 'error' && <div className="text-red-500">❌</div>}
                  {notification.type === 'warning' && <div className="text-yellow-500">⚠️</div>}
                  {notification.type === 'info' && <div className="text-blue-500">ℹ️</div>}
                </div>
                <div className="ml-3 w-0 flex-1 pt-0.5">
                  <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                  <p className="mt-1 text-sm text-gray-500">{notification.message}</p>
                </div>
                <div className="ml-4 flex-shrink-0 flex">
                  <button
                    className="bg-white rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none"
                    onClick={() => removeNotification(notification.id)}
                  >
                    <span className="sr-only">Close</span>
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-800">🍽️ Food Zone Admin Panel</h1>
          <div className="flex items-center space-x-4">
            {/* Connection Status */}
            <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${
              isOnline 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                isOnline ? 'bg-green-500' : 'bg-red-500'
              }`}></div>
              {isOnline ? 'Online' : 'Offline'}
            </div>

            {/* PWA Install Button */}
            <button 
              id="pwa-install-btn"
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors hidden"
              onClick={() => window.deferredPrompt && window.deferredPrompt.prompt()}
            >
              📱 Install App
            </button>
            
            {/* Push Notifications Toggle */}
            <button
              onClick={togglePushNotifications}
              className={`px-3 py-2 rounded-lg transition-colors font-medium ${
                pushEnabled
                  ? 'bg-green-500 hover:bg-green-600 text-white'
                  : 'bg-gray-300 hover:bg-gray-400 text-gray-700'
              }`}
              title={pushEnabled ? 'Disable Push Notifications' : 'Enable Push Notifications'}
            >
              {pushEnabled ? '📱 Push On' : '📵 Push Off'}
            </button>
            
            {/* Audio Settings */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => audioManager.setEnabled(!audioManager.isEnabled)}
                className={`p-2 rounded-lg transition-colors ${
                  audioManager.isEnabled 
                    ? 'bg-green-500 hover:bg-green-600 text-white' 
                    : 'bg-gray-300 hover:bg-gray-400 text-gray-700'
                }`}
                title={audioManager.isEnabled ? 'Disable Sound' : 'Enable Sound'}
              >
                {audioManager.isEnabled ? '🔊' : '🔇'}
              </button>
            </div>
            
            <button 
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => setActiveTab('dine-in')}
          className={`px-4 py-2 rounded-md font-medium transition-colors ${
            activeTab === 'dine-in'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Dine-in Orders
        </button>
        <button
          onClick={() => setActiveTab('delivery')}
          className={`px-4 py-2 rounded-md font-medium transition-colors ${
            activeTab === 'delivery'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Delivery Orders
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 rounded-md font-medium transition-colors ${
            activeTab === 'history'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Order History
        </button>
        <button
          onClick={() => setActiveTab('customers')}
          className={`px-4 py-2 rounded-md font-medium transition-colors ${
            activeTab === 'customers'
              ? 'bg-white text-purple-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          👥 Customers
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'settings'
              ? 'bg-white text-purple-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          ⚙️ Settings
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'dine-in' && (
        <>
          {orders.filter(order => order.order_type === 'dine-in' && order.status !== 'completed' && order.status !== 'cancelled').length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🪑</div>
              <h2 className="text-2xl font-semibold text-gray-600 mb-2">No Dine-in Orders</h2>
              <p className="text-gray-500">Table orders will appear here in real-time</p>
            </div>
          ) : (
            <div className="space-y-6">
              {orders.filter(order => order.table_id !== null && order.order_type === 'dine-in' && order.status !== 'completed' && order.status !== 'cancelled').map(order => (
                <div key={order.id} className="bg-white rounded-lg shadow-md p-6 border-l-4 border-primary">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-semibold">🍽️ Table {order.table_id}</h3>
                      <p className="text-gray-600">👤 {order.customer_name} • 📞 {order.customer_phone}</p>
                      <p className="text-sm text-gray-500">🕒 {formatDate(order.created_at)}</p>
                      <div className="mt-2 flex items-center space-x-4">
                        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">
                          📋 Order #{order.order_number || order.id}
                        </span>
                        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">
                          📊 Status: {order.status || 'Pending'}
                        </span>
                        {order.items && (
                          <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full font-medium">
                            🛒 {order.items.length} Items
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary">
                        NPR {getTotalOrderValue(order.items, order.total)}/-
                      </div>
                      <button
                        onClick={() => handleClearTable(order.table_id)}
                        className="mt-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                      >
                        Clear Table
                      </button>
                    </div>
                  </div>
                  
                  <div className="border-t pt-4">
                    <h4 className="font-semibold mb-2">Order Items:</h4>
                    <div className="space-y-2">
                      {order.items.map((item, index) => (
                        <div key={index} className="flex justify-between items-center py-1">
                          <div className="flex items-center">
                            <span className="font-medium">{item.name}</span>
                            {item.isCustom && (
                              <span className="ml-2 bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                                Custom
                              </span>
                            )}
                          </div>
                          <div className="text-right">
                            <span className="text-gray-600">Qty: {item.quantity}</span>
                            {!item.isCustom && (
                              <span className="ml-4 font-semibold">
                                NPR {(item.price * item.quantity)}/-
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Delivery Orders Tab */}
      {activeTab === 'delivery' && (
        <>
          {orders.filter(order => order.order_type === 'delivery' && order.status !== 'completed' && order.status !== 'cancelled').length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🚚</div>
              <h2 className="text-2xl font-semibold text-gray-600 mb-2">No Active Delivery Orders</h2>
              <p className="text-gray-500">Active delivery orders will appear here in real-time</p>
            </div>
          ) : (
            <div className="space-y-6">
              {orders.filter(order => order.order_type === 'delivery' && order.status !== 'completed' && order.status !== 'cancelled').map(order => (
                <div key={order.id} className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-semibold text-green-600">🚚 Delivery Order</h3>
                      <p className="text-gray-600">👤 {order.customer_name} • 📞 {order.customer_phone}</p>
                      {order.delivery_address && (
                        <div className="flex items-center space-x-2">
                          <p className="text-sm text-gray-600">📍 {order.delivery_address}</p>
                          {(order.latitude && order.longitude) && (
                            <button
                              onClick={() => openInGoogleMaps(order.latitude, order.longitude)}
                              className="bg-blue-500 text-white text-xs px-2 py-1 rounded hover:bg-blue-600 transition-colors"
                              title="Search coordinates on Google"
                            >
                              📍 Location
                            </button>
                          )}
                        </div>
                      )}
                      {(order.latitude && order.longitude) && (
                        <div className="flex items-center space-x-2">
                          <p className="text-xs text-blue-600">📍 GPS: {order.latitude}, {order.longitude}</p>
                          <button
                            onClick={() => openInGoogleMaps(order.latitude, order.longitude)}
                            className="bg-blue-500 text-white text-xs px-2 py-1 rounded hover:bg-blue-600 transition-colors"
                            title="Open GPS coordinates in Google Maps"
                          >
                            🗺️ Maps
                          </button>
                        </div>
                      )}
                      {order.notes && <p className="text-sm text-gray-500 italic">📝 Note: {order.notes}</p>}
                      <p className="text-sm text-gray-500">🕒 {formatDate(order.created_at)}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">
                            📋 Order #{order.order_number || order.id}
                          </span>
                          <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">
                            📊 Status: {order.status || 'Pending'}
                          </span>
                          {order.items && (
                            <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full font-medium">
                              🛒 {order.items.length} Items
                            </span>
                          )}
                          {order.delivery_fee && (
                            <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full font-medium">
                              🚚 Delivery: NPR {order.delivery_fee}/-
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => handleDeleteOrder(order.id, order.order_number || order.id)}
                          className="bg-red-500 text-white text-xs px-3 py-1 rounded hover:bg-red-600 transition-colors"
                          title="Delete Order"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-600">
                        NPR {getTotalOrderValue(order.items, order.total)}/-
                      </div>
                      <button
                        onClick={() => handleCompleteDeliveryOrder(order.id)}
                        className="mt-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Mark Complete
                      </button>
                    </div>
                  </div>
                  
                  <div className="border-t pt-4">
                    <h4 className="font-semibold mb-2">Order Items:</h4>
                    <div className="space-y-2">
                      {order.items.map((item, index) => (
                        <div key={index} className="flex justify-between items-center py-1">
                          <div className="flex items-center">
                            <span className="font-medium">{item.name}</span>
                            {item.isCustom && (
                              <span className="ml-2 bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                                Custom
                              </span>
                            )}
                          </div>
                          <div className="text-right">
                            <span className="text-gray-600">Qty: {item.quantity}</span>
                            {!item.isCustom && (
                              <span className="ml-4 font-semibold">
                                NPR {(item.price * item.quantity)}/-
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}


      {/* Database Manager Tab */}
      {activeTab === 'database' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-red-600 mb-2">🗄️ Database Manager</h2>
              <p className="text-gray-600">Manage and clear test data from the Food Zone database</p>
            </div>
            <div className="p-6 space-y-6">
              {/* Database Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">📊 Database Summary</h3>
                {dbSummary ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="bg-white p-3 rounded-lg border">
                      <div className="text-2xl font-bold text-blue-600">{dbSummary.customers}</div>
                      <div className="text-sm text-gray-600">Customers</div>
                    </div>
                    <div className="bg-white p-3 rounded-lg border">
                      <div className="text-2xl font-bold text-green-600">{dbSummary.totalOrders}</div>
                      <div className="text-sm text-gray-600">Total Orders</div>
                    </div>
                    <div className="bg-white p-3 rounded-lg border">
                      <div className="text-2xl font-bold text-purple-600">{dbSummary.orderItems}</div>
                      <div className="text-sm text-gray-600">Order Items</div>
                    </div>
                    <div className="bg-white p-3 rounded-lg border">
                      <div className="text-2xl font-bold text-orange-600">{dbSummary.addresses}</div>
                      <div className="text-sm text-gray-600">Addresses</div>
                    </div>
                    <div className="bg-white p-3 rounded-lg border">
                      <div className="text-2xl font-bold text-gray-600">{dbSummary.completedOrders}</div>
                      <div className="text-sm text-gray-600">Completed</div>
                    </div>
                    <div className="bg-white p-3 rounded-lg border">
                      <div className="text-2xl font-bold text-yellow-600">{dbSummary.activeOrders}</div>
                      <div className="text-sm text-gray-600">Active</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-500">Loading database summary...</div>
                )}
                <button
                  onClick={fetchDatabaseSummary}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  🔄 Refresh Summary
                </button>
              </div>


              {/* Information */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-lg font-medium text-blue-800 mb-2">ℹ️ Database Information</h3>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• Database stores all restaurant orders and customer data</li>
                  <li>• Orders are automatically moved to history when tables are cleared</li>
                  <li>• Database maintains data integrity and order tracking</li>
                  <li>• All order information is preserved for reporting</li>
                  <li>• Database is used for analytics and insights</li>
                  <li>• Database is secure and compliant with data protection regulations</li>
                </ul>
              </div>
            </div>
          </div>
        )}

      {/* Order History Tab */}
      {activeTab === 'history' && (
        <>
          {isLoadingHistory ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4 animate-spin">⏳</div>
              <h2 className="text-2xl font-semibold text-gray-600 mb-2">Loading Order History...</h2>
              <p className="text-gray-500">Please wait while we fetch completed orders</p>
            </div>
          ) : orderHistory.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📜</div>
              <h2 className="text-2xl font-semibold text-gray-600 mb-2">No Order History</h2>
              <p className="text-gray-500">Completed orders will appear here</p>
            </div>
          ) : (
            <div className="space-y-6">
              {orderHistory.map(order => (
                <div key={order.id} className="bg-gray-50 rounded-lg shadow-md p-6 border-l-4 border-green-500">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-semibold">
                        {order.order_type === 'delivery' ? '🚚 Delivery Order' : `🍽️ Table ${order.table_id}`}
                      </h3>
                      <p className="text-gray-600">👤 {order.customer_name} • 📞 {order.customer_phone}</p>
                      {order.order_type === 'delivery' && order.delivery_address && (
                        <div className="flex items-center space-x-2">
                          <p className="text-sm text-gray-600">📍 {order.delivery_address}</p>
                          {(order.latitude && order.longitude) && (
                            <button
                              onClick={() => openInGoogleMaps(order.latitude, order.longitude)}
                              className="bg-blue-500 text-white text-xs px-2 py-1 rounded hover:bg-blue-600 transition-colors"
                              title="Search coordinates on Google"
                            >
                              📍 Location
                            </button>
                          )}
                        </div>
                      )}
                      {order.order_type === 'delivery' && (order.latitude && order.longitude) && (
                        <div className="flex items-center space-x-2">
                          <p className="text-xs text-blue-600">📍 GPS: {order.latitude}, {order.longitude}</p>
                          <button
                            onClick={() => openInGoogleMaps(order.latitude, order.longitude)}
                            className="bg-blue-500 text-white text-xs px-2 py-1 rounded hover:bg-blue-600 transition-colors"
                            title="Open GPS coordinates in Google Maps"
                          >
                            🗺️ Maps
                          </button>
                        </div>
                      )}
                      <p className="text-sm text-gray-500">🕒 Ordered: {formatDate(order.created_at)}</p>
                      <p className="text-sm text-green-600 font-medium">✅ Completed: {formatDate(order.completed_at)}</p>
                      <div className="mt-2 flex items-center space-x-4">
                        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">
                          📋 Order #{order.order_number || order.id}
                        </span>
                        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">
                          📊 {order.order_type === 'delivery' ? 'Delivery' : 'Dine-in'}
                        </span>
                        {order.items && (
                          <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full font-medium">
                            🛒 {order.items.length} Items
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-600">
                        NPR {getTotalOrderValue(order.items, order.total)}/-
                      </div>
                      <div className="flex items-center space-x-2 mt-2">
                        <span className="inline-block bg-green-100 text-green-800 text-sm px-3 py-1 rounded-full">
                          Completed
                        </span>
                        <button
                          onClick={() => handleDeleteOrder(order.id, order.order_number)}
                          className="bg-red-500 hover:bg-red-600 text-white text-sm px-3 py-1 rounded-full transition-colors"
                          title="Delete this order"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="border-t pt-4">
                    <h4 className="font-semibold mb-2">Order Items:</h4>
                    <div className="space-y-2">
                      {order.items.map((item, index) => (
                        <div key={index} className="flex justify-between items-center py-1">
                          <div className="flex items-center">
                            <span className="font-medium">{item.name}</span>
                            {item.isCustom && (
                              <span className="ml-2 bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                                Custom
                              </span>
                            )}
                          </div>
                          <div className="text-right">
                            <span className="text-gray-600">Qty: {item.quantity}</span>
                            {!item.isCustom && (
                              <span className="ml-4 font-semibold">
                                NPR {(item.price * item.quantity)}/-
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}


      {/* Customer Database Tab */}
      {activeTab === 'customers' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">👥 Customer Database</h2>
            <p className="text-gray-600">{customers.length} Total Customers</p>
          </div>
          <div className="overflow-x-auto">
            {customers.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">👥</div>
                <h3 className="text-xl font-semibold text-gray-600 mb-2">No Customers Yet</h3>
                <p className="text-gray-500">Customer data will appear here as orders are placed</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Orders</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Spent</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Order</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {customers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                        {customer.email && (
                          <div className="text-sm text-gray-500">{customer.email}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {customer.phone}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {customer.actual_order_count || customer.total_orders}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        NPR {parseFloat(customer.total_spent).toFixed(2)}/-
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {customer.last_order_date ? new Date(customer.last_order_date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <AdminSettings />
        </div>
      )}

        </div>
      </div>
    </>
  );
};

export default Admin;
