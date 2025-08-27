import React, { useState, useEffect } from 'react';
import { fetchApi, getSocketUrl } from '../services/apiService';
import io from 'socket.io-client';
import PushNotificationManager from '../utils/pushNotifications';
import OfflineStorageManager from '../utils/offlineStorage';
import audioAlertManager from '../utils/audioAlerts';

const StaffDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [pushManager, setPushManager] = useState(null);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [offlineStorage, setOfflineStorage] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    fetchOrders();
    initializeOfflineStorage();
    initializePWA();
    
    const newSocket = io(getSocketUrl(), {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      reconnection: true,
      reconnectionAttempts: Infinity, // Keep trying to reconnect for kitchen staff
      reconnectionDelayMax: 5000,
      forceNew: true,
    });
    
    setSocket(newSocket);
    
    newSocket.on('connect', () => {
      console.log('🍳 Kitchen connected to server');
      setIsOnline(true);
      
      // Register for kitchen-specific events
      newSocket.emit('join-kitchen', { role: 'kitchen-staff' });
    });
    
    newSocket.on('disconnect', (reason) => {
      console.log('🍳 Kitchen disconnected:', reason);
      setIsOnline(false);
      
      // Auto-reconnect for kitchen operations
      if (reason === 'io server disconnect') {
        newSocket.connect();
      }
    });

    newSocket.on('connect_error', (error) => {
      console.error('Kitchen connection error:', error);
      setIsOnline(false);
    });
    
    // Handle service worker keep-alive pings
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'KEEP_ALIVE_PING') {
          // Respond to keep-alive and check socket status
          if (!newSocket.connected) {
            console.log('🔄 Reconnecting socket due to keep-alive check');
            newSocket.connect();
          }
        } else if (event.data.type === 'BACKGROUND_ORDERS_UPDATE') {
          // Update orders from background sync
          setOrders(event.data.orders);
          console.log('📡 Orders updated from background sync');
        }
      });
    }
    
    // Socket event listeners
    newSocket.on('newOrder', (order) => {
      console.log('📨 New order received via socket:', order);
      
      // Force immediate order update without date filtering for real-time updates
      setOrders(prevOrders => {
        // Check if order already exists to prevent duplicates
        const existingOrder = prevOrders.find(o => o.id === order.id);
        if (existingOrder) {
          return prevOrders;
        }
        return [order, ...prevOrders];
      });
      
      // Log new order (no UI notification)
      const orderInfo = `${order.order_type === 'dine-in' ? `Table ${order.table_id}` : 'Delivery'} - NPR ${order.total_amount || 'N/A'}`;
      console.log('New Order Received:', orderInfo);
      
      // Play triple bell alert with user interaction check
      if (audioEnabled) {
        // Ensure audio context is initialized with user interaction
        audioAlertManager.init().then(() => {
          audioAlertManager.playNotificationAlert();
        }).catch(error => {
          console.warn('Audio alert initialization failed:', error);
          // Fallback to kitchen alarm audio
          audioAlertManager.playKitchenAlarmFile('/sounds/kitchen-alarm.mp3', 5);
        });
      }
      
      // Send push notification that works on lock screen
      if (pushManager && pushEnabled) {
        pushManager.showLocalNotification('🍽️ Food Zone - New Order!', {
          body: orderInfo,
          tag: 'new-order',
          requireInteraction: true,
          vibrate: [200, 100, 200, 100, 200],
          actions: [
            { action: 'view', title: 'View Order' },
            { action: 'dismiss', title: 'Dismiss' }
          ]
        });
      }
      
      // Send message to service worker for background notifications and lock screen alerts
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'NEW_ORDER',
          orderType: order.order_type,
          tableId: order.table_id,
          totalAmount: order.total_amount,
          orderInfo: orderInfo
        });
      }
      
      // Force service worker notification for lock screen
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        navigator.serviceWorker.ready.then(registration => {
          registration.showNotification('🍽️ Food Zone - New Order!', {
            body: orderInfo,
            icon: '/icon-192x192.png',
            badge: '/icon-192x192.png',
            vibrate: [400, 200, 400, 200, 400, 200, 400],
            requireInteraction: true,
            silent: false,
            tag: 'food-zone-order-' + Date.now(),
            renotify: true,
            actions: [
              { action: 'view', title: 'View Order' },
              { action: 'dismiss', title: 'Dismiss' }
            ]
          });
        });
      }
    });

    newSocket.on('orderStatusUpdated', ({ orderId, status }) => {
      console.log('📝 Order status updated via socket:', orderId, status);
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId ? { ...order, status } : order
        )
      );
    });
    
    // Request notification permission and initialize audio on load
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    
    // Initialize audio alert manager with user interaction
    const initializeAudio = async () => {
      try {
        await audioAlertManager.requestPermissions();
        console.log('Audio alerts initialized successfully');
      } catch (error) {
        console.warn('Audio initialization failed:', error);
      }
    };
    
    // Add click listener to initialize audio on first user interaction
    const handleFirstClick = async () => {
      await initializeAudio();
      document.removeEventListener('click', handleFirstClick);
    };
    
    document.addEventListener('click', handleFirstClick);
    
    // Online/offline event listeners - silent handling
    const handleOnline = () => {
      setIsOnline(true);
      console.log('Connection restored - syncing data');
      if (offlineStorage) {
        offlineStorage.syncPendingActions(fetchApi);
      }
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      console.log('Connection lost - working offline');
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      console.log('🧹 Cleaning up socket connection');
      newSocket.disconnect();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [audioEnabled, offlineStorage, pushEnabled, pushManager]);

  const fetchOrders = async () => {
    try {
      const response = await fetchApi.get('/api/orders');
      console.log('Staff Dashboard - API Response:', response);
      const allOrders = Array.isArray(response.data) ? response.data : response || [];
      console.log('Staff Dashboard - All Orders:', allOrders);
      
      // Filter orders to only show today's orders
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
      
      const todaysOrders = allOrders.filter(order => {
        const orderDate = new Date(order.created_at);
        return orderDate >= todayStart && orderDate < todayEnd;
      });
      
      setOrders(todaysOrders);
    } catch (error) {
      console.error('Error fetching orders:', error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
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

  // Initialize PWA features silently
  const initializePWA = async () => {
    try {
      const manager = new PushNotificationManager();
      setPushManager(manager);
      
      if (manager.isSupported()) {
        const initialized = await manager.initialize();
        setPushEnabled(initialized);
        
        // Silent initialization - no notifications shown
        console.log(initialized ? 'PWA Ready: Push notifications enabled' : 'PWA Setup: Local notifications only');
      }
    } catch (error) {
      console.error('PWA initialization failed:', error);
      // Silent error handling - no notification shown
    }
  };

  // Toggle push notifications
  const togglePushNotifications = async () => {
    if (!pushManager) return;
    
    if (pushEnabled) {
      await pushManager.unsubscribe();
      setPushEnabled(false);
      console.log('Push notifications disabled');
    } else {
      const initialized = await pushManager.initialize();
      setPushEnabled(initialized);
      console.log(`Push notifications ${initialized ? 'enabled' : 'failed to enable'}`);
    } 
  };

  // Notification functions (commented out to avoid unused variable warnings)
  // const showNotification = (title, message, type = 'info') => {
  //   const notification = {
  //     id: Date.now(),
  //     title,
  //     message,
  //     type,
  //     timestamp: new Date()
  //   };
  //   
  //   setNotifications(prev => [notification, ...prev.slice(0, 4)]); // Keep only 5 notifications
  //   
  //   // Auto-remove after 5 seconds
  //   setTimeout(() => {
  //     setNotifications(prev => prev.filter(n => n.id !== notification.id));
  //   }, 5000);
  // };

  // const removeNotification = (id) => {
  //   setNotifications(prev => prev.filter(n => n.id !== id));
  // };

  // Toggle audio alerts with test sound
  const toggleAudioAlerts = async () => {
    const newState = !audioEnabled;
    setAudioEnabled(newState);
    audioAlertManager.setEnabled(newState);
    
    // Test the audio when enabling
    if (newState) {
      try {
        await audioAlertManager.init();
        await audioAlertManager.playNotificationAlert();
        console.log('Audio alerts enabled and tested');
      } catch (error) {
        console.warn('Audio test failed:', error);
        // Try fallback kitchen alarm
        audioAlertManager.playKitchenAlarmFile('/sounds/kitchen-alarm.mp3', 5);
      }
    } else {
      console.log('Audio alerts disabled');
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      if (isOnline) {
        await fetchApi.put(`/api/orders/${orderId}/status`, { status: newStatus });
      } else {
        if (offlineStorage) {
          await offlineStorage.storePendingAction({
            type: 'UPDATE_ORDER_STATUS',
            orderId,
            status: newStatus
          });
        }
      }
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId ? { ...order, status: newStatus } : order
        )
      );
      const statusMessages = {
        'preparing': 'Order started preparing',
        'ready': 'Order is ready for pickup',
        'completed': 'Order completed'
      };
      if (statusMessages[newStatus]) {
        const message = isOnline ? statusMessages[newStatus] : `${statusMessages[newStatus]} (will sync when online)`;
        console.log('Status Updated:', message);
      }
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'preparing': return 'bg-blue-100 text-blue-800';
      case 'ready': return 'bg-orange-100 text-orange-800';
      case 'completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredOrders = Array.isArray(orders) ? orders.filter(order => {
    return order.status === filter;
  }) : [];
  const activeOrders = Array.isArray(orders) ? orders.filter(order => ['pending', 'preparing', 'ready', 'completed'].includes(order.status)) : [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`max-w-sm w-full bg-white shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden transform transition-all duration-300 ${
              notification.type === 'success' ? 'border-l-4 border-green-400' :
              notification.type === 'error' ? 'border-l-4 border-red-400' :
              'border-l-4 border-blue-400'
            }`}
          >
            <div className="p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  {notification.type === 'success' && <span className="text-green-400 text-xl">🎉</span>}
                  {notification.type === 'error' && <span className="text-red-400 text-xl">⚠️</span>}
                  {notification.type === 'info' && <span className="text-blue-400 text-xl">ℹ️</span>}
                </div>
                <div className="ml-3 w-0 flex-1 pt-0.5">
                  <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                  <p className="mt-1 text-sm text-gray-500">{notification.message}</p>
                  <p className="mt-1 text-xs text-gray-400">
                    {notification.timestamp.toLocaleTimeString()}
                  </p>
                </div>
                <div className="ml-4 flex-shrink-0 flex">
                  <button
                    className="bg-white rounded-md inline-flex text-gray-400 hover:text-gray-500"
                    onClick={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}
                  >
                    <span className="sr-only">Close</span>
                    <span className="text-lg">×</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between py-4 sm:h-16 space-y-3 sm:space-y-0">
            <div className="flex flex-col sm:flex-row sm:items-center">
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Food Zone - Staff Dashboard</h1>
              <div className="flex items-center space-x-2 mt-1 sm:mt-0 sm:ml-4">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Today Only
                </span>
                <span className="text-xs sm:text-sm text-gray-500">
                  {activeOrders.length} active orders
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {/* Connection Status */}
              <div className={`flex items-center space-x-1 px-3 py-1 rounded-lg text-xs font-medium ${
                isOnline 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                <span>{isOnline ? '🟢' : '🔴'}</span>
                <span>{isOnline ? 'Online' : 'Offline'}</span>
              </div>
              
              {/* Push Notifications Toggle */}
              <button
                onClick={togglePushNotifications}
                className={`flex items-center space-x-1 px-3 py-1 rounded-lg text-xs font-medium transition-all duration-200 ${
                  pushEnabled 
                    ? 'bg-blue-100 text-blue-800 hover:bg-blue-200' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <span>{pushEnabled ? '📱' : '📵'}</span>
                <span>{pushEnabled ? 'Push On' : 'Push Off'}</span>
              </button>
              
              {/* Audio Toggle */}
              <button
                onClick={toggleAudioAlerts}
                className={`px-3 py-2 rounded-lg transition-colors font-medium ${
                  audioEnabled
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-gray-300 hover:bg-gray-400 text-gray-700'
                }`}
                title={audioEnabled ? 'Disable Kitchen Alarm' : 'Enable Kitchen Alarm'}
              >
                {audioEnabled ? '🚨 Alarm On' : '🔇 Alarm Off'}
              </button>
              
              <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-500">
                <span>📅</span>
                <div className="text-right">
                  {new Date().toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filter Tabs */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg sm:text-xl font-semibold">Order Management</h2>
            <div className="text-sm text-gray-500">
              Today's Orders
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'pending', label: 'Pending', count: Array.isArray(orders) ? orders.filter(o => o.status === 'pending').length : 0 },
              { key: 'preparing', label: 'Preparing', count: Array.isArray(orders) ? orders.filter(o => o.status === 'preparing').length : 0 },
              { key: 'ready', label: 'Ready', count: Array.isArray(orders) ? orders.filter(o => o.status === 'ready').length : 0 },
              { key: 'completed', label: 'Completed', count: Array.isArray(orders) ? orders.filter(o => o.status === 'completed').length : 0 }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`flex items-center px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 ${
                  filter === tab.key
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:shadow-sm'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold ${
                    filter === tab.key
                      ? 'bg-white text-blue-600'
                      : 'bg-blue-600 text-white'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Orders Grid */}
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-4xl sm:text-6xl mb-4">📋</div>
            <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">No orders found</h3>
            <p className="text-sm sm:text-base text-gray-500">
              {`No ${filter} orders at the moment.`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <div key={order.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow bg-white">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {order.order_type === 'dine-in' ? `Table ${order.table_id}` : 'Delivery Order'}
                        </h3>
                        {order.order_type === 'delivery' ? (
                          <>
                            <p className="text-sm text-gray-500"><strong>Customer:</strong> {order.customer_name || 'N/A'} • {order.customer_phone || 'N/A'}</p>
                            <p className="text-sm text-gray-500"><strong>Address:</strong> {order.delivery_address || 'N/A'}</p>
                            {order.delivery_latitude && order.delivery_longitude && (
                              <p className="text-sm text-gray-500">
                                📍 <strong>GPS:</strong> {order.delivery_latitude}, {order.delivery_longitude}
                              </p>
                            )}
                            {order.notes && (
                              <p className="text-sm text-gray-500">
                                📝 <strong>Instructions:</strong> {order.notes}
                              </p>
                            )}
                          </>
                        ) : (
                          <p className="text-sm text-gray-500"><strong>Customer:</strong> {order.customer_name || 'N/A'} • {order.customer_phone || 'N/A'}</p>
                        )}
                        <p className="text-xs text-gray-500">
                          {new Date(order.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    
                    {/* Order Items */}
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm font-medium text-gray-700 mb-2">Items:</p>
                      <div className="space-y-1">
                        {order.items?.map((item, index) => (
                          <div key={index} className="flex justify-between text-sm">
                            <span>{item.quantity}x {item.name}</span>
                            <span>NPR {item.price * item.quantity}</span>
                          </div>
                        )) || <p className="text-sm text-gray-500">No items listed</p>}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end space-y-2">
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">
                        NPR {order.total_amount || (order.items?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || 0)}
                      </p>
                      <div className="flex flex-col space-y-1">
                        <span className={`px-3 py-1 text-sm rounded-full ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </div>
                    </div>
                    
                    {/* Status Update Buttons */}
                    <div className="flex flex-col space-y-2">
                      <div className="flex space-x-2">
                        {order.status === 'pending' && (
                          <button
                            onClick={() => updateOrderStatus(order.id, 'preparing')}
                            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-sm"
                          >
                            🔥 Start Preparing
                          </button>
                        )}
                        
                        {order.status === 'preparing' && (
                          <button
                            onClick={() => updateOrderStatus(order.id, 'ready')}
                            className="px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 transition-colors duration-200 shadow-sm"
                          >
                            ✅ Mark Ready
                          </button>
                        )}
                        
                        {order.status === 'ready' && (
                          <button
                            onClick={() => updateOrderStatus(order.id, 'completed')}
                            className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors duration-200 shadow-sm"
                          >
                            📋 Mark Completed
                          </button>
                        )}
                        
                        {order.status === 'completed' && (
                          <div className="px-4 py-2 bg-green-100 text-green-800 text-sm font-medium rounded-lg border border-green-200">
                            ✅ Completed
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StaffDashboard;
