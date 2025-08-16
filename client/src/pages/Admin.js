import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import DeliveryMap from '../components/DeliveryMap';
import audioManager from '../utils/audioNotifications';
// import { pwaInstaller } from '../utils/pwaInstaller';
import AdminSettings from '../components/AdminSettings';
import DatabaseManager from '../components/DatabaseManager';
import { apiService, fetchApi, getSocketUrl } from '../services/apiService';

const Admin = () => {
  const [orders, setOrders] = useState([]);
  const [orderHistory, setOrderHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dbSummary, setDbSummary] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    // Check localStorage for existing authentication
    return localStorage.getItem('adminAuthenticated') === 'true';
  });
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Admin password from environment variables
  const ADMIN_PASSWORD = process.env.REACT_APP_ADMIN_PASSWORD || 'FoodZone2024!';
  const [, setSocket] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [tableToDelete, setTableToDelete] = useState(null);
  const [activeTab, setActiveTab] = useState('dine-in'); // 'dine-in', 'delivery', 'history', 'map', or 'settings'

  useEffect(() => {
    fetchOrders();
    fetchOrderHistory();
    fetchDatabaseSummary();

    // Initialize audio notifications
    audioManager.requestPermissions();

    // Socket connection for real-time updates
    const newSocket = io(getSocketUrl());
    setSocket(newSocket);
    
    newSocket.on('newOrder', (order) => {
      console.log('📨 New order received:', order);
      setOrders(prevOrders => [...prevOrders, order]);
      
      // Play notification sound based on order type
      if (order.order_type === 'delivery') {
        audioManager.playDeliveryOrderSound();
      } else {
        audioManager.playTableOrderSound();
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

    return () => {
      newSocket.close();
    };
  }, []);

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
      const data = await fetchApi.get('/api/order-history');
      setOrderHistory(data);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching order history:', err);
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
    if (window.confirm('Mark this delivery order as complete?')) {
      try {
        // Update order status in database
        await apiService.updateOrderStatus(orderId, 'completed');

        // Refresh orders from database to get updated state
        await fetchOrders();
        
        console.log(`✅ Delivery order ${orderId} marked as completed`);
      } catch (error) {
        console.error('Error completing delivery order:', error);
        // Error logged to console - no alert popup needed
      }
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

  // const getTotalItemCount = () => {
  //   return orders.reduce((total, order) => {
  //     return total + order.items.reduce((itemTotal, item) => itemTotal + item.quantity, 0);
  //   }, 0);
  // };

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
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">🍽️ Food Zone Admin Panel</h1>
          <div className="flex items-center space-x-4">
            {/* PWA Install Button */}
            <button 
              id="pwa-install-btn"
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors hidden"
              onClick={() => window.deferredPrompt && window.deferredPrompt.prompt()}
            >
              📱 Install App
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
          onClick={() => setActiveTab('map')}
          className={`px-4 py-2 rounded-md font-medium transition-colors ${
            activeTab === 'map'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Map
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
          onClick={() => setActiveTab('database')}
          className={`px-4 py-2 rounded-md font-medium transition-colors ${
            activeTab === 'database'
              ? 'bg-white text-red-600 shadow-sm'
              : 'text-gray-600 hover:text-red-700'
          }`}
        >
          🗄️ Database
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
          {orders.filter(order => order.tableId !== 'Delivery').length === 0 ? (
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
                        {order.delivery_fee && (
                          <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full font-medium">
                            🚚 Delivery: NPR {order.delivery_fee}/-
                          </span>
                        )}
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

      {/* Map Tab */}
      {activeTab === 'map' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">🗺️ Delivery Locations Map</h2>
            <p className="text-gray-600">Interactive map showing all delivery orders with distances and locations</p>
          </div>
          <div className="p-6">
            <DeliveryMap deliveryOrders={orders.filter(order => order.order_type === 'delivery')} />
          </div>
        </div>
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
                </ul>
              </div>
            </div>
          </div>
        )}

      {/* Order History Tab */}
      {activeTab === 'history' && (
        <>
          {orderHistory.length === 0 ? (
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
                      <span className="inline-block mt-2 bg-green-100 text-green-800 text-sm px-3 py-1 rounded-full">
                        Completed
                      </span>
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

      {/* Delivery Map Tab */}
      {activeTab === 'map' && (
        <div className="space-y-6">
          <DeliveryMap deliveryOrders={orders.filter(order => order.order_type === 'delivery')} />
        </div>
      )}

      {/* Database Tab */}
      {activeTab === 'database' && (
        <div className="space-y-6">
          <DatabaseManager />
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <AdminSettings />
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]"
          style={{ zIndex: 9999 }}
        >
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="text-center">
              <div className="text-4xl mb-4">⚠️</div>
              <h3 className="text-lg font-semibold mb-2">Clear Table {tableToDelete}?</h3>
              <p className="text-gray-600 mb-6">
                This will permanently remove all orders for Table {tableToDelete}. 
                This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={cancelClearTable}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium cursor-pointer"
                  type="button"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmClearTable}
                  className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium cursor-pointer"
                  type="button"
                >
                  Clear Table
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default Admin;
