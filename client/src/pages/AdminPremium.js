import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import audioManager from '../utils/audioNotifications';
import { fetchApi, getSocketUrl } from '../services/apiService';

// Import premium components
// import OrdersManagement from '../components/premium/OrdersManagement';

// Premium SaaS Dashboard Components
const AdminPremium = () => {
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [dbSummary, setDbSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('adminAuthenticated') === 'true';
  });
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Initialize socket and data fetching
  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders();
      fetchCustomers();
      fetchDatabaseSummary();
      audioManager.requestPermissions();

      const newSocket = io(getSocketUrl());
      // setSocket(newSocket);
      
      newSocket.on('newOrder', (order) => {
        setOrders(prevOrders => [...prevOrders, order]);
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
        setOrders(prevOrders => 
          prevOrders.filter(order => order.table_id !== tableId)
        );
      });

      return () => newSocket.close();
    }
  }, [isAuthenticated]);

  // Data fetching functions
  async function fetchOrders() {
    try {
      setLoading(true);
      const data = await fetchApi.get('/api/orders');
      setOrders(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchCustomers() {
    try {
      const data = await fetchApi.get('/api/customers');
      setCustomers(data);
    } catch (err) {
      console.error('Error fetching customers:', err);
    }
  }

  async function fetchDatabaseSummary() {
    try {
      const data = await fetchApi.get('/api/database/summary');
      setDbSummary(data);
    } catch (err) {
      console.error('Error fetching database summary:', err);
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Simple client-side authentication for demo purposes
    if (password === 'FoodZone2024!') {
      localStorage.setItem('adminAuthenticated', 'true');
      setIsAuthenticated(true);
      setPassword('');
      setLoading(false);
    } else {
      setError('Invalid password');
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminAuthenticated');
    setIsAuthenticated(false);
    setPassword('');
    setError(null);
  };



  function renderContent() {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardOverview orders={orders} customers={customers} dbSummary={dbSummary} />;
      case 'orders':
        return <OrdersManagement orders={orders} setOrders={setOrders} />;
      case 'menu':
        return <MenuManagement />;
      case 'tables':
        return <TablesManagement orders={orders} setOrders={setOrders} />;
      case 'customers':
        return <CustomersManagement customers={customers} orders={orders} />;
      case 'analytics':
        return <AnalyticsViewPlaceholder orders={orders} />;
      case 'staff':
        return <StaffManagement />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardOverview orders={orders} customers={customers} dbSummary={dbSummary} />;
    }
  }

  // Login Form Component
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl text-white">🍽️</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">Food Zone Admin</h1>
              <p className="text-slate-600">Sign in to access your dashboard</p>
            </div>
            
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Admin Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Enter admin password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>
              
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}
              
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-4 rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Main Dashboard Layout
  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Premium Sidebar */}
      <PremiumSidebar 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${sidebarCollapsed ? 'ml-20' : 'ml-72'}`}>
        {/* Premium Header */}
        <PremiumHeader 
          activeTab={activeTab}
          orders={orders}
          customers={customers}
          orderHistory={[]}
        />

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
};

// Premium Sidebar Component
const PremiumSidebar = ({ activeTab, setActiveTab, collapsed, setCollapsed, onLogout }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', badge: null },
    { id: 'orders', label: 'Orders', icon: '📋', badge: '12' },
    { id: 'menu', label: 'Menu', icon: '🍽️', badge: null },
    { id: 'tables', label: 'Tables', icon: '🪑', badge: '3' },
    { id: 'customers', label: 'Customers', icon: '👥', badge: null },
    { id: 'analytics', label: 'Analytics', icon: '📈', badge: null },
    { id: 'staff', label: 'Staff', icon: '👨‍🍳', badge: null },
    { id: 'settings', label: 'Settings', icon: '⚙️', badge: null },
  ];

  return (
    <div className={`fixed left-0 top-0 h-full bg-white border-r border-slate-200 transition-all duration-300 z-30 ${collapsed ? 'w-20' : 'w-72'}`}>
      <div className="flex flex-col h-full">
        {/* Logo Section */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            {!collapsed && (
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                  <span className="text-white text-lg">🍽️</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900">Food Zone</h1>
                  <p className="text-sm text-slate-500">Restaurant Admin</p>
                </div>
              </div>
            )}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <span className="text-slate-400">{collapsed ? '→' : '←'}</span>
            </button>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === item.id
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {!collapsed && (
                <>
                  <span className="font-medium flex-1 text-left">{item.label}</span>
                  {item.badge && (
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      activeTab === item.id
                        ? 'bg-white/20 text-white'
                        : 'bg-blue-100 text-blue-600'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </button>
          ))}
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-slate-200">
          <button
            onClick={onLogout}
            className="w-full flex items-center space-x-3 px-4 py-3 text-slate-600 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all"
          >
            <span className="text-lg">🚪</span>
            {!collapsed && <span className="font-medium">Logout</span>}
          </button>
        </div>
      </div>
    </div>
  );
};

// Premium Header Component
const PremiumHeader = ({ activeTab, orders, customers, orderHistory }) => {
  const getPageTitle = () => {
    const titles = {
      dashboard: 'Dashboard Overview',
      orders: 'Order Management',
      menu: 'Menu Management',
      tables: 'Tables & Reservations',
      customers: 'Customer Management',
      analytics: 'Analytics & Reports',
      staff: 'Staff Management',
      settings: 'Settings'
    };
    return titles[activeTab] || 'Food Zone Admin';
  };

  const getPageStats = () => {
    const activeOrders = orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled').length;
    const totalCustomers = customers.length;
    const completedToday = orderHistory.filter(o => {
      const today = new Date().toDateString();
      return new Date(o.created_at).toDateString() === today;
    }).length;

    return { activeOrders, totalCustomers, completedToday };
  };

  const stats = getPageStats();

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{getPageTitle()}</h1>
          <p className="text-slate-600 mt-1">
            {activeTab === 'dashboard' && `${stats.activeOrders} active orders • ${stats.totalCustomers} customers • ${stats.completedToday} completed today`}
            {activeTab === 'orders' && `${stats.activeOrders} active orders requiring attention`}
            {activeTab === 'customers' && `${stats.totalCustomers} total customers in database`}
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 bg-green-50 px-3 py-2 rounded-lg">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-green-700">Live</span>
          </div>
          
          <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <span className="text-slate-400">🔔</span>
          </button>
          
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
          >
            🔄 Refresh
          </button>
        </div>
      </div>
    </header>
  );
};

// Dashboard Overview Component
const DashboardOverview = ({ orders, customers, dbSummary }) => {
  const activeOrders = orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled');
  const dineInOrders = activeOrders.filter(o => o.order_type === 'dine-in');
  const deliveryOrders = activeOrders.filter(o => o.order_type === 'delivery');
  
  const todayRevenue = orders.reduce((sum, order) => {
    const today = new Date().toDateString();
    const orderDate = new Date(order.created_at).toDateString();
    if (orderDate === today && order.status === 'completed') {
      const orderTotal = order.total_amount || (order.items?.reduce((itemSum, item) => itemSum + (item.price * item.quantity), 0) || 0);
      return sum + orderTotal;
    }
    return sum;
  }, 0);

  const stats = [
    {
      title: 'Active Orders',
      value: activeOrders.length,
      change: '+12%',
      changeType: 'positive',
      icon: '📋',
      color: 'blue'
    },
    {
      title: 'Today\'s Revenue',
      value: `NPR ${todayRevenue.toLocaleString()}`,
      change: '+8%',
      changeType: 'positive',
      icon: '💰',
      color: 'green'
    },
    {
      title: 'Total Customers',
      value: customers.length,
      change: '+5%',
      changeType: 'positive',
      icon: '👥',
      color: 'purple'
    },
    {
      title: 'Avg Order Value',
      value: `NPR ${Math.round(todayRevenue / Math.max(orders.length, 1))}`,
      change: '+3%',
      changeType: 'positive',
      icon: '📊',
      color: 'orange'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-2xl p-6 border border-slate-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm font-medium">{stat.title}</p>
                <p className="text-2xl font-bold text-slate-900 mt-2">{stat.value}</p>
                <div className={`flex items-center mt-2 text-sm ${
                  stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                }`}>
                  <span>{stat.changeType === 'positive' ? '↗️' : '↘️'}</span>
                  <span className="ml-1">{stat.change} from last week</span>
                </div>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-${stat.color}-100`}>
                <span className="text-xl">{stat.icon}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Orders Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dine-in Orders */}
        <div className="bg-white rounded-2xl border border-slate-200">
          <div className="p-6 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900">🍽️ Dine-in Orders</h3>
            <p className="text-slate-600 text-sm">{dineInOrders.length} active table orders</p>
          </div>
          <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
            {dineInOrders.length === 0 ? (
              <div className="text-center py-8">
                <span className="text-4xl mb-4 block">🪑</span>
                <p className="text-slate-500">No active dine-in orders</p>
              </div>
            ) : (
              dineInOrders.slice(0, 5).map((order) => (
                <div key={order.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                  <div>
                    <p className="font-medium text-slate-900">Table {order.table_id}</p>
                    <p className="text-sm text-slate-600">{order.customer_name}</p>
                    <p className="text-xs text-slate-500">{order.items?.length || 0} items</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-900">NPR {order.total_amount || (order.items?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || 0)}</p>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      order.status === 'preparing' ? 'bg-blue-100 text-blue-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Delivery Orders */}
        <div className="bg-white rounded-2xl border border-slate-200">
          <div className="p-6 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900">🚚 Delivery Orders</h3>
            <p className="text-slate-600 text-sm">{deliveryOrders.length} active delivery orders</p>
          </div>
          <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
            {deliveryOrders.length === 0 ? (
              <div className="text-center py-8">
                <span className="text-4xl mb-4 block">🚚</span>
                <p className="text-slate-500">No active delivery orders</p>
              </div>
            ) : (
              deliveryOrders.slice(0, 5).map((order) => (
                <div key={order.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                  <div>
                    <p className="font-medium text-slate-900">{order.customer_name}</p>
                    <p className="text-sm text-slate-600">{order.phone}</p>
                    {order.latitude && order.longitude && (
                      <p className="text-xs text-slate-500 mt-1">
                        <span role="img" aria-label="location">📍</span> GPS: {order.latitude}, {order.longitude}
                      </p>
                    )}
                    <p className="text-xs text-slate-500">{order.items?.length || 0} items</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-900">NPR {order.total_amount || (order.items?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || 0)}</p>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      order.status === 'preparing' ? 'bg-blue-100 text-blue-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">⚡ Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="flex flex-col items-center p-4 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors">
            <span className="text-2xl mb-2">➕</span>
            <span className="text-sm font-medium text-blue-700">Add Menu Item</span>
          </button>
          <button className="flex flex-col items-center p-4 bg-green-50 hover:bg-green-100 rounded-xl transition-colors">
            <span className="text-2xl mb-2">📊</span>
            <span className="text-sm font-medium text-green-700">View Reports</span>
          </button>
          <button className="flex flex-col items-center p-4 bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors">
            <span className="text-2xl mb-2">👥</span>
            <span className="text-sm font-medium text-purple-700">Manage Staff</span>
          </button>
          <button className="flex flex-col items-center p-4 bg-orange-50 hover:bg-orange-100 rounded-xl transition-colors">
            <span className="text-2xl mb-2">⚙️</span>
            <span className="text-sm font-medium text-orange-700">Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// Placeholder components for other views

// Menu Management Component
const MenuManagement = () => {
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [newItem, setNewItem] = useState({
    name: '',
    description: '',
    price: '',
    category: 'MoMo',
    available: true
  });

  useEffect(() => {
    fetchMenuItems();
  }, []);

  const fetchMenuItems = async () => {
    try {
      const data = await fetchApi.get('/api/menu');
      setMenuItems(data);
    } catch (error) {
      console.error('Error fetching menu items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    try {
      const data = await fetchApi.post('/api/menu', {
        ...newItem,
        price: parseFloat(newItem.price)
      });
      setMenuItems([...menuItems, data]);
      setNewItem({ name: '', description: '', price: '', category: 'Main Course', available: true });
      setShowAddForm(false);
    } catch (error) {
      console.error('Error adding menu item:', error);
    }
  };

  const handleUpdateItem = async (id, updates) => {
    try {
      await fetchApi.put(`/api/menu/${id}`, updates);
      setMenuItems(menuItems.map(item => 
        item.id === id ? { ...item, ...updates } : item
      ));
      setEditingItem(null);
    } catch (error) {
      console.error('Error updating menu item:', error);
    }
  };

  const handleDeleteItem = async (id) => {
    if (window.confirm('Are you sure you want to delete this menu item?')) {
      try {
        await fetchApi.delete(`/api/menu/${id}`);
        setMenuItems(menuItems.filter(item => item.id !== id));
      } catch (error) {
        console.error('Error deleting menu item:', error);
      }
    }
  };

  const categories = ['MoMo', 'Pizza', 'Sandwiches & Burgers', 'Rice & Biryani', 'Cold Beverages', 'Hot Beverages', 'Appetizers', 'Desserts'];

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-slate-200">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading menu items...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 border border-slate-200">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Menu Management</h2>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            ➕ Add New Item
          </button>
        </div>

        {/* Add Item Form */}
        {showAddForm && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-medium mb-4">Add New Menu Item</h3>
            <form onSubmit={handleAddItem} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Item Name"
                value={newItem.name}
                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
              <input
                type="number"
                placeholder="Price (NPR)"
                value={newItem.price}
                onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
              <select
                value={newItem.category}
                onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="available"
                  checked={newItem.available}
                  onChange={(e) => setNewItem({ ...newItem, available: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="available" className="text-sm">Available</label>
              </div>
              <textarea
                placeholder="Description (optional)"
                value={newItem.description}
                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                className="md:col-span-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows="2"
              />
              <div className="md:col-span-2 flex space-x-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Add Item
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Menu Items by Category */}
        {categories.map(category => {
          const categoryItems = menuItems.filter(item => item.category === category);
          if (categoryItems.length === 0) return null;

          return (
            <div key={category} className="mb-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-200 pb-2">
                {category} ({categoryItems.length} items)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categoryItems.map(item => (
                  <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{item.name}</h4>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        item.available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {item.available ? 'Available' : 'Unavailable'}
                      </span>
                    </div>
                    {item.description && (
                      <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                    )}
                    <p className="text-lg font-bold text-blue-600 mb-3">NPR {item.price}</p>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setEditingItem(item)}
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleUpdateItem(item.id, { available: !item.available })}
                        className={`px-3 py-1 text-white text-sm rounded ${
                          item.available ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
                        }`}
                      >
                        {item.available ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {menuItems.length === 0 && (
          <div className="text-center py-12">
            <span className="text-4xl mb-4 block">🍽️</span>
            <p className="text-gray-500">No menu items found. Add your first item to get started!</p>
          </div>
        )}
      </div>

      {/* Edit Item Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Edit Menu Item</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              handleUpdateItem(editingItem.id, {
                name: editingItem.name,
                description: editingItem.description,
                price: parseFloat(editingItem.price),
                category: editingItem.category,
                available: editingItem.available
              });
            }} className="space-y-4">
              <input
                type="text"
                value={editingItem.name}
                onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                required
              />
              <input
                type="number"
                value={editingItem.price}
                onChange={(e) => setEditingItem({ ...editingItem, price: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                required
              />
              <select
                value={editingItem.category}
                onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <textarea
                value={editingItem.description || ''}
                onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                rows="2"
                placeholder="Description"
              />
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="editAvailable"
                  checked={editingItem.available}
                  onChange={(e) => setEditingItem({ ...editingItem, available: e.target.checked })}
                />
                <label htmlFor="editAvailable">Available</label>
              </div>
              <div className="flex space-x-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Update
                </button>
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Tables Management Component
const TablesManagement = ({ orders, setOrders }) => {
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [showClearModal, setShowClearModal] = useState(false);

  // Generate table data (1-25 tables)
  useEffect(() => {
    const tableData = [];
    for (let i = 1; i <= 25; i++) {
      const tableOrders = orders.filter(order => 
        order.table_id === i && ['pending', 'preparing', 'ready'].includes(order.status)
      );
      const isOccupied = tableOrders.length > 0;
      const totalAmount = tableOrders.reduce((sum, order) => {
        const orderTotal = order.total_amount || (order.items?.reduce((itemSum, item) => itemSum + (item.price * item.quantity), 0) || 0);
        return sum + orderTotal;
      }, 0);
      
      tableData.push({
        id: i,
        number: i,
        status: isOccupied ? 'occupied' : 'available',
        orders: tableOrders,
        totalAmount,
        customerCount: tableOrders.length,
        lastActivity: tableOrders.length > 0 ? 
          Math.max(...tableOrders.map(o => new Date(o.created_at).getTime())) : null
      });
    }
    setTables(tableData);
  }, [orders]);

  const clearTable = async (tableId) => {
    try {
      // Update orders to mark table orders as completed
      const ordersToUpdate = orders.filter(order => 
        order.table_id === tableId && ['pending', 'preparing', 'ready'].includes(order.status)
      );

      // Update each order individually via API
      for (const order of ordersToUpdate) {
        await fetchApi.put(`/api/orders/${order.id}`, { status: 'completed' });
      }

      // Update local state
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.table_id === tableId && ['pending', 'preparing', 'ready'].includes(order.status)
            ? { ...order, status: 'completed' }
            : order
        )
      );
      
      setShowClearModal(false);
      setSelectedTable(null);
    } catch (error) {
      console.error('Error clearing table:', error);
      // Fallback: update locally if API fails
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.table_id === tableId && ['pending', 'preparing', 'ready'].includes(order.status)
            ? { ...order, status: 'completed' }
            : order
        )
      );
      setShowClearModal(false);
      setSelectedTable(null);
    }
  };

  const getTableStatusColor = (status) => {
    return status === 'occupied' 
      ? 'bg-red-100 border-red-300 text-red-700'
      : 'bg-green-100 border-green-300 text-green-700';
  };

  const occupiedTables = tables.filter(t => t.status === 'occupied');
  const availableTables = tables.filter(t => t.status === 'available');

  return (
    <div className="space-y-6">
      {/* Table Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm font-medium">Total Tables</p>
              <p className="text-2xl font-bold text-slate-900">25</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <span className="text-xl">🪑</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm font-medium">Occupied</p>
              <p className="text-2xl font-bold text-red-600">{occupiedTables.length}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <span className="text-xl">🔴</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm font-medium">Available</p>
              <p className="text-2xl font-bold text-green-600">{availableTables.length}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <span className="text-xl">🟢</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm font-medium">Revenue Today</p>
              <p className="text-2xl font-bold text-blue-600">
                NPR {occupiedTables.reduce((sum, t) => sum + t.totalAmount, 0)}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <span className="text-xl">💰</span>
            </div>
          </div>
        </div>
      </div>

      {/* Table Grid */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Table Layout</h2>
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-green-200 border border-green-300 rounded"></div>
              <span>Available</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-red-200 border border-red-300 rounded"></div>
              <span>Occupied</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-4">
          {tables.map((table) => (
            <div
              key={table.id}
              onClick={() => setSelectedTable(table)}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all hover:shadow-md ${getTableStatusColor(table.status)}`}
            >
              <div className="text-center">
                <div className="text-lg font-bold mb-1">Table {table.number}</div>
                <div className="text-xs capitalize mb-2">{table.status}</div>
                {table.status === 'occupied' && (
                  <div className="text-xs">
                    <div>{table.customerCount} order(s)</div>
                    <div className="font-semibold">NPR {table.totalAmount}</div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Occupied Tables Details */}
      {occupiedTables.length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <h3 className="text-lg font-semibold mb-4">Occupied Tables Details</h3>
          <div className="space-y-4">
            {occupiedTables.map((table) => (
              <div key={table.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-900">Table {table.number}</h4>
                  <button
                    onClick={() => {
                      setSelectedTable(table);
                      setShowClearModal(true);
                    }}
                    className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                  >
                    Clear Table
                  </button>
                </div>
                <div className="space-y-2">
                  {table.orders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div>
                        <span className="font-medium">{order.customer_name}</span>
                        <span className="text-sm text-gray-600 ml-2">• {order.phone}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">NPR {order.total_amount}</div>
                        <div className={`text-xs px-2 py-1 rounded-full ${
                          order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                          order.status === 'preparing' ? 'bg-blue-100 text-blue-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {order.status}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Table Details Modal */}
      {selectedTable && !showClearModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Table {selectedTable.number} Details</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Status:</span>
                <span className={`px-2 py-1 rounded-full text-sm ${
                  selectedTable.status === 'occupied' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                }`}>
                  {selectedTable.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Active Orders:</span>
                <span>{selectedTable.customerCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Amount:</span>
                <span className="font-semibold">NPR {selectedTable.totalAmount}</span>
              </div>
              {selectedTable.lastActivity && (
                <div className="flex justify-between">
                  <span>Last Activity:</span>
                  <span className="text-sm">{new Date(selectedTable.lastActivity).toLocaleString()}</span>
                </div>
              )}
            </div>
            <div className="flex space-x-2 mt-6">
              {selectedTable.status === 'occupied' && (
                <button
                  onClick={() => setShowClearModal(true)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Clear Table
                </button>
              )}
              <button
                onClick={() => setSelectedTable(null)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Table Confirmation Modal */}
      {showClearModal && selectedTable && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Clear Table {selectedTable.number}?</h3>
            <p className="text-gray-600 mb-6">
              This will mark all active orders for this table as completed and make the table available for new customers.
            </p>
            <div className="flex space-x-2">
              <button
                onClick={() => clearTable(selectedTable.id)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Yes, Clear Table
              </button>
              <button
                onClick={() => setShowClearModal(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Customers Management Component
const CustomersManagement = ({ customers, orders }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [sortBy, setSortBy] = useState('recent');

  // Calculate customer statistics
  const getCustomerStats = (customer) => {
    const customerOrders = orders.filter(order => 
      order.customer_name === customer.name || order.phone === customer.phone
    );
    const totalSpent = customerOrders.reduce((sum, order) => {
      const orderTotal = order.total_amount || (order.items?.reduce((itemSum, item) => itemSum + (item.price * item.quantity), 0) || 0);
      return sum + orderTotal;
    }, 0);
    const lastOrderDate = customerOrders.length > 0 ? 
      Math.max(...customerOrders.map(o => new Date(o.created_at).getTime())) : null;
    
    return {
      totalOrders: customerOrders.length,
      totalSpent,
      lastOrderDate,
      orders: customerOrders
    };
  };

  // Filter and sort customers
  const filteredCustomers = customers
    .filter(customer => 
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone.includes(searchTerm) ||
      customer.email?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const aStats = getCustomerStats(a);
      const bStats = getCustomerStats(b);
      
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'orders':
          return bStats.totalOrders - aStats.totalOrders;
        case 'spent':
          return bStats.totalSpent - aStats.totalSpent;
        case 'recent':
        default:
          return (bStats.lastOrderDate || 0) - (aStats.lastOrderDate || 0);
      }
    });

  const totalCustomers = customers.length;
  const totalRevenue = customers.reduce((sum, customer) => {
    return sum + getCustomerStats(customer).totalSpent;
  }, 0);
  const avgOrderValue = totalRevenue / Math.max(orders.length, 1);

  return (
    <div className="space-y-6">
      {/* Customer Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm font-medium">Total Customers</p>
              <p className="text-2xl font-bold text-slate-900">{totalCustomers}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <span className="text-xl">👥</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm font-medium">Total Revenue</p>
              <p className="text-2xl font-bold text-green-600">NPR {totalRevenue.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <span className="text-xl">💰</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm font-medium">Avg Order Value</p>
              <p className="text-2xl font-bold text-purple-600">NPR {Math.round(avgOrderValue)}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <span className="text-xl">📊</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm font-medium">Active Today</p>
              <p className="text-2xl font-bold text-orange-600">
                {customers.filter(customer => {
                  const stats = getCustomerStats(customer);
                  const today = new Date().toDateString();
                  return stats.lastOrderDate && new Date(stats.lastOrderDate).toDateString() === today;
                }).length}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <span className="text-xl">🔥</span>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Management */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Customer Database</h2>
          <div className="flex items-center space-x-4">
            <input
              type="text"
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="recent">Recent Activity</option>
              <option value="name">Name A-Z</option>
              <option value="orders">Most Orders</option>
              <option value="spent">Highest Spent</option>
            </select>
          </div>
        </div>

        {/* Customer List */}
        <div className="space-y-4">
          {filteredCustomers.length === 0 ? (
            <div className="text-center py-12">
              <span className="text-4xl mb-4 block">👥</span>
              <p className="text-gray-500">
                {searchTerm ? `No customers found matching "${searchTerm}"` : 'No customers found'}
              </p>
            </div>
          ) : (
            filteredCustomers.map((customer) => {
              const stats = getCustomerStats(customer);
              return (
                <div
                  key={customer.id}
                  onClick={() => setSelectedCustomer(customer)}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                          {customer.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{customer.name}</h3>
                          <p className="text-sm text-gray-600">{customer.phone}</p>
                          {customer.email && (
                            <p className="text-sm text-gray-500">{customer.email}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-lg font-bold text-blue-600">{stats.totalOrders}</p>
                          <p className="text-xs text-gray-500">Orders</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-green-600">NPR {stats.totalSpent}</p>
                          <p className="text-xs text-gray-500">Total Spent</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">
                            {stats.lastOrderDate ? 
                              new Date(stats.lastOrderDate).toLocaleDateString() : 
                              'No orders'
                            }
                          </p>
                          <p className="text-xs text-gray-500">Last Order</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Customer Details Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">Customer Details</h3>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            {(() => {
              const stats = getCustomerStats(selectedCustomer);
              return (
                <div className="space-y-6">
                  {/* Customer Info */}
                  <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                    <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
                      {selectedCustomer.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold">{selectedCustomer.name}</h4>
                      <p className="text-gray-600">{selectedCustomer.phone}</p>
                      {selectedCustomer.email && (
                        <p className="text-gray-500">{selectedCustomer.email}</p>
                      )}
                    </div>
                  </div>

                  {/* Customer Stats */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <p className="text-2xl font-bold text-blue-600">{stats.totalOrders}</p>
                      <p className="text-sm text-gray-600">Total Orders</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <p className="text-2xl font-bold text-green-600">NPR {stats.totalSpent}</p>
                      <p className="text-sm text-gray-600">Total Spent</p>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <p className="text-2xl font-bold text-purple-600">
                        NPR {stats.totalOrders > 0 ? Math.round(stats.totalSpent / stats.totalOrders) : 0}
                      </p>
                      <p className="text-sm text-gray-600">Avg Order</p>
                    </div>
                  </div>

                  {/* Order History */}
                  <div>
                    <h5 className="text-lg font-semibold mb-4">Order History</h5>
                    {stats.orders.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">No orders found</p>
                    ) : (
                      <div className="space-y-3 max-h-60 overflow-y-auto">
                        {stats.orders
                          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                          .map((order) => (
                            <div key={order.id} className="border border-gray-200 rounded-lg p-3">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium">
                                  {order.order_type === 'dine-in' ? `Table ${order.table_id}` : 'Delivery'}
                                </span>
                                <p className="text-sm text-gray-600">
                                  {order.customer_name} • {new Date(order.created_at).toLocaleString()}
                                </p>
                                {order.order_type === 'delivery' && order.latitude && order.longitude && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    📍 {order.latitude}, {order.longitude}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">
                                  {order.items?.length || 0} items
                                </span>
                                <div className="flex items-center space-x-2">
                                  <span className="font-semibold">NPR {order.total_amount}</span>
                                  <span className={`px-2 py-1 text-xs rounded-full ${
                                    order.status === 'completed' ? 'bg-green-100 text-green-700' :
                                    order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-blue-100 text-blue-700'
                                  }`}>
                                    {order.status}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))
                        }
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

// Analytics Component
const AnalyticsViewPlaceholder = ({ orders }) => {
  const [dateRange, setDateRange] = useState('today');
  // const [selectedMetric, setSelectedMetric] = useState('revenue');

  // Calculate analytics data
  const getAnalyticsData = () => {
    const now = new Date();
    let startDate;
    
    switch (dateRange) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(0);
    }

    const filteredOrders = orders.filter(order => 
      new Date(order.created_at) >= startDate
    );

    const totalRevenue = filteredOrders.reduce((sum, order) => {
      const orderTotal = order.total_amount || (order.items?.reduce((itemSum, item) => itemSum + (item.price * item.quantity), 0) || 0);
      return sum + orderTotal;
    }, 0);
    const totalOrders = filteredOrders.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    
    // Group by status
    const ordersByStatus = filteredOrders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {});

    // Group by order type
    const ordersByType = filteredOrders.reduce((acc, order) => {
      acc[order.order_type] = (acc[order.order_type] || 0) + 1;
      return acc;
    }, {});

    // Daily revenue trend (last 7 days)
    const dailyRevenue = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      
      const dayOrders = orders.filter(order => {
        const orderDate = new Date(order.created_at);
        return orderDate >= dayStart && orderDate < dayEnd;
      });
      
      const dayRevenue = dayOrders.reduce((sum, order) => {
        const orderTotal = order.total_amount || (order.items ? order.items.reduce((itemSum, item) => itemSum + item.price * item.quantity, 0) : 0);
        return sum + orderTotal;
      }, 0);
      dailyRevenue.push({
        date: date.toLocaleDateString('en-US', { weekday: 'short' }),
        revenue: dayRevenue,
        orders: dayOrders.length
      });
    }

    // Popular items analysis
    const itemCounts = {};
    filteredOrders.forEach(order => {
      if (order.items) {
        order.items.forEach(item => {
          const itemName = item.name || item.item_name;
          if (itemName) {
            itemCounts[itemName] = (itemCounts[itemName] || 0) + (item.quantity || 1);
          }
        });
      }
    });

    const popularItems = Object.entries(itemCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    return {
      totalRevenue,
      totalOrders,
      avgOrderValue,
      ordersByStatus,
      ordersByType,
      dailyRevenue,
      popularItems
    };
  };

  const analytics = getAnalyticsData();

  return (
    <div className="space-y-6">
      {/* Analytics Controls */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Analytics & Reports</h2>
          <div className="flex items-center space-x-4">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
            </select>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Total Revenue</p>
                <p className="text-2xl font-bold">NPR {analytics.totalRevenue.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 bg-blue-400 rounded-xl flex items-center justify-center">
                <span className="text-xl">💰</span>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Total Orders</p>
                <p className="text-2xl font-bold">{analytics.totalOrders}</p>
              </div>
              <div className="w-12 h-12 bg-green-400 rounded-xl flex items-center justify-center">
                <span className="text-xl">📋</span>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Avg Order Value</p>
                <p className="text-2xl font-bold">NPR {Math.round(analytics.avgOrderValue)}</p>
              </div>
              <div className="w-12 h-12 bg-purple-400 rounded-xl flex items-center justify-center">
                <span className="text-xl">📊</span>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium">Completion Rate</p>
                <p className="text-2xl font-bold">
                  {analytics.totalOrders > 0 ? 
                    Math.round(((analytics.ordersByStatus.completed || 0) / analytics.totalOrders) * 100) : 0}%
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-400 rounded-xl flex items-center justify-center">
                <span className="text-xl">✅</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts and Detailed Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <h3 className="text-lg font-semibold mb-4">Revenue Trend (Last 7 Days)</h3>
          <div className="space-y-3">
            {analytics.dailyRevenue.map((day, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">{day.date}</span>
                <div className="flex items-center space-x-4">
                  <div className="flex-1 bg-gray-200 rounded-full h-2 w-32">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${Math.max(5, (day.revenue / Math.max(...analytics.dailyRevenue.map(d => d.revenue))) * 100)}%` 
                      }}
                    ></div>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 w-20 text-right">
                    NPR {day.revenue}
                  </span>
                  <span className="text-xs text-gray-500 w-16 text-right">
                    ({day.orders} orders)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order Status Distribution */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <h3 className="text-lg font-semibold mb-4">Order Status Distribution</h3>
          <div className="space-y-4">
            {Object.entries(analytics.ordersByStatus).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-4 h-4 rounded-full ${
                    status === 'completed' ? 'bg-green-500' :
                    status === 'pending' ? 'bg-yellow-500' :
                    status === 'preparing' ? 'bg-blue-500' :
                    'bg-gray-500'
                  }`}></div>
                  <span className="text-sm font-medium capitalize">{status}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-semibold">{count}</span>
                  <span className="text-xs text-gray-500">
                    ({analytics.totalOrders > 0 ? Math.round((count / analytics.totalOrders) * 100) : 0}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order Type Distribution */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <h3 className="text-lg font-semibold mb-4">Order Type Distribution</h3>
          <div className="space-y-4">
            {Object.entries(analytics.ordersByType).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-4 h-4 rounded-full ${
                    type === 'dine-in' ? 'bg-purple-500' : 'bg-orange-500'
                  }`}></div>
                  <span className="text-sm font-medium capitalize">{type.replace('-', ' ')}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-semibold">{count}</span>
                  <span className="text-xs text-gray-500">
                    ({analytics.totalOrders > 0 ? Math.round((count / analytics.totalOrders) * 100) : 0}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Popular Items */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <h3 className="text-lg font-semibold mb-4">Popular Items</h3>
          <div className="space-y-3">
            {analytics.popularItems.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No items data available</p>
            ) : (
              analytics.popularItems.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                      {index + 1}
                    </div>
                    <span className="text-sm font-medium">{item.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-600">{item.count} sold</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Export Options */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200">
        <h3 className="text-lg font-semibold mb-4">Export Reports</h3>
        <div className="flex items-center space-x-4">
          <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
            Export CSV
          </button>
          <button className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
            Export PDF
          </button>
          <button className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors">
            Email Report
          </button>
        </div>
      </div>
    </div>
  );
};

// Staff Management Component
const StaffManagement = () => {
  const [staff, setStaff] = useState([
    { id: 1, name: 'John Doe', role: 'Manager', email: 'john@foodzone.com', phone: '+977-9841234567', status: 'active', joinDate: '2023-01-15', shift: 'morning' },
    { id: 2, name: 'Jane Smith', role: 'Chef', email: 'jane@foodzone.com', phone: '+977-9841234568', status: 'active', joinDate: '2023-02-20', shift: 'evening' },
    { id: 3, name: 'Mike Johnson', role: 'Waiter', email: 'mike@foodzone.com', phone: '+977-9841234569', status: 'active', joinDate: '2023-03-10', shift: 'morning' },
    { id: 4, name: 'Sarah Wilson', role: 'Cashier', email: 'sarah@foodzone.com', phone: '+977-9841234570', status: 'inactive', joinDate: '2023-01-05', shift: 'evening' }
  ]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const roles = ['Manager', 'Chef', 'Waiter', 'Cashier', 'Kitchen Helper'];
  const shifts = ['morning', 'evening', 'night'];

  // Filter staff based on search and filters
  const filteredStaff = staff.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.phone.includes(searchTerm);
    const matchesRole = filterRole === 'all' || member.role === filterRole;
    const matchesStatus = filterStatus === 'all' || member.status === filterStatus;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleAddStaff = (newStaff) => {
    const staffWithId = { ...newStaff, id: Date.now(), joinDate: new Date().toISOString().split('T')[0] };
    setStaff([...staff, staffWithId]);
    setShowAddModal(false);
  };

  const handleEditStaff = (updatedStaff) => {
    setStaff(staff.map(member => member.id === updatedStaff.id ? updatedStaff : member));
    setEditingStaff(null);
  };

  const handleDeleteStaff = (id) => {
    const staffMember = staff.find(member => member.id === id);
    const confirmMessage = `Are you sure you want to remove ${staffMember?.name || 'this staff member'}?`;
    
    // eslint-disable-next-line no-restricted-globals
    if (confirm(confirmMessage)) {
      setStaff(prevStaff => prevStaff.filter(member => member.id !== id));
    }
  };

  const toggleStatus = (id) => {
    setStaff(staff.map(member => 
      member.id === id 
        ? { ...member, status: member.status === 'active' ? 'inactive' : 'active' }
        : member
    ));
  };

  return (
    <div className="space-y-6">
      {/* Staff Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm font-medium">Total Staff</p>
              <p className="text-2xl font-bold text-slate-900">{staff.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <span className="text-xl">👥</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm font-medium">Active Staff</p>
              <p className="text-2xl font-bold text-green-600">
                {staff.filter(member => member.status === 'active').length}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <span className="text-xl">✅</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm font-medium">Morning Shift</p>
              <p className="text-2xl font-bold text-orange-600">
                {staff.filter(member => member.shift === 'morning' && member.status === 'active').length}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <span className="text-xl">🌅</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm font-medium">Evening Shift</p>
              <p className="text-2xl font-bold text-purple-600">
                {staff.filter(member => member.shift === 'evening' && member.status === 'active').length}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <span className="text-xl">🌆</span>
            </div>
          </div>
        </div>
      </div>

      {/* Staff Management */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Staff Management</h2>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Add New Staff
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-4 mb-6">
          <input
            type="text"
            placeholder="Search staff..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Roles</option>
            {roles.map(role => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {/* Staff List */}
        <div className="space-y-4">
          {filteredStaff.length === 0 ? (
            <div className="text-center py-12">
              <span className="text-4xl mb-4 block">👥</span>
              <p className="text-gray-500">No staff members found</p>
            </div>
          ) : (
            filteredStaff.map((member) => (
              <div key={member.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{member.name}</h3>
                      <p className="text-sm text-gray-600">{member.role}</p>
                      <p className="text-sm text-gray-500">{member.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-6">
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-900">{member.phone}</p>
                      <p className="text-xs text-gray-500">Phone</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-900 capitalize">{member.shift}</p>
                      <p className="text-xs text-gray-500">Shift</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-900">
                        {new Date(member.joinDate).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-gray-500">Join Date</p>
                    </div>
                    <div className="text-center">
                      <span className={`px-3 py-1 text-xs rounded-full ${
                        member.status === 'active' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {member.status}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setEditingStaff(member)}
                        className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => toggleStatus(member.id)}
                        className={`px-3 py-1 text-sm rounded transition-colors ${
                          member.status === 'active'
                            ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                      >
                        {member.status === 'active' ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => handleDeleteStaff(member.id)}
                        className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Staff Modal */}
      {showAddModal && (
        <StaffModal
          staff={null}
          roles={roles}
          shifts={shifts}
          onSave={handleAddStaff}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {/* Edit Staff Modal */}
      {editingStaff && (
        <StaffModal
          staff={editingStaff}
          roles={roles}
          shifts={shifts}
          onSave={handleEditStaff}
          onClose={() => setEditingStaff(null)}
        />
      )}
    </div>
  );
};

// Staff Modal Component
const StaffModal = ({ staff, roles, shifts, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    name: staff?.name || '',
    role: staff?.role || 'Waiter',
    email: staff?.email || '',
    phone: staff?.phone || '',
    shift: staff?.shift || 'morning',
    status: staff?.status || 'active'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (staff) {
      onSave({ ...staff, ...formData });
    } else {
      onSave(formData);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold">
            {staff ? 'Edit Staff Member' : 'Add New Staff Member'}
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {roles.map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="tel"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Shift</label>
            <select
              value={formData.shift}
              onChange={(e) => setFormData({ ...formData, shift: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {shifts.map(shift => (
                <option key={shift} value={shift}>{shift.charAt(0).toUpperCase() + shift.slice(1)}</option>
              ))}
            </select>
          </div>
          
          {staff && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          )}
          
          <div className="flex items-center space-x-4 pt-4">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              {staff ? 'Update Staff' : 'Add Staff'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Orders Management Component
const OrdersManagement = ({ orders, setOrders }) => {
  const [filter, setFilter] = useState('all');
  // const [selectedOrder, setSelectedOrder] = useState(null);

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await fetchApi.put(`/api/orders/${orderId}/status`, { status: newStatus });
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId ? { ...order, status: newStatus } : order
        )
      );
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  const updatePaymentStatus = async (orderId, paymentStatus) => {
    try {
      // Use the general orders update endpoint with payment_status field
      await fetchApi.put(`/api/orders/${orderId}`, { payment_status: paymentStatus });
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId ? { ...order, payment_status: paymentStatus } : order
        )
      );
    } catch (error) {
      console.error('Error updating payment status:', error);
      // Fallback: update locally if API fails
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId ? { ...order, payment_status: paymentStatus } : order
        )
      );
    }
  };

  const filteredOrders = orders.filter(order => {
    if (filter === 'all') return true;
    if (filter === 'active') return ['pending', 'preparing', 'ready'].includes(order.status);
    return order.status === filter;
  });

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-700',
      preparing: 'bg-blue-100 text-blue-700',
      ready: 'bg-green-100 text-green-700',
      completed: 'bg-gray-100 text-gray-700',
      cancelled: 'bg-red-100 text-red-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="space-y-6">
      {/* Filter Tabs */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Order Management</h2>
          <div className="flex space-x-2">
            {['all', 'active', 'pending', 'preparing', 'ready', 'completed'].map((filterType) => (
              <button
                key={filterType}
                onClick={() => setFilter(filterType)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === filterType
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Orders List */}
        <div className="space-y-4">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-12">
              <span className="text-4xl mb-4 block">📋</span>
              <p className="text-gray-500">No orders found for the selected filter</p>
            </div>
          ) : (
            filteredOrders.map((order) => (
              <div key={order.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {order.order_type === 'dine-in' ? `Table ${order.table_id}` : 'Delivery Order'}
                        </h3>
                        {order.order_type === 'delivery' ? (
                          <>
                            <p className="text-sm text-gray-500"><strong>Address:</strong> {order.customer_address} • {order.phone}</p>
                            {order.latitude && order.longitude && (
                              <p className="text-sm text-gray-500">
                                <strong>GPS:</strong> {order.latitude}, {order.longitude}
                              </p>
                            )}
                          </>
                        ) : (
                          <p className="text-sm text-gray-500">{order.phone}</p>
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
                      <span className={`px-3 py-1 text-sm rounded-full ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </div>
                    
                    {/* Status Update Buttons */}
                    <div className="flex flex-col space-y-2">
                      <div className="flex space-x-2">
                        {order.status === 'pending' && (
                          <button
                            onClick={() => updateOrderStatus(order.id, 'preparing')}
                            className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                          >
                            Start Preparing
                          </button>
                        )}
                        {order.status === 'preparing' && (
                          <button
                            onClick={() => updateOrderStatus(order.id, 'ready')}
                            className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                          >
                            Mark Ready
                          </button>
                        )}
                        {order.status === 'ready' && (
                          <button
                            onClick={() => updateOrderStatus(order.id, 'completed')}
                            className="px-3 py-1 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700"
                          >
                            Complete
                          </button>
                        )}
                      </div>
                      
                      {/* Payment Status Buttons */}
                      {order.status === 'completed' && order.payment_status !== 'paid' && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => updatePaymentStatus(order.id, 'paid')}
                            className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                          >
                            Mark Paid
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// Settings Component
const SettingsView = () => {
  const [settings, setSettings] = useState({
    restaurantName: 'Food Zone',
    address: '123 Main Street, Kathmandu, Nepal',
    phone: '+977-9841234567',
    email: 'info@foodzone.com',
    currency: 'NPR',
    taxRate: 13,
    serviceCharge: 10,
    deliveryFee: 50,
    minOrderAmount: 200,
    operatingHours: {
      open: '09:00',
      close: '22:00'
    },
    notifications: {
      email: true,
      sms: false,
      push: true
    },
    theme: 'light',
    language: 'en'
  });

  const [activeSection, setActiveSection] = useState('general');
  const [showSaveMessage, setShowSaveMessage] = useState(false);

  const handleSave = () => {
    // In a real app, this would save to backend
    localStorage.setItem('restaurantSettings', JSON.stringify(settings));
    setShowSaveMessage(true);
    setTimeout(() => setShowSaveMessage(false), 3000);
  };

  const handleSettingChange = (section, key, value) => {
    setSettings(prev => ({
      ...prev,
      [section]: typeof prev[section] === 'object' 
        ? { ...prev[section], [key]: value }
        : value
    }));
  };

  return (
    <div className="space-y-6">
      {/* Settings Navigation */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200">
        <h2 className="text-xl font-semibold mb-6">Restaurant Settings</h2>
        
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1 mb-6">
          {[
            { id: 'general', label: 'General', icon: '⚙️' },
            { id: 'business', label: 'Business', icon: '🏢' },
            { id: 'pricing', label: 'Pricing', icon: '💰' },
            { id: 'notifications', label: 'Notifications', icon: '🔔' },
            { id: 'appearance', label: 'Appearance', icon: '🎨' }
          ].map(section => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                activeSection === section.id
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span>{section.icon}</span>
              <span className="text-sm font-medium">{section.label}</span>
            </button>
          ))}
        </div>

        {/* Settings Content */}
        <div className="space-y-6">
          {/* General Settings */}
          {activeSection === 'general' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">General Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Restaurant Name</label>
                  <input
                    type="text"
                    value={settings.restaurantName}
                    onChange={(e) => setSettings({...settings, restaurantName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={settings.phone}
                    onChange={(e) => setSettings({...settings, phone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <input
                    type="text"
                    value={settings.address}
                    onChange={(e) => setSettings({...settings, address: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={settings.email}
                    onChange={(e) => setSettings({...settings, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                  <select
                    value={settings.currency}
                    onChange={(e) => setSettings({...settings, currency: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="NPR">NPR (Nepalese Rupee)</option>
                    <option value="USD">USD (US Dollar)</option>
                    <option value="EUR">EUR (Euro)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Business Settings */}
          {activeSection === 'business' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Business Hours</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Opening Time</label>
                  <input
                    type="time"
                    value={settings.operatingHours.open}
                    onChange={(e) => handleSettingChange('operatingHours', 'open', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Closing Time</label>
                  <input
                    type="time"
                    value={settings.operatingHours.close}
                    onChange={(e) => handleSettingChange('operatingHours', 'close', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Current Operating Hours</h4>
                <p className="text-blue-700">
                  {settings.operatingHours.open} - {settings.operatingHours.close}
                </p>
              </div>
            </div>
          )}

          {/* Pricing Settings */}
          {activeSection === 'pricing' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Pricing Configuration</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tax Rate (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={settings.taxRate}
                    onChange={(e) => setSettings({...settings, taxRate: parseFloat(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Service Charge (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={settings.serviceCharge}
                    onChange={(e) => setSettings({...settings, serviceCharge: parseFloat(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Fee ({settings.currency})</label>
                  <input
                    type="number"
                    min="0"
                    value={settings.deliveryFee}
                    onChange={(e) => setSettings({...settings, deliveryFee: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Order Amount ({settings.currency})</label>
                  <input
                    type="number"
                    min="0"
                    value={settings.minOrderAmount}
                    onChange={(e) => setSettings({...settings, minOrderAmount: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Notifications Settings */}
          {activeSection === 'notifications' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Notification Preferences</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <h4 className="font-medium">Email Notifications</h4>
                    <p className="text-sm text-gray-600">Receive order updates via email</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.notifications.email}
                      onChange={(e) => handleSettingChange('notifications', 'email', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <h4 className="font-medium">SMS Notifications</h4>
                    <p className="text-sm text-gray-600">Receive order updates via SMS</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.notifications.sms}
                      onChange={(e) => handleSettingChange('notifications', 'sms', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <h4 className="font-medium">Push Notifications</h4>
                    <p className="text-sm text-gray-600">Receive browser push notifications</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.notifications.push}
                      onChange={(e) => handleSettingChange('notifications', 'push', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Appearance Settings */}
          {activeSection === 'appearance' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Appearance & Language</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Theme</label>
                  <select
                    value={settings.theme}
                    onChange={(e) => setSettings({...settings, theme: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="auto">Auto (System)</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
                  <select
                    value={settings.language}
                    onChange={(e) => setSettings({...settings, language: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="en">English</option>
                    <option value="ne">नेपाली (Nepali)</option>
                    <option value="hi">हिंदी (Hindi)</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
          <div>
            {showSaveMessage && (
              <div className="flex items-center space-x-2 text-green-600">
                <span>✅</span>
                <span className="text-sm font-medium">Settings saved successfully!</span>
              </div>
            )}
          </div>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>

      {/* System Information */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200">
        <h3 className="text-lg font-semibold mb-4">System Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900">Version</h4>
            <p className="text-sm text-gray-600">Food Zone Admin v2.1.0</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900">Last Updated</h4>
            <p className="text-sm text-gray-600">{new Date().toLocaleDateString()}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900">Database Status</h4>
            <p className="text-sm text-green-600">✅ Connected</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPremium;
