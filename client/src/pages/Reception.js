import React, { useState, useEffect } from 'react';
import { fetchApi, getSocketUrl } from '../services/apiService';
import io from 'socket.io-client';
import PushNotificationManager from '../utils/pushNotifications';
import OfflineStorageManager from '../utils/offlineStorage';
import ReceptionPayment from '../components/ReceptionPayment';

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
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [balanceType, setBalanceType] = useState('');
  const [cashDenominations, setCashDenominations] = useState({
    1000: 0,
    500: 0,
    100: 0,
    50: 0,
    20: 0,
    10: 0,
    5: 0
  });
  const [showTransactionMonitor, setShowTransactionMonitor] = useState(false);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [dailySummary, setDailySummary] = useState({
    totalCash: 0,
    totalOnline: 0,
    totalCard: 0,
    transactionCount: 0
  });
  const [totalBalance, setTotalBalance] = useState(0);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseCause, setExpenseCause] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationType, setNotificationType] = useState('success');
  const [showCashHandoverModal, setShowCashHandoverModal] = useState(false);
  const [handoverAmount, setHandoverAmount] = useState('');
  const [handoverTo, setHandoverTo] = useState('');
  const [handoverReason, setHandoverReason] = useState('');
  const [showDaybookSummaryModal, setShowDaybookSummaryModal] = useState(false);
  const [daybookData, setDaybookData] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

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
        ['pending', 'preparing', 'ready', 'completed'].includes(order.status)
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

  const handlePaymentClick = (order) => {
    setSelectedOrder(order);
    setShowPaymentModal(true);
  };

  const handlePaymentComplete = (updatedOrder) => {
    // Update the order in both active and completed orders
    setActiveOrders(prevOrders => 
      prevOrders.map(order => 
        order.id === updatedOrder.id ? { ...order, ...updatedOrder } : order
      )
    );
    setCompletedOrders(prevOrders => 
      prevOrders.map(order => 
        order.id === updatedOrder.id ? { ...order, ...updatedOrder } : order
      )
    );
    setShowPaymentModal(false);
    setSelectedOrder(null);
    
    // Show success notification
    if (updatedOrder.success) {
      setNotificationMessage(updatedOrder.message || 'Payment processed successfully');
      setNotificationType('success');
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
    }
    
    // Refresh orders and transaction data for real-time updates
    fetchAllOrders();
    if (showTransactionMonitor) {
      fetchTransactionData();
    }
  };

  const handlePaymentCancel = () => {
    setShowPaymentModal(false);
    setSelectedOrder(null);
  };

  const handleBalanceClick = (type) => {
    setBalanceType(type);
    setShowBalanceModal(true);
    // Reset denominations
    setCashDenominations({
      5: 0,
      10: 0,
      20: 0,
      50: 0,
      100: 0,
      500: 0,
      1000: 0
    });
    setTotalBalance(0);
  };

  const handleDenominationChange = (denomination, count) => {
    const newDenominations = {
      ...cashDenominations,
      [denomination]: parseInt(count) || 0
    };
    setCashDenominations(newDenominations);
    
    // Calculate total balance
    const total = Object.entries(newDenominations).reduce((sum, [denom, count]) => {
      return sum + (parseInt(denom) * parseInt(count));
    }, 0);
    setTotalBalance(total);
  };

  const handleBalanceSubmit = async (e) => {
    // Prevent any default behavior and stop propagation
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    console.log('Balance submit clicked:', { balanceType, totalBalance, cashDenominations });
    
    try {
      // Validate required data
      if (!balanceType) {
        setNotificationMessage('Error: Balance type not set. Please close and reopen the modal.');
        setNotificationType('error');
        setShowNotification(true);
        setTimeout(() => setShowNotification(false), 3000);
        return;
      }

      if (totalBalance < 0) {
        setNotificationMessage('Error: Balance amount cannot be negative.');
        setNotificationType('error');
        setShowNotification(true);
        setTimeout(() => setShowNotification(false), 3000);
        return;
      }

      const transactionData = {
        transaction_type: balanceType === 'opening' ? 'opening_balance' : 'closing_balance',
        amount: totalBalance || 0,
        description: `${balanceType === 'opening' ? 'Opening' : 'Closing'} balance - Cash count: ${Object.entries(cashDenominations).map(([denom, count]) => `${count}x${denom}`).filter(item => !item.startsWith('0x')).join(', ')}`,
        date: new Date().toISOString()
      };

      console.log('Submitting transaction:', transactionData);
      
      // Use proper error handling with timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 10000)
      );
      
      const response = await Promise.race([
        fetchApi.post('/api/daybook/transaction', transactionData),
        timeoutPromise
      ]);
      
      console.log('Transaction response:', response);
      
      // Reset all states
      setShowBalanceModal(false);
      setBalanceType('');
      setCashDenominations({
        5: 0,
        10: 0,
        20: 0,
        50: 0,
        100: 0,
        500: 0,
        1000: 0
      });
      setTotalBalance(0);
      
      // Show success notification
      setNotificationMessage(`✅ ${balanceType === 'opening' ? 'Opening' : 'Closing'} balance recorded: NPR ${(totalBalance || 0).toLocaleString()}`);
      setNotificationType('success');
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
      
      // Refresh transaction data for real-time updates
      if (showTransactionMonitor) {
        fetchTransactionData();
      }
      
      console.log(`✅ ${balanceType === 'opening' ? 'Opening' : 'Closing'} balance recorded: NPR ${totalBalance}`);
    } catch (error) {
      console.error('Error recording balance:', error);
      
      let errorMessage = 'Failed to record balance. Please try again.';
      if (error.message === 'Request timeout') {
        errorMessage = 'Request timed out. Please check your connection and try again.';
      } else if (error.response) {
        errorMessage = `Server error: ${error.response.status}. Please try again.`;
      } else if (error.message) {
        errorMessage = `Error: ${error.message}`;
      }
      
      setNotificationMessage(errorMessage);
      setNotificationType('error');
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 5000);
    }
  };

  const handleBalanceCancel = () => {
    setShowBalanceModal(false);
    setCashDenominations({
      5: 0,
      10: 0,
      20: 0,
      50: 0,
      100: 0,
      500: 0,
      1000: 0
    });
    setTotalBalance(0);
  };

  // Fetch transaction data for monitoring with real-time updates
  const fetchTransactionData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Use timeout for better error handling
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 8000)
      );
      
      const response = await Promise.race([
        fetchApi.get(`/api/daybook/summary?date=${today}`),
        timeoutPromise
      ]);
      
      if (response && response.data) {
        setDailySummary({
          totalCash: response.data.cash_payments || 0,
          totalOnline: response.data.online_payments || 0,
          totalCard: response.data.card_payments || 0,
          transactionCount: response.data.transaction_count || 0
        });
      }

      // Fetch recent transactions with timeout
      const transactionsResponse = await Promise.race([
        fetchApi.get('/api/daybook/recent-transactions'),
        timeoutPromise
      ]);
      
      if (transactionsResponse && transactionsResponse.data) {
        setRecentTransactions(transactionsResponse.data.slice(0, 10)); // Last 10 transactions
      }
    } catch (error) {
      console.error('Error fetching transaction data:', error);
      
      if (error.message !== 'Request timeout') {
        setNotificationMessage('Failed to fetch latest transaction data');
        setNotificationType('error');
        setShowNotification(true);
        setTimeout(() => setShowNotification(false), 3000);
      }
    }
  };

  // Handle transaction monitor toggle with real-time updates
  const handleTransactionMonitorToggle = () => {
    if (!showTransactionMonitor) {
      fetchTransactionData();
      // Set up periodic refresh for real-time updates
      const interval = setInterval(() => {
        if (showTransactionMonitor) {
          fetchTransactionData();
        } else {
          clearInterval(interval);
        }
      }, 30000); // Refresh every 30 seconds
    }
    setShowTransactionMonitor(!showTransactionMonitor);
  };

  // Handle expense modal
  const handleExpenseClick = () => {
    setShowExpenseModal(true);
    setExpenseCause('');
    setExpenseAmount('');
  };

  const handleExpenseSubmit = async () => {
    if (!expenseCause.trim() || !expenseAmount || parseFloat(expenseAmount) <= 0) {
      setNotificationMessage('Please enter both expense cause and amount');
      setNotificationType('error');
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
      return;
    }

    try {
      const transactionData = {
        transaction_type: 'expense',
        amount: parseFloat(expenseAmount),
        description: `Expense: ${expenseCause.trim()}`,
        date: new Date().toISOString()
      };

      // Use proper error handling with timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 10000)
      );
      
      const response = await Promise.race([
        fetchApi.post('/api/daybook/transaction', transactionData),
        timeoutPromise
      ]);
      
      setShowExpenseModal(false);
      setExpenseCause('');
      setExpenseAmount('');
      
      // Show success notification
      setNotificationMessage(`✅ Expense recorded: ${expenseCause} - NPR ${parseFloat(expenseAmount).toLocaleString()}`);
      setNotificationType('success');
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
      
      // Refresh transaction data for real-time updates
      if (showTransactionMonitor) {
        fetchTransactionData();
      }
      
      console.log(`✅ Expense recorded: ${expenseCause} - NPR ${expenseAmount}`);
    } catch (error) {
      console.error('Error recording expense:', error);
      
      let errorMessage = 'Failed to record expense. Please try again.';
      if (error.message === 'Request timeout') {
        errorMessage = 'Request timed out. Please check your connection and try again.';
      } else if (error.response) {
        errorMessage = `Server error: ${error.response.status}. Please try again.`;
      } else if (error.message) {
        errorMessage = `Error: ${error.message}`;
      }
      
      setNotificationMessage(errorMessage);
      setNotificationType('error');
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 5000);
    }
  };

  const handleExpenseCancel = () => {
    setShowExpenseModal(false);
    setExpenseCause('');
    setExpenseAmount('');
  };

  // Handle cash handover functionality
  const handleCashHandoverClick = () => {
    setShowCashHandoverModal(true);
    setHandoverAmount('');
    setHandoverTo('');
    setHandoverReason('');
  };

  const handleCashHandoverSubmit = async () => {
    if (!handoverTo.trim() || !handoverAmount || parseFloat(handoverAmount) <= 0) {
      setNotificationMessage('Please enter handover recipient and amount');
      setNotificationType('error');
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
      return;
    }

    try {
      const transactionData = {
        transaction_type: 'cash_handover',
        amount: parseFloat(handoverAmount),
        description: `Cash handover to ${handoverTo.trim()}${handoverReason.trim() ? ` - ${handoverReason.trim()}` : ''}`,
        date: new Date().toISOString()
      };

      await fetchApi.post('/api/daybook/transaction', transactionData);
      
      setShowCashHandoverModal(false);
      setHandoverAmount('');
      setHandoverTo('');
      setHandoverReason('');
      
      setNotificationMessage(`✅ Cash handover recorded: NPR ${parseFloat(handoverAmount).toLocaleString()} to ${handoverTo}`);
      setNotificationType('success');
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
      
      console.log(`✅ Cash handover recorded: ${handoverTo} - NPR ${handoverAmount}`);
    } catch (error) {
      console.error('Error recording cash handover:', error);
      setNotificationMessage(`Failed to record cash handover: ${error.message || 'Unknown error'}. Please try again.`);
      setNotificationType('error');
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 5000);
    }
  };

  const handleCashHandoverCancel = () => {
    setShowCashHandoverModal(false);
    setHandoverAmount('');
    setHandoverTo('');
    setHandoverReason('');
  };

  // Handle daybook summary functionality
  const handleDaybookSummaryClick = async () => {
    setShowDaybookSummaryModal(true);
    await fetchDaybookData(selectedDate);
  };

  const fetchDaybookData = async (date) => {
    try {
      const response = await fetchApi.get(`/api/daybook/${date}`);
      setDaybookData(response);
    } catch (error) {
      console.error('Error fetching daybook data:', error);
      setNotificationMessage('Failed to fetch daybook data. Please try again.');
      setNotificationType('error');
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
    }
  };

  const handleDateChange = async (newDate) => {
    setSelectedDate(newDate);
    if (showDaybookSummaryModal) {
      await fetchDaybookData(newDate);
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
      case 'available':
      case 'empty': return 'bg-green-100 border-green-300 text-green-800';
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
      case 'available':
      case 'empty': return '✅';
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
              {/* Daybook Management Controls */}
              <div className="flex items-center space-x-2">
                {/* Opening Balance Button */}
                <button
                  onClick={() => handleBalanceClick('opening')}
                  className="flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 shadow-md hover:shadow-lg transform hover:scale-105"
                >
                  <span className="text-lg">💰</span>
                  <span>Opening Balance</span>
                </button>
                
                {/* Closing Balance Button */}
                <button
                  onClick={() => handleBalanceClick('closing')}
                  className="flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 bg-gradient-to-r from-orange-500 to-red-600 text-white hover:from-orange-600 hover:to-red-700 shadow-md hover:shadow-lg transform hover:scale-105"
                >
                  <span className="text-lg">🏁</span>
                  <span>Closing Balance</span>
                </button>

                {/* Cash Handover Button */}
                <button
                  onClick={handleCashHandoverClick}
                  className="flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 shadow-md hover:shadow-lg transform hover:scale-105"
                >
                  <span className="text-lg">🤝</span>
                  <span>Cash Handover</span>
                </button>

                {/* Expense Button */}
                <button
                  onClick={handleExpenseClick}
                  className="flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 bg-gradient-to-r from-red-500 to-pink-600 text-white hover:from-red-600 hover:to-pink-700 shadow-md hover:shadow-lg transform hover:scale-105"
                >
                  <span className="text-lg">💸</span>
                  <span>Record Expense</span>
                </button>

                {/* Transaction Monitor Button */}
                <button
                  onClick={handleTransactionMonitorToggle}
                  className="flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 bg-gradient-to-r from-purple-500 to-violet-600 text-white hover:from-purple-600 hover:to-violet-700 shadow-md hover:shadow-lg transform hover:scale-105"
                >
                  <span className="text-lg">📊</span>
                  <span>Daily Report</span>
                </button>

                {/* Daybook Summary Button */}
                <button
                  onClick={handleDaybookSummaryClick}
                  className="flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 bg-gradient-to-r from-teal-500 to-cyan-600 text-white hover:from-teal-600 hover:to-cyan-700 shadow-md hover:shadow-lg transform hover:scale-105"
                >
                  <span className="text-lg">📋</span>
                  <span>Daybook Summary</span>
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
                            {order.payment_status === 'paid' ? (
                              <div className="flex items-center space-x-2">
                                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                                  {order.payment_method === 'cash' && '💵 Cash Payment'}
                                  {order.payment_method === 'phonepe' && '📱 PhonePay Payment'}
                                  {order.payment_method === 'card' && '💳 Card Payment'}
                                  {!order.payment_method && '💰 Paid'}
                                </span>
                                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                                  NPR {parseFloat(order.total || order.total_amount || 0).toFixed(0)}
                                </span>
                              </div>
                            ) : (
                              <button
                                onClick={() => handlePaymentClick(order)}
                                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 shadow-sm"
                              >
                                💳 Process Payment
                              </button>
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
                      <div className="text-xs capitalize mb-3">
                        {tableStatus.status === 'empty' ? 'available' : tableStatus.status.replace('_', ' ')}
                      </div>
                      
                      {tableStatus.customer_name && (
                        <div className="text-xs mb-2">
                          <p className="font-medium">{tableStatus.customer_name}</p>
                          {tableStatus.total_amount > 0 && (
                            <p className="text-gray-600">{formatCurrency(tableStatus.total_amount)}</p>
                          )}
                        </div>
                      )}
                      
                      {tableStatus.status !== 'available' && tableStatus.status !== 'empty' && (
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

        {/* Payment Modal */}
        {showPaymentModal && selectedOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
              <ReceptionPayment
                order={selectedOrder}
                onPaymentComplete={handlePaymentComplete}
                onCancel={handlePaymentCancel}
              />
            </div>
          </div>
        )}

        {/* Balance Modal */}
        {showBalanceModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="text-center mb-6">
                <div className="text-4xl mb-3">{balanceType === 'opening' ? '💰' : '🏁'}</div>
                <h3 className="text-xl font-semibold text-gray-900">
                  {balanceType === 'opening' ? 'Opening Balance' : 'Closing Balance'}
                </h3>
                <p className="text-gray-600 mt-2">Count cash denominations</p>
              </div>

              {/* Cash Denomination Counter */}
              <div className="space-y-4 mb-6">
                {Object.entries(cashDenominations).map(([denomination, count]) => (
                  <div key={denomination} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-8 bg-green-600 text-white rounded flex items-center justify-center font-bold text-sm">
                        {denomination}
                      </div>
                      <span className="font-medium">NPR {denomination} Notes</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => handleDenominationChange(denomination, Math.max(0, count - 1))}
                        className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        value={count}
                        onChange={(e) => handleDenominationChange(denomination, e.target.value)}
                        className="w-16 text-center border border-gray-300 rounded px-2 py-1"
                        min="0"
                      />
                      <button
                        onClick={() => handleDenominationChange(denomination, count + 1)}
                        className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center hover:bg-green-600 transition-colors"
                      >
                        +
                      </button>
                      <div className="w-20 text-right font-medium">
                        NPR {(parseInt(denomination) * count).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total Balance */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-blue-900">Total Balance:</span>
                  <span className="text-2xl font-bold text-blue-600">NPR {totalBalance.toLocaleString()}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={handleBalanceCancel}
                  className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleBalanceSubmit}
                  onMouseDown={(e) => e.preventDefault()}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
                  style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
                >
                  Record {balanceType === 'opening' ? 'Opening' : 'Closing'} Balance
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Custom Notification */}
        {showNotification && (
          <div className="fixed top-4 right-4 z-[60] max-w-sm">
            <div className={`p-4 rounded-lg shadow-lg ${
              notificationType === 'success' 
                ? 'bg-green-500 text-white' 
                : 'bg-red-500 text-white'
            } animate-slide-in`}>
              <div className="flex items-center space-x-2">
                <div className="text-xl">
                  {notificationType === 'success' ? '✅' : '❌'}
                </div>
                <div className="flex-1 text-sm font-medium">
                  {notificationMessage}
                </div>
                <button
                  onClick={() => setShowNotification(false)}
                  className="text-white hover:text-gray-200 text-lg font-bold"
                >
                  ×
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Expense Modal */}
        {showExpenseModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
              <div className="text-center mb-6">
                <div className="text-4xl mb-3">💸</div>
                <h3 className="text-xl font-semibold text-gray-900">Record Expense</h3>
                <p className="text-gray-600 mt-2">Enter expense details</p>
              </div>

              <div className="space-y-4 mb-6">
                {/* Expense Cause */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expense Cause
                  </label>
                  <input
                    type="text"
                    value={expenseCause}
                    onChange={(e) => setExpenseCause(e.target.value)}
                    placeholder="e.g., Office supplies, Maintenance, Utilities"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>

                {/* Expense Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount (NPR)
                  </label>
                  <input
                    type="number"
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
              </div>

              {/* Preview */}
              {expenseCause && expenseAmount && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-red-800">Expense Preview:</p>
                      <p className="text-red-700">{expenseCause}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-red-600">NPR {parseFloat(expenseAmount || 0).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={handleExpenseCancel}
                  className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExpenseSubmit}
                  disabled={!expenseCause.trim() || !expenseAmount || parseFloat(expenseAmount) <= 0}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Record Expense
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Cash Handover Modal */}
        {showCashHandoverModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
              <div className="text-center mb-6">
                <div className="text-4xl mb-3">🤝</div>
                <h3 className="text-xl font-semibold text-gray-900">Cash Handover</h3>
                <p className="text-gray-600 mt-2">Record cash handover transaction</p>
              </div>

              <div className="space-y-4 mb-6">
                {/* Handover To */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Handover To (Recipient)
                  </label>
                  <input
                    type="text"
                    value={handoverTo}
                    onChange={(e) => setHandoverTo(e.target.value)}
                    placeholder="e.g., Manager, Shift Leader, Staff Name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Handover Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount (NPR)
                  </label>
                  <input
                    type="number"
                    value={handoverAmount}
                    onChange={(e) => setHandoverAmount(e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Handover Reason */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason (Optional)
                  </label>
                  <input
                    type="text"
                    value={handoverReason}
                    onChange={(e) => setHandoverReason(e.target.value)}
                    placeholder="e.g., End of shift, Emergency, Deposit"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Preview */}
              {handoverTo && handoverAmount && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-blue-800">Handover Preview:</p>
                      <p className="text-blue-700">To: {handoverTo}</p>
                      {handoverReason && <p className="text-blue-600 text-sm">{handoverReason}</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-blue-600">NPR {parseFloat(handoverAmount || 0).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={handleCashHandoverCancel}
                  className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCashHandoverSubmit}
                  disabled={!handoverTo.trim() || !handoverAmount || parseFloat(handoverAmount) <= 0}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Record Handover
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Daybook Summary Modal */}
        {showDaybookSummaryModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="text-center mb-6">
                <div className="text-4xl mb-3">📋</div>
                <h3 className="text-xl font-semibold text-gray-900">Daybook Summary</h3>
                <p className="text-gray-600 mt-2">Complete financial overview</p>
              </div>

              {/* Date Selector */}
              <div className="mb-6 flex justify-center">
                <div className="flex items-center space-x-4">
                  <label className="text-sm font-medium text-gray-700">Select Date:</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    onClick={() => fetchDaybookData(selectedDate)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    🔄 Refresh
                  </button>
                </div>
              </div>

              {daybookData && (
                <div className="space-y-6">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-green-600">Opening Balance</p>
                          <p className="text-2xl font-bold text-green-900">NPR {(daybookData.opening_balance || 0).toLocaleString()}</p>
                        </div>
                        <div className="text-2xl">💰</div>
                      </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-blue-600">Total Income</p>
                          <p className="text-2xl font-bold text-blue-900">NPR {(daybookData.total_income || 0).toLocaleString()}</p>
                        </div>
                        <div className="text-2xl">📈</div>
                      </div>
                    </div>

                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-red-600">Total Expenses</p>
                          <p className="text-2xl font-bold text-red-900">NPR {(daybookData.expenses || 0).toLocaleString()}</p>
                        </div>
                        <div className="text-2xl">💸</div>
                      </div>
                    </div>

                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-purple-600">Net Balance</p>
                          <p className="text-2xl font-bold text-purple-900">NPR {(daybookData.calculated_closing_balance || 0).toLocaleString()}</p>
                        </div>
                        <div className="text-2xl">🏁</div>
                      </div>
                    </div>
                  </div>

                  {/* Payment Breakdown */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                      <div className="text-center">
                        <div className="text-2xl mb-2">💵</div>
                        <p className="text-sm font-medium text-emerald-600">Cash Payments</p>
                        <p className="text-xl font-bold text-emerald-900">NPR {(daybookData.cash_payments || 0).toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
                      <div className="text-center">
                        <div className="text-2xl mb-2">📱</div>
                        <p className="text-sm font-medium text-cyan-600">Online Payments</p>
                        <p className="text-xl font-bold text-cyan-900">NPR {(daybookData.online_payments || 0).toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                      <div className="text-center">
                        <div className="text-2xl mb-2">💳</div>
                        <p className="text-sm font-medium text-indigo-600">Card Payments</p>
                        <p className="text-xl font-bold text-indigo-900">NPR {(daybookData.card_payments || 0).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                  {/* Recent Transactions */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">All Transactions for {selectedDate}</h4>
                    <div className="bg-gray-50 rounded-lg max-h-64 overflow-y-auto">
                      {daybookData.transactions && daybookData.transactions.length > 0 ? (
                        <div className="divide-y divide-gray-200">
                          {daybookData.transactions.map((transaction, index) => (
                            <div key={index} className="p-4 flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className="text-lg">
                                  {transaction.transaction_type === 'cash_payment' ? '💵' : 
                                   transaction.transaction_type === 'online_payment' ? '📱' : 
                                   transaction.transaction_type === 'card_payment' ? '💳' : 
                                   transaction.transaction_type === 'opening_balance' ? '💰' : 
                                   transaction.transaction_type === 'closing_balance' ? '🏁' : 
                                   transaction.transaction_type === 'cash_handover' ? '🤝' : 
                                   transaction.transaction_type === 'expense' ? '💸' : '📊'}
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900">{transaction.description || 'Transaction'}</p>
                                  <p className="text-sm text-gray-500">
                                    {new Date(transaction.created_at).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className={`font-bold ${
                                  transaction.transaction_type === 'expense' || transaction.transaction_type === 'cash_handover'
                                    ? 'text-red-600' : 'text-green-600'
                                }`}>
                                  {transaction.transaction_type === 'expense' || transaction.transaction_type === 'cash_handover' ? '-' : '+'}NPR {Math.abs(transaction.amount).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-8 text-center text-gray-500">
                          <div className="text-4xl mb-2">📋</div>
                          <p>No transactions found for this date</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => setShowDaybookSummaryModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Transaction Monitor Modal */}
        {showTransactionMonitor && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="text-center mb-6">
                <div className="text-4xl mb-3">📊</div>
                <h3 className="text-xl font-semibold text-gray-900">Transaction Monitor</h3>
                <p className="text-gray-600 mt-2">Real-time financial tracking</p>
              </div>

              {/* Daily Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-600">Cash Payments</p>
                      <p className="text-2xl font-bold text-green-900">NPR {dailySummary.totalCash.toLocaleString()}</p>
                    </div>
                    <div className="text-2xl">💵</div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-600">Online Payments</p>
                      <p className="text-2xl font-bold text-blue-900">NPR {dailySummary.totalOnline.toLocaleString()}</p>
                    </div>
                    <div className="text-2xl">📱</div>
                  </div>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-purple-600">Card Payments</p>
                      <p className="text-2xl font-bold text-purple-900">NPR {dailySummary.totalCard.toLocaleString()}</p>
                    </div>
                    <div className="text-2xl">💳</div>
                  </div>
                </div>

                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-orange-600">Total Transactions</p>
                      <p className="text-2xl font-bold text-orange-900">{dailySummary.transactionCount}</p>
                    </div>
                    <div className="text-2xl">📈</div>
                  </div>
                </div>
              </div>

              {/* Total Revenue */}
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-6 mb-6">
                <div className="text-center">
                  <p className="text-lg font-medium text-indigo-600 mb-2">Total Daily Revenue</p>
                  <p className="text-4xl font-bold text-indigo-900">
                    NPR {(dailySummary.totalCash + dailySummary.totalOnline + dailySummary.totalCard).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Recent Transactions */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Recent Transactions</h4>
                <div className="bg-gray-50 rounded-lg max-h-64 overflow-y-auto">
                  {recentTransactions.length > 0 ? (
                    <div className="divide-y divide-gray-200">
                      {recentTransactions.map((transaction, index) => (
                        <div key={index} className="p-4 flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="text-lg">
                              {transaction.transaction_type === 'cash_payment' ? '💵' : 
                               transaction.transaction_type === 'online_payment' ? '📱' : 
                               transaction.transaction_type === 'card_payment' ? '💳' : 
                               transaction.transaction_type === 'opening_balance' ? '💰' : 
                               transaction.transaction_type === 'closing_balance' ? '🏁' : '📊'}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{transaction.description || 'Transaction'}</p>
                              <p className="text-sm text-gray-500">
                                {new Date(transaction.created_at).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`font-bold ${transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              NPR {Math.abs(transaction.amount).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-gray-500">
                      <div className="text-4xl mb-2">📊</div>
                      <p>No recent transactions found</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={fetchTransactionData}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  🔄 Refresh Data
                </button>
                <button
                  onClick={() => setShowTransactionMonitor(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reception;
