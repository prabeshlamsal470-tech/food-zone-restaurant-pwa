import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import audioManager from '../utils/audioNotifications';
import { fetchApi, getSocketUrl } from '../services/apiService';

// Import premium components
import OrdersManagement from '../components/premium/OrdersManagement';

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

    try {
      const response = await fetchApi.post('/api/admin/login', { password });
      if (response.success) {
        localStorage.setItem('adminAuthenticated', 'true');
        setIsAuthenticated(true);
        setPassword('');
      }
    } catch (err) {
      setError(err.message || 'Invalid password');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminAuthenticated');
    setIsAuthenticated(false);
    setPassword('');
    setError(null);
  };


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

  // Handler functions
  const handleClearTable = async (tableNumber) => {
    // Implementation for clearing table
    console.log('Clear table:', tableNumber);
  };

  const handleDeleteOrder = (orderId, orderNumber) => {
    // Implementation for deleting order
    console.log('Delete order:', orderId, orderNumber);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardOverview orders={orders} customers={customers} dbSummary={dbSummary} />;
      case 'orders':
        return (
          <OrdersManagement 
            orders={orders} 
            onClearTable={handleClearTable}
            onCompleteOrder={() => {}}
            onDeleteOrder={handleDeleteOrder}
          />
        );
      case 'menu':
        return <MenuManagementPlaceholder />;
      case 'tables':
        return <TablesManagement />;
      case 'customers':
        return <CustomersManagement customers={customers} />;
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
      return sum + (order.total_amount || 0);
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
                    <p className="font-semibold text-slate-900">NPR {order.total_amount || 0}</p>
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
                    <p className="text-xs text-slate-500">{order.items?.length || 0} items</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-900">NPR {order.total_amount || 0}</p>
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

const MenuManagementPlaceholder = () => (
  <div className="bg-white rounded-2xl p-6 border border-slate-200">
    <h2 className="text-xl font-semibold mb-4">Menu Management</h2>
    <p className="text-slate-600">Menu management interface coming soon...</p>
  </div>
);

const TablesManagement = () => (
  <div className="bg-white rounded-2xl p-6 border border-slate-200">
    <h2 className="text-xl font-semibold mb-4">Tables & Reservations</h2>
    <p className="text-slate-600">Table management interface coming soon...</p>
  </div>
);

const CustomersManagement = ({ customers }) => (
  <div className="bg-white rounded-2xl p-6 border border-slate-200">
    <h2 className="text-xl font-semibold mb-4">Customer Management</h2>
    <p className="text-slate-600">Customer management interface coming soon...</p>
  </div>
);

const AnalyticsViewPlaceholder = ({ orders }) => (
  <div className="bg-white rounded-2xl p-6 border border-slate-200">
    <h2 className="text-xl font-semibold mb-4">Analytics & Reports</h2>
    <p className="text-slate-600">Analytics dashboard coming soon...</p>
  </div>
);

const StaffManagement = () => (
  <div className="bg-white rounded-2xl p-6 border border-slate-200">
    <h2 className="text-xl font-semibold mb-4">Staff Management</h2>
    <p className="text-slate-600">Staff management interface coming soon...</p>
  </div>
);

const SettingsView = () => (
  <div className="bg-white rounded-2xl p-6 border border-slate-200">
    <h2 className="text-xl font-semibold mb-4">Settings</h2>
    <p className="text-slate-600">Settings interface coming soon...</p>
  </div>
);

export default AdminPremium;
