import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import io from 'socket.io-client';
import { getSocketUrl, apiService } from '../services/apiService';
import { useCart } from '../context/CartContext';
import { decryptTableCode } from '../utils/tableEncryption';

const TableOrder = () => {
  const { tableId } = useParams();
  const navigate = useNavigate();
  const { cartItems, addToCart, removeFromCart, updateQuantity, clearCart, getTotalPrice, setTableContext } = useCart();
  const [menuItems, setMenuItems] = useState([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '' });
  const [orderSubmitted, setOrderSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  // const [showMenuSearch, setShowMenuSearch] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [actualTableNumber, setActualTableNumber] = useState(null);

  // Decrypt table code on component mount - ONLY encrypted codes allowed
  useEffect(() => {
    if (tableId) {
      // Block all numeric table IDs - only encrypted codes allowed
      if (!isNaN(tableId)) {
        setActualTableNumber(null);
        return;
      }
      
      // Only try to decrypt non-numeric table codes
      const decryptedTable = decryptTableCode(tableId);
      if (decryptedTable) {
        setActualTableNumber(decryptedTable);
        // Set table context for cart and menu components
        setTableContext(decryptedTable);
        // Store the encrypted table URL for proper navigation
        sessionStorage.setItem('currentTableUrl', window.location.pathname);
        localStorage.setItem('currentTableUrl', window.location.pathname);
      } else {
        setActualTableNumber(null);
      }
    }
  }, [tableId, setTableContext]);

  useEffect(() => {
    if (actualTableNumber && actualTableNumber >= 1 && actualTableNumber <= 25) {
      fetchMenuItems();
    }
  }, [actualTableNumber]);

  // Socket connection for real-time table clearing
  useEffect(() => {
    if (!actualTableNumber) return;
    
    const socket = io(getSocketUrl());
    
    socket.on('tableCleared', (data) => {
      console.log('🔔 Table cleared event received:', data);
      if (data.tableId === actualTableNumber) {
        clearCart();
        navigate('/');
        // Remove ALL localStorage items related to this table
        localStorage.removeItem(`customerInfo_${actualTableNumber}`);
        localStorage.removeItem(`tableSession_${actualTableNumber}`);
        localStorage.removeItem(`cart_table_${actualTableNumber}`);
        localStorage.removeItem(`cart_timestamp_${actualTableNumber}`);
        localStorage.removeItem(`order_submitted_${actualTableNumber}`);
        localStorage.removeItem('currentTable');
        localStorage.removeItem('tableTimestamp');
        
        // Clear any other table-related data
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.includes(`_${actualTableNumber}`) || key.includes(`table_${actualTableNumber}`) || key.includes(`${actualTableNumber}_`))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        
        console.log('🧹 All localStorage cleared for table:', actualTableNumber);
        
        // Show notification to customer
        alert('🍽️ Your table session has been cleared by restaurant staff. You will be redirected to the homepage.');
        
        // Redirect to homepage
        navigate('/', { replace: true });
      }
    });

    // Cleanup socket connection
    return () => {
      socket.disconnect();
    };
  }, [actualTableNumber, clearCart, navigate]);

  const fetchMenuItems = async () => {
    try {
      const response = await apiService.getMenu();
      setMenuItems(response.data);
    } catch (error) {
      console.error('Error fetching menu:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitOrder = () => {
    // Clear any previous error messages
    setErrorMessage('');

    // Validation
    if (!customerInfo.name.trim() || !customerInfo.phone.trim()) {
      setErrorMessage('Please provide your name and phone number');
      return;
    }

    if (cartItems.length === 0) {
      setErrorMessage('Your cart is empty');
      return;
    }

    // Show confirmation modal
    setShowConfirmModal(true);
  };

  const confirmSubmitOrder = async () => {
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const orderData = {
        tableId: actualTableNumber,
        customerName: customerInfo.name.trim(),
        phone: customerInfo.phone.trim(),
        items: cartItems.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          isCustom: item.isCustom || false
        }))
      };

      await apiService.createOrder(orderData);
      setOrderSubmitted(true);
      clearCart();
      setShowConfirmModal(false);
      
      // Store order submitted state for 30 minutes
      localStorage.setItem(`order_submitted_${actualTableNumber}`, Date.now().toString());
    } catch (error) {
      console.error('Error submitting order:', error);
      setErrorMessage('Failed to submit order. Please try again.');
      setShowConfirmModal(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const cancelSubmitOrder = () => {
    setShowConfirmModal(false);
    setErrorMessage('');
  };

  // Filter menu items based on search query
  const filteredMenuItems = menuItems.filter(item => {
    if (!searchQuery) return false; // Only show items when searching
    return item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
           (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
  });

  if (!tableId || actualTableNumber === null) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-4">🔒 Access Denied</h1>
        <p className="text-lg mb-4">Please scan the QR code from your table to place an order.</p>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-md mx-auto">
          <p className="text-yellow-800 text-sm">
            <strong>Security Notice:</strong> Direct table access is disabled for your protection. 
            Only QR code scanning is allowed.
          </p>
        </div>
        <p className="text-sm text-gray-600 mt-4">Need help? Please contact our staff.</p>
      </div>
    );
  }

  if (orderSubmitted) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded max-w-md mx-auto">
          <h2 className="text-xl font-bold mb-2">Order Submitted! ✅</h2>
          <p>Thank you for your order. We'll prepare it fresh for you!</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading menu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky Table Bar - Same as numeric URLs */}
      <div className="sticky top-0 z-50 bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">🪑</span>
              <div>
                <h2 className="text-lg font-bold">You are at Table Number {actualTableNumber}</h2>
                <p className="text-sm opacity-90">Click to Order</p>
              </div>
            </div>
            <Link 
              to="/menu"
              className="bg-white text-orange-600 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors font-semibold text-sm"
            >
              📋 Full Menu
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-center mb-8">Order for Table {actualTableNumber}</h1>

      {/* Add Items Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Quick Search & Add Items</h2>
        
        {/* Menu Search */}
        <div className="mb-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search menu items (momo, chicken, pizza, tea...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Search Results */}
        {searchQuery && filteredMenuItems.length > 0 && (
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-3">Found {filteredMenuItems.length} items:</p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {filteredMenuItems.map(item => {
                const quantity = cartItems.find(cartItem => cartItem.id === item.id)?.quantity || 0;
                return (
                  <div key={item.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium">{item.name}</h4>
                      <p className="text-sm text-gray-500">{item.category}</p>
                      <p className="text-sm font-semibold text-primary">NPR {item.price}/-</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {quantity === 0 ? (
                        <button
                          onClick={() => addToCart(item, 1)}
                          className="bg-primary text-white px-3 py-1 rounded hover:bg-orange-600 transition-colors text-sm"
                        >
                          Add
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(item.id, quantity - 1)}
                            className="bg-gray-200 text-gray-700 w-7 h-7 rounded-full hover:bg-gray-300 text-sm"
                          >
                            -
                          </button>
                          <span className="text-sm font-medium w-8 text-center">{quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, quantity + 1)}
                            className="bg-primary text-white w-7 h-7 rounded-full hover:bg-orange-600 text-sm"
                          >
                            +
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* No Results Message */}
        {searchQuery && filteredMenuItems.length === 0 && (
          <div className="text-center py-4">
            <p className="text-gray-500">No items found for "{searchQuery}"</p>
            <button
              onClick={() => setSearchQuery('')}
              className="text-primary hover:text-orange-600 underline text-sm mt-1"
            >
              Clear search
            </button>
          </div>
        )}

      </div>

      {/* Cart Summary */}
      {cartItems.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Your Order</h2>
            <button
              onClick={clearCart}
              className="text-red-600 hover:text-red-700 text-sm font-medium underline"
            >
              Clear All
            </button>
          </div>
          
          {cartItems.map(item => (
            <div key={item.id} className="flex justify-between items-center py-3 border-b">
              <div className="flex-1">
                <span className="font-medium">{item.name}</span>
                {item.isCustom && <span className="text-sm text-gray-500 ml-2">(Custom)</span>}
                <div className="text-sm text-gray-600 mt-1">
                  {item.quantity}x {!item.isCustom && `@ NPR ${item.price}/-`}
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {!item.isCustom && (
                  <span className="font-semibold text-primary">
                    NPR {(item.price * item.quantity)}/-
                  </span>
                )}
                
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    className="bg-gray-200 text-gray-700 w-7 h-7 rounded-full hover:bg-gray-300 transition-colors text-sm flex items-center justify-center"
                  >
                    -
                  </button>
                  <span className="w-8 text-center font-medium">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="bg-primary text-white w-7 h-7 rounded-full hover:bg-orange-600 transition-colors text-sm flex items-center justify-center"
                  >
                    +
                  </button>
                </div>
                
                <button
                  onClick={() => removeFromCart(item.id)}
                  className="text-red-500 hover:text-red-700 ml-2 p-1"
                  title="Remove item"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
          
          <div className="flex justify-between items-center pt-4 text-lg font-bold border-t">
            <span>Total:</span>
            <span>NPR {getTotalPrice()}/-</span>
          </div>
          
          {!showCheckout ? (
            <button
              onClick={() => setShowCheckout(true)}
              className="w-full bg-primary text-white py-3 rounded-lg mt-4 hover:bg-orange-600 transition-colors"
            >
              Proceed to Checkout
            </button>
          ) : (
            <div className="mt-4 space-y-4">
              <input
                type="text"
                placeholder="Your Name"
                value={customerInfo.name}
                onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
              <input
                type="tel"
                placeholder="Phone Number"
                value={customerInfo.phone}
                onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
              {/* Error Message */}
              {errorMessage && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {errorMessage}
                </div>
              )}
              
              <button
                onClick={handleSubmitOrder}
                disabled={isSubmitting}
                className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Order'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Order Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="text-4xl mb-4">🍽️</div>
              <h3 className="text-lg font-semibold mb-2">Confirm Your Order</h3>
              <div className="text-left bg-gray-50 rounded-lg p-4 mb-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium">Table:</span>
                    <span>{actualTableNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Name:</span>
                    <span>{customerInfo.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Phone:</span>
                    <span>{customerInfo.phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Items:</span>
                    <span>{cartItems.length} items</span>
                  </div>
                  <div className="flex justify-between font-semibold text-primary border-t pt-2">
                    <span>Total:</span>
                    <span>NPR {getTotalPrice()}/-</span>
                  </div>
                </div>
              </div>
              <p className="text-gray-600 mb-6 text-sm">
                Please confirm that all details are correct before submitting your order.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={cancelSubmitOrder}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmSubmitOrder}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Submitting...' : 'Confirm Order'}
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

export default TableOrder;
