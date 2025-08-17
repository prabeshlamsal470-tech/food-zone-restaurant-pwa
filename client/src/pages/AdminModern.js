import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import audioManager from '../utils/audioNotifications';
import AdminSettings from '../components/AdminSettings';
import { apiService, fetchApi, getSocketUrl } from '../services/apiService';

// Modern UI Components
import Sidebar from '../components/ui/Sidebar';
import DashboardHeader from '../components/ui/DashboardHeader';
import DashboardOverview from '../components/dashboard/DashboardOverview';

// Views and Modals
import { 
  LoginForm, 
  DineInOrdersView, 
  DeliveryOrdersView, 
  OrderHistoryView, 
  CustomersView, 
  ComingSoonView 
} from '../components/AdminModernViews';
import { 
  ConfirmModal, 
  ConfirmDialog, 
  DeleteDialog 
} from '../components/AdminModernModals';
import { useAdminHandlers } from '../components/AdminModernHandlers';

// Import the modern theme
import '../styles/adminTheme.css';

const AdminModern = () => {
  const [orders, setOrders] = useState([]);
  const [orderHistory, setOrderHistory] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [dbSummary, setDbSummary] = useState(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('adminAuthenticated') === 'true';
  });
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [, setSocket] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [tableToDelete, setTableToDelete] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ show: false, orderId: null, message: '' });
  const [deleteDialog, setDeleteDialog] = useState({ show: false, orderId: null, orderNumber: '', password: '' });
  const [activeTab, setActiveTab] = useState('dashboard');

  // Initialize handlers
  const handlers = useAdminHandlers(
    setShowConfirmModal,
    setTableToDelete,
    setConfirmDialog,
    setDeleteDialog,
    fetchOrders,
    fetchOrderHistory
  );

  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders();
      fetchCustomers();
      fetchDatabaseSummary();

      audioManager.requestPermissions();

      const newSocket = io(getSocketUrl());
      setSocket(newSocket);
      
      newSocket.on('newOrder', (order) => {
        console.log('📨 New order received:', order);
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
        console.log('🧹 Table cleared event received for table:', tableId);
        setOrders(prevOrders => 
          prevOrders.filter(order => order.table_id !== tableId)
        );
      });

      return () => {
        newSocket.close();
      };
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (activeTab === 'history' && orderHistory.length === 0) {
      fetchOrderHistory();
    }
  }, [activeTab, orderHistory.length]);

  async function fetchOrders() {
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
  }

  async function fetchOrderHistory() {
    try {
      setIsLoadingHistory(true);
      const data = await fetchApi.get('/api/order-history');
      setOrderHistory(data);
    } catch (err) {
      console.error('Error fetching order history:', err);
    } finally {
      setIsLoadingHistory(false);
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

  const handleLogin = (e) => {
    handlers.handleLogin(e, password, setIsAuthenticated, setPassword, setError, setLoading, fetchApi);
  };

  const handleLogout = () => {
    handlers.handleLogout(setIsAuthenticated, setPassword, setError);
  };

  const confirmClearTable = () => {
    handlers.confirmClearTable(tableToDelete);
  };

  const confirmCompleteOrder = () => {
    handlers.confirmCompleteOrder(confirmDialog);
  };

  const confirmDeleteOrder = () => {
    handlers.confirmDeleteOrder(deleteDialog);
  };

  // Show login form if not authenticated
  if (!isAuthenticated) {
    return (
      <LoginForm
        password={password}
        setPassword={setPassword}
        showPassword={showPassword}
        setShowPassword={setShowPassword}
        handleLogin={handleLogin}
        loading={loading}
        error={error}
      />
    );
  }

  // Main dashboard layout
  return (
    <div className="admin-dashboard min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onLogout={handleLogout}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <DashboardHeader
          title={getPageTitle()}
          subtitle={getPageSubtitle()}
          actions={
            <div className="flex items-center gap-3">
              <button
                onClick={() => window.location.reload()}
                className="btn btn-secondary btn-sm"
              >
                🔄 Refresh
              </button>
            </div>
          }
        />

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-6">
          {renderPageContent()}
        </div>
      </div>

      {/* Modals */}
      <ConfirmModal
        showConfirmModal={showConfirmModal}
        tableToDelete={tableToDelete}
        confirmClearTable={confirmClearTable}
        cancelClearTable={handlers.cancelClearTable}
      />
      
      <ConfirmDialog
        confirmDialog={confirmDialog}
        setConfirmDialog={setConfirmDialog}
        confirmCompleteOrder={confirmCompleteOrder}
      />
      
      <DeleteDialog
        deleteDialog={deleteDialog}
        setDeleteDialog={setDeleteDialog}
        confirmDeleteOrder={confirmDeleteOrder}
      />
    </div>
  );

  function getPageTitle() {
    const titles = {
      dashboard: '📊 Dashboard Overview',
      'dine-in': '🍽️ Dine-in Orders',
      delivery: '🚚 Delivery Orders',
      history: '📜 Order History',
      customers: '👥 Customer Database',
      menu: '📋 Menu Management',
      tables: '🪑 Tables & Reservations',
      staff: '👨‍🍳 Staff Management',
      reports: '📈 Reports & Analytics',
      settings: '⚙️ Settings'
    };
    return titles[activeTab] || 'Food Zone Admin';
  }

  function getPageSubtitle() {
    const subtitles = {
      dashboard: 'Real-time overview of your restaurant operations',
      'dine-in': `${orders.filter(o => o.order_type === 'dine-in' && o.status !== 'completed').length} active table orders`,
      delivery: `${orders.filter(o => o.order_type === 'delivery' && o.status !== 'completed').length} active delivery orders`,
      history: `${orderHistory.length} completed orders`,
      customers: `${customers.length} total customers`,
      menu: 'Manage your menu items and categories',
      tables: 'Manage table configuration and reservations',
      staff: 'Manage your team and roles',
      reports: 'Business insights and analytics',
      settings: 'System configuration and preferences'
    };
    return subtitles[activeTab] || '';
  }

  function renderPageContent() {
    if (loading && activeTab !== 'dashboard') {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="loading-spinner mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return <DashboardOverview orders={orders} customers={customers} dbSummary={dbSummary} />;
      
      case 'dine-in':
        return (
          <DineInOrdersView
            orders={orders}
            handleClearTable={handlers.handleClearTable}
            openInGoogleMaps={handlers.openInGoogleMaps}
          />
        );
      
      case 'delivery':
        return (
          <DeliveryOrdersView
            orders={orders}
            handleCompleteDeliveryOrder={handlers.handleCompleteDeliveryOrder}
            handleDeleteOrder={handlers.handleDeleteOrder}
            openInGoogleMaps={handlers.openInGoogleMaps}
          />
        );
      
      case 'history':
        return (
          <OrderHistoryView
            orderHistory={orderHistory}
            isLoadingHistory={isLoadingHistory}
            handleDeleteOrder={handlers.handleDeleteOrder}
            formatDate={handlers.formatDate}
          />
        );
      
      case 'customers':
        return <CustomersView customers={customers} />;
      
      case 'settings':
        return <AdminSettings />;
      
      default:
        return <ComingSoonView feature={activeTab} />;
    }
  }
};

export default AdminModern;
