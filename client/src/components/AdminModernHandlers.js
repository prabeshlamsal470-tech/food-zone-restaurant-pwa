// Event handlers and utility functions for AdminModern component
import { apiService } from '../services/apiService';

export const useAdminHandlers = (
  setShowConfirmModal,
  setTableToDelete,
  setConfirmDialog,
  setDeleteDialog,
  fetchOrders,
  fetchOrderHistory
) => {
  const handleLogin = async (e, password, setIsAuthenticated, setPassword, setError, setLoading, fetchApi) => {
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

  const handleLogout = (setIsAuthenticated, setPassword, setError) => {
    setIsAuthenticated(false);
    localStorage.removeItem('adminAuthenticated');
    setPassword('');
    setError(null);
  };

  const handleClearTable = (tableId) => {
    setTableToDelete(tableId);
    setShowConfirmModal(true);
  };

  const confirmClearTable = async (tableToDelete) => {
    if (tableToDelete) {
      try {
        const response = await apiService.clearTableAdmin(tableToDelete);
        
        if (response.data.success) {
          await fetchOrders();
          console.log(`✅ Table ${tableToDelete} cleared successfully. ${response.data.movedToHistory} orders moved to history.`);
        }
        
        setShowConfirmModal(false);
        setTableToDelete(null);
      } catch (error) {
        console.error('❌ Error clearing table:', error);
      }
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

  const confirmCompleteOrder = async (confirmDialog) => {
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

  const confirmDeleteOrder = async (deleteDialog) => {
    const { orderId, password } = deleteDialog;
    
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5001'}/api/order/${orderId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password })
      });
      
      const result = await response.json();
      
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

  return {
    handleLogin,
    handleLogout,
    handleClearTable,
    confirmClearTable,
    cancelClearTable,
    handleCompleteDeliveryOrder,
    confirmCompleteOrder,
    handleDeleteOrder,
    confirmDeleteOrder,
    openInGoogleMaps,
    formatDate
  };
};
