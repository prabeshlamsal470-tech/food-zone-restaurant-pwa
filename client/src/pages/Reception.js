import React, { useState, useEffect } from 'react';
import { fetchApi, getSocketUrl } from '../services/apiService';
import io from 'socket.io-client';
import PushNotificationManager from '../utils/pushNotifications';
import OfflineStorageManager from '../utils/offlineStorage';

const Reception = () => {
  const [completedOrders, setCompletedOrders] = useState([]);
  const [activeOrders, setActiveOrders] = useState([]);
  const [tableStatuses, setTableStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active'); // 'active', 'completed' or 'tables'
  // const [socket, setSocket] = useState(null);
  const [clearingTable, setClearingTable] = useState(null);
  const [pushManager, setPushManager] = useState(null);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [offlineStorage, setOfflineStorage] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [installPrompt, setInstallPrompt] = useState(null);

  useEffect(() => {
    fetchAllOrders();
    fetchTableStatuses();
    initializePWA();
    initializeOfflineStorage();
    
    // Initialize socket connection
    const newSocket = io(getSocketUrl());
    // setSocket(newSocket);
    
    newSocket.on('connect', () => {
      console.log('🏨 Reception connected to server');
    });
    
    newSocket.on('orderStatusUpdated', (data) => {
      fetchAllOrders();
    });
    
    newSocket.on('newOrder', () => {
      fetchAllOrders();
    });
    
    newSocket.on('tableCleared', () => {
      fetchTableStatuses();
    });
    
    // PWA install prompt listener
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    // Online/offline listeners
    const handleOnline = () => {
      setIsOnline(true);
      if (offlineStorage) {
        offlineStorage.syncPendingActions(fetchApi);
      }
    };
    
    const handleOffline = () => {
      setIsOnline(false);
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [offlineStorage]);

  const fetchAllOrders = async () => {
    try {
      const data = await fetchApi.get('/api/orders');
      // Filter for today's orders only
      const today = new Date().toDateString();
      const todayOrders = data.filter(order => 
        new Date(order.created_at).toDateString() === today
      );
      
      // Separate active and completed orders
      const active = todayOrders.filter(order => 
        ['pending', 'preparing', 'ready'].includes(order.status)
      );
      const completed = todayOrders.filter(order => 
        order.status === 'completed'
      );
      
      setActiveOrders(active);
      setCompletedOrders(completed);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const fetchTableStatuses = async () => {
    try {
      const data = await fetchApi.get('/api/tables/status');
      setTableStatuses(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching table statuses:', error);
      setLoading(false);
    }
  };

  // Initialize PWA features
  const initializePWA = async () => {
    try {
      const manager = new PushNotificationManager();
      setPushManager(manager);
      
      if (manager.isSupported()) {
        const initialized = await manager.initialize();
        setPushEnabled(initialized);
        console.log(initialized ? 'Reception PWA: Push notifications enabled' : 'Reception PWA: Local notifications only');
      }
    } catch (error) {
      console.error('Reception PWA initialization failed:', error);
    }
  };

  // Initialize offline storage
  const initializeOfflineStorage = async () => {
    try {
      const storage = new OfflineStorageManager();
      await storage.init();
      setOfflineStorage(storage);
    } catch (error) {
      console.error('Reception offline storage initialization failed:', error);
    }
  };

  // Install PWA
  const handleInstallPWA = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      console.log(`Reception PWA install: ${outcome}`);
      setInstallPrompt(null);
    }
  };

  // Toggle push notifications
  const togglePushNotifications = async () => {
    if (!pushManager) return;
    
    if (pushEnabled) {
      await pushManager.unsubscribe();
      setPushEnabled(false);
    } else {
      const initialized = await pushManager.initialize();
      setPushEnabled(initialized);
    }
  };

  const handleClearTable = async (tableId) => {
    setClearingTable(tableId);
    try {
      if (isOnline) {
        await fetchApi.post(`/api/clear-table/${tableId}`);
      } else if (offlineStorage) {
        await offlineStorage.storePendingAction({
          type: 'CLEAR_TABLE',
          tableId
        });
      }
      await fetchTableStatuses();
      console.log(`✅ Table ${tableId} cleared successfully`);
    } catch (error) {
      console.error('Error clearing table:', error);
    } finally {
      setClearingTable(null);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatCurrency = (amount) => {
    return `NPR ${parseFloat(amount || 0).toFixed(2)}`;
  };

  const getOrderStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'preparing': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'ready': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTableStatusColor = (status) => {
    switch (status) {
      case 'available': return 'bg-green-100 border-green-300 text-green-800';
      case 'occupied': return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      case 'ordering': return 'bg-blue-100 border-blue-300 text-blue-800';
      case 'dining': return 'bg-purple-100 border-purple-300 text-purple-800';
      case 'payment_pending': return 'bg-orange-100 border-orange-300 text-orange-800';
      case 'completed': return 'bg-gray-100 border-gray-300 text-gray-800';
      default: return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  const getTableStatusIcon = (status) => {
    switch (status) {
      case 'available': return '✅';
      case 'occupied': return '🟡';
      case 'ordering': return '📝';
      case 'dining': return '🍽️';
      case 'payment_pending': return '💳';
      case 'completed': return '🏁';
      default: return '❓';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading reception data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">🏨</span>
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Reception Desk</h1>
                <p className="text-sm text-gray-500">Food Zone Restaurant Management</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {/* PWA Controls */}
              <div className="flex items-center space-x-2">
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
                
                {/* Install PWA Button */}
                {installPrompt && (
                  <button
                    onClick={handleInstallPWA}
                    className="flex items-center space-x-1 px-3 py-1 rounded-lg text-xs font-medium bg-purple-100 text-purple-800 hover:bg-purple-200 transition-all duration-200"
                  >
                    <span>📱</span>
                    <span>Install App</span>
                  </button>
                )}
              </div>
              
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {new Date().toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date().toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('active')}
              className={`flex-1 flex items-center justify-center px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                activeTab === 'active'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <span className="mr-2">🔥</span>
              Active Orders
              {activeOrders.length > 0 && (
                <span className={`ml-2 px-2 py-1 rounded-full text-xs font-bold ${
                  activeTab === 'active' ? 'bg-white text-blue-600' : 'bg-blue-600 text-white'
                }`}>
                  {activeOrders.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`flex-1 flex items-center justify-center px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                activeTab === 'completed'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <span className="mr-2">✅</span>
              Completed Orders
              {completedOrders.length > 0 && (
                <span className={`ml-2 px-2 py-1 rounded-full text-xs font-bold ${
                  activeTab === 'completed' ? 'bg-white text-blue-600' : 'bg-blue-600 text-white'
                }`}>
                  {completedOrders.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('tables')}
              className={`flex-1 flex items-center justify-center px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                activeTab === 'tables'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <span className="mr-2">🪑</span>
              Tables & Reservations
              {tableStatuses.filter(t => t.status !== 'available').length > 0 && (
                <span className={`ml-2 px-2 py-1 rounded-full text-xs font-bold ${
                  activeTab === 'tables' ? 'bg-white text-blue-600' : 'bg-blue-600 text-white'
                }`}>
                  {tableStatuses.filter(t => t.status !== 'available').length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Active Orders Tab */}
        {activeTab === 'active' && (
          <div className="space-y-6">
            {activeOrders.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
                <div className="text-6xl mb-4">🔥</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Active Orders</h3>
                <p className="text-gray-500">Active orders will appear here as they come in</p>
              </div>
            ) : (
              <div className="grid gap-6">
                {activeOrders.map((order) => (
                  <div key={order.id} className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden">
                    <div className={`px-6 py-4 ${
                      order.status === 'pending' ? 'bg-gradient-to-r from-yellow-500 to-amber-600' :
                      order.status === 'preparing' ? 'bg-gradient-to-r from-blue-500 to-blue-600' :
                      'bg-gradient-to-r from-orange-500 to-orange-600'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold">
                              {order.order_type === 'dine-in' ? '🍽️' : '🚚'}
                            </span>
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-white">
                              {order.order_type === 'dine-in' ? `Table ${order.table_id}` : 'Delivery Order'}
                            </h3>
                            <p className="text-white text-opacity-90 text-sm">Order #{order.order_number || order.id}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="bg-white bg-opacity-20 px-3 py-1 rounded-full mb-2">
                            <span className="text-white font-bold text-lg">{formatCurrency(order.total)}</span>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getOrderStatusColor(order.status)}`}>
                            {order.status.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-6">
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                            <span className="mr-2">👤</span>
                            Customer Details
                          </h4>
                          <div className="space-y-2 text-sm">
                            <p><span className="font-medium">Name:</span> {order.customer_name}</p>
                            <p><span className="font-medium">Phone:</span> {order.customer_phone}</p>
                            {order.delivery_address && (
                              <p><span className="font-medium">Address:</span> {order.delivery_address}</p>
                            )}
                            <p><span className="font-medium">Ordered:</span> {formatDate(order.created_at)}</p>
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                            <span className="mr-2">🍽️</span>
                            Order Items
                          </h4>
                          <div className="space-y-2 max-h-32 overflow-y-auto">
                            {order.items && order.items.map((item, index) => (
                              <div key={index} className="flex justify-between text-sm bg-gray-50 rounded-lg p-2">
                                <span>{item.menu_item_name} x{item.quantity}</span>
                                <span className="font-medium">{formatCurrency(item.subtotal)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getOrderStatusColor(order.status)}`}>
                              {order.status === 'pending' && '⏳ Pending'}
                              {order.status === 'preparing' && '🔥 Preparing'}
                              {order.status === 'ready' && '🍽️ Ready'}
                            </span>
                            {order.payment_method && (
                              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                                💳 {order.payment_method}
                              </span>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-500">Total Amount</p>
                            <p className="text-lg font-bold text-gray-900">{formatCurrency(order.total)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Completed Orders Tab */}
        {activeTab === 'completed' && (
          <div className="space-y-6">
            {completedOrders.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
                <div className="text-6xl mb-4">🎉</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Completed Orders Today</h3>
                <p className="text-gray-500">Completed orders will appear here for today's service</p>
              </div>
            ) : (
              <div className="grid gap-6">
                {completedOrders.map((order) => (
                  <div key={order.id} className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden">
                    <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold">
                              {order.order_type === 'dine-in' ? '🍽️' : '🚚'}
                            </span>
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-white">
                              {order.order_type === 'dine-in' ? `Table ${order.table_id}` : 'Delivery Order'}
                            </h3>
                            <p className="text-green-100 text-sm">Order #{order.order_number || order.id}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="bg-white bg-opacity-20 px-3 py-1 rounded-full">
                            <span className="text-white font-bold text-lg">{formatCurrency(order.total)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-6">
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                            <span className="mr-2">👤</span>
                            Customer Details
                          </h4>
                          <div className="space-y-2 text-sm">
                            <p><span className="font-medium">Name:</span> {order.customer_name}</p>
                            <p><span className="font-medium">Phone:</span> {order.customer_phone}</p>
                            {order.delivery_address && (
                              <p><span className="font-medium">Address:</span> {order.delivery_address}</p>
                            )}
                            <p><span className="font-medium">Completed:</span> {formatDate(order.created_at)}</p>
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                            <span className="mr-2">🍽️</span>
                            Order Items
                          </h4>
                          <div className="space-y-2 max-h-32 overflow-y-auto">
                            {order.items && order.items.map((item, index) => (
                              <div key={index} className="flex justify-between text-sm bg-gray-50 rounded-lg p-2">
                                <span>{item.menu_item_name} x{item.quantity}</span>
                                <span className="font-medium">{formatCurrency(item.subtotal)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                              ✅ Completed
                            </span>
                            {order.payment_method && (
                              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                                💳 {order.payment_method}
                              </span>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-500">Total Amount</p>
                            <p className="text-lg font-bold text-gray-900">{formatCurrency(order.total)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tables & Reservations Tab */}
        {activeTab === 'tables' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Table Status Overview</h2>
                <div className="flex items-center space-x-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span>Available</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <span>Occupied</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span>Ordering</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                    <span>Dining</span>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {Array.from({ length: 25 }, (_, i) => i + 1).map((tableNumber) => {
                  const tableStatus = tableStatuses.find(t => t.table_id === tableNumber) || { status: 'available' };
                  const isClearing = clearingTable === tableNumber;
                  
                  return (
                    <div
                      key={tableNumber}
                      className={`relative border-2 rounded-xl p-4 text-center transition-all duration-200 hover:shadow-md ${getTableStatusColor(tableStatus.status)}`}
                    >
                      <div className="text-2xl mb-2">{getTableStatusIcon(tableStatus.status)}</div>
                      <div className="font-bold text-lg mb-1">Table {tableNumber}</div>
                      <div className="text-xs capitalize mb-3">{tableStatus.status.replace('_', ' ')}</div>
                      
                      {tableStatus.customer_name && (
                        <div className="text-xs mb-2">
                          <p className="font-medium">{tableStatus.customer_name}</p>
                          {tableStatus.total_amount > 0 && (
                            <p className="text-gray-600">{formatCurrency(tableStatus.total_amount)}</p>
                          )}
                        </div>
                      )}
                      
                      {tableStatus.status !== 'available' && (
                        <button
                          onClick={() => handleClearTable(tableNumber)}
                          disabled={isClearing}
                          className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-xs py-2 px-3 rounded-lg font-medium transition-colors duration-200"
                        >
                          {isClearing ? (
                            <span className="flex items-center justify-center">
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                              Clearing...
                            </span>
                          ) : (
                            '🧹 Clear Table'
                          )}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reception;
