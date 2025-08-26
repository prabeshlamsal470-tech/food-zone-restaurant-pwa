import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import { getSocketUrl, apiService } from '../services/apiService';
import { useCart } from '../context/CartContext';
import { decryptTableCode } from '../utils/tableEncryption';
// import LoadingSpinner from '../components/LoadingSpinner';

// Lazy load menu item card component
const MenuItemCard = lazy(() => import('../components/MenuItemCard'));

const TableOrder = () => {
  const { tableId } = useParams();
  const navigate = useNavigate();
  const { cartItems, addToCart, removeFromCart, updateQuantity, setTableContext, clearCart, getTotalPrice } = useCart();
  // Initialize with empty array - will be populated by fetchMenuItems
  const [menuItems, setMenuItems] = useState([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '' });
  const [orderSubmitted, setOrderSubmitted] = useState(false);
  // const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  // const [showMenuSearch, setShowMenuSearch] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [actualTableNumber, setActualTableNumber] = useState(null);
  const [visibleItems, setVisibleItems] = useState(8); // Initial items to show for lazy loading
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Table setup - support both numeric and encrypted table IDs for search functionality
  useEffect(() => {
    if (tableId) {
      let tableNumber = null;
      
      // Try numeric table ID first (needed for search to work)
      if (!isNaN(tableId) && parseInt(tableId) >= 1 && parseInt(tableId) <= 25) {
        tableNumber = parseInt(tableId);
      } else {
        // Try to decrypt encrypted table codes
        tableNumber = decryptTableCode(tableId);
      }
      
      if (tableNumber) {
        setActualTableNumber(tableNumber);
        // Set table context
        setTableContext(tableNumber);
        // Store the table URL for proper navigation
        sessionStorage.setItem('currentTableUrl', window.location.pathname);
        localStorage.setItem('currentTableUrl', window.location.pathname);
        
        // Don't initialize with happy hour items here - let fetchMenuItems handle all menu data
      } else {
        setActualTableNumber(null);
      }
    }
  }, [tableId, setTableContext]);

  // Debounce search query to improve performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 150); // 150ms debounce

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchMenuItems = async () => {
    try {
      console.log('Fetching menu items from API...');
      
      // Use the same API call as Menu.js
      const response = await fetch('/api/menu');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const menuData = await response.json();
      console.log('Raw API response:', menuData);
      
      if (menuData && Array.isArray(menuData) && menuData.length > 0) {
        console.log('Setting menu items from API:', menuData.length, 'items');
        setMenuItems(menuData);
      } else {
        console.log('No valid menu data from API, using expanded fallback');
        // Expanded fallback menu with more variety for better search testing
        setMenuItems([
          { id: 1, name: 'Chicken Momo', price: 180, category: 'Appetizers', description: 'Steamed chicken dumplings' },
          { id: 2, name: 'Veg Momo', price: 150, category: 'Appetizers', description: 'Steamed vegetable dumplings' },
          { id: 3, name: 'Chicken Thali', price: 350, category: 'Main Course', description: 'Complete chicken meal set' },
          { id: 4, name: 'Veg Thali', price: 280, category: 'Main Course', description: 'Complete vegetarian meal set' },
          { id: 5, name: 'Chicken Curry', price: 250, category: 'Main Course', description: 'Spicy chicken curry' },
          { id: 6, name: 'Chicken Chowmein', price: 180, category: 'Noodles', description: 'Stir-fried noodles with chicken' },
          { id: 7, name: 'Veg Chowmein', price: 150, category: 'Noodles', description: 'Stir-fried vegetable noodles' },
          { id: 8, name: 'Chicken Fried Rice', price: 200, category: 'Rice', description: 'Fried rice with chicken' },
          { id: 9, name: 'Veg Fried Rice', price: 170, category: 'Rice', description: 'Vegetarian fried rice' },
          { id: 10, name: 'Pizza Margherita', price: 450, category: 'Pizza', description: 'Classic cheese pizza' },
          { id: 11, name: 'Chicken Pizza', price: 550, category: 'Pizza', description: 'Pizza with chicken toppings' },
          { id: 12, name: 'Tea', price: 25, category: 'Beverages', description: 'Hot tea' },
          { id: 13, name: 'Coffee', price: 35, category: 'Beverages', description: 'Hot coffee' },
          { id: 14, name: 'Cold Coffee', price: 65, category: 'Beverages', description: 'Iced coffee drink' },
          { id: 15, name: 'Lassi', price: 80, category: 'Beverages', description: 'Yogurt-based drink' }
        ]);
      }
    } catch (error) {
      console.error('API fetch failed:', error);
      console.log('Using expanded fallback menu due to API error');
      // Same expanded fallback menu
      setMenuItems([
        { id: 1, name: 'Chicken Momo', price: 180, category: 'Appetizers', description: 'Steamed chicken dumplings' },
        { id: 2, name: 'Veg Momo', price: 150, category: 'Appetizers', description: 'Steamed vegetable dumplings' },
        { id: 3, name: 'Chicken Thali', price: 350, category: 'Main Course', description: 'Complete chicken meal set' },
        { id: 4, name: 'Veg Thali', price: 280, category: 'Main Course', description: 'Complete vegetarian meal set' },
        { id: 5, name: 'Chicken Curry', price: 250, category: 'Main Course', description: 'Spicy chicken curry' },
        { id: 6, name: 'Chicken Chowmein', price: 180, category: 'Noodles', description: 'Stir-fried noodles with chicken' },
        { id: 7, name: 'Veg Chowmein', price: 150, category: 'Noodles', description: 'Stir-fried vegetable noodles' },
        { id: 8, name: 'Chicken Fried Rice', price: 200, category: 'Rice', description: 'Fried rice with chicken' },
        { id: 9, name: 'Veg Fried Rice', price: 170, category: 'Rice', description: 'Vegetarian fried rice' },
        { id: 10, name: 'Pizza Margherita', price: 450, category: 'Pizza', description: 'Classic cheese pizza' },
        { id: 11, name: 'Chicken Pizza', price: 550, category: 'Pizza', description: 'Pizza with chicken toppings' },
        { id: 12, name: 'Tea', price: 25, category: 'Beverages', description: 'Hot tea' },
        { id: 13, name: 'Coffee', price: 35, category: 'Beverages', description: 'Hot coffee' },
        { id: 14, name: 'Cold Coffee', price: 65, category: 'Beverages', description: 'Iced coffee drink' },
        { id: 15, name: 'Lassi', price: 80, category: 'Beverages', description: 'Yogurt-based drink' }
      ]);
    }
  };

  useEffect(() => {
    if (actualTableNumber && actualTableNumber >= 1 && actualTableNumber <= 25) {
      fetchMenuItems();
    }
  }, [actualTableNumber]);
  
  // Skip background preload to reduce initial load time
  // useEffect(() => {
  //   const preloadMenu = async () => {
  //     try {
  //       await apiService.getMenu();
  //     } catch (error) {
  //       console.log('Background preload failed:', error);
  //     }
  //   };
  //   preloadMenu();
  // }, []);

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

  const handleViewMenu = useCallback(() => {
    // Simple navigation using table number
    navigate(`/menu?table=${actualTableNumber}`);
  }, [navigate, actualTableNumber]);

  // Auto-clear error messages after 5 seconds
  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => {
        setErrorMessage('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  const handleSubmitOrder = async () => {
    // Clear any previous error messages
    setErrorMessage('');
    setIsSubmitting(true);

    // Validation
    if (!customerInfo.name.trim() || !customerInfo.phone.trim()) {
      setErrorMessage('Please provide your name and phone number');
      setIsSubmitting(false);
      return;
    }

    if (cartItems.length === 0) {
      setErrorMessage('Your cart is empty');
      setIsSubmitting(false);
      return;
    }

    // Submit order with enhanced error handling and fallback
    const orderData = {
      tableId: actualTableNumber,
      customerName: customerInfo.name.trim(),
      phone: customerInfo.phone.trim(),
      orderType: 'dine-in',
      totalAmount: cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0),
      items: cartItems
    };

    try {
      // Try to submit order with timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 15000)
      );
      
      await Promise.race([
        apiService.createOrder(orderData),
        timeoutPromise
      ]);
      
      setOrderSubmitted(true);
      clearCart();
      
      // Store order submitted state for 30 minutes
      localStorage.setItem(`order_submitted_${actualTableNumber}`, Date.now().toString());
      
      // Success - no additional notification needed
      
    } catch (error) {
      console.error('Error submitting order:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      
      // Enhanced error handling with fallback
      if (error.message === 'Request timeout' || error.code === 'NETWORK_ERROR' || !navigator.onLine) {
        // Save order locally for offline processing
        const offlineOrder = {
          ...orderData,
          timestamp: Date.now(),
          status: 'pending_offline'
        };
        
        const offlineOrders = JSON.parse(localStorage.getItem('offlineOrders') || '[]');
        offlineOrders.push(offlineOrder);
        localStorage.setItem('offlineOrders', JSON.stringify(offlineOrders));
        
        setErrorMessage('Network issue detected. Your order has been saved locally and will be submitted when connection is restored. Please contact staff if this persists.');
        
        // Show offline success
        setOrderSubmitted(true);
        clearCart();
        localStorage.setItem(`order_submitted_${actualTableNumber}`, Date.now().toString());
        
      } else {
        let errorMsg = 'Failed to submit order. Please try again.';
        if (error.response?.data?.message) {
          errorMsg = error.response.data.message;
        } else if (error.message.includes('timeout')) {
          errorMsg = 'Request timed out. Please check your connection and try again.';
        } else if (error.message) {
          errorMsg = error.message;
        }
        
        setErrorMessage(errorMsg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };


  // Memoized filter for better performance - search ONLY main menu items (exclude happy hour)
  const filteredMenuItems = useMemo(() => {
    if (!debouncedSearchQuery || debouncedSearchQuery.trim() === '') {
      return []; // Show no items when not searching - only show results when user types
    }
    
    // Filter to include ONLY main menu items (exclude happy hour items)
    const validMenuItems = menuItems.filter(item => 
      item && 
      item.id && 
      item.name && 
      item.price && 
      typeof item.price === 'number' &&
      item.category &&
      item.category !== 'Happy Hour' && // Exclude happy hour items from search
      !item.name.toLowerCase().includes('duplicate') &&
      !item.name.toLowerCase().includes('test') &&
      !item.name.toLowerCase().includes('happy hour') && // Extra safety check
      item.price > 0 &&
      item.price < 10000 // Reasonable price range
    );
    
    // Remove duplicates based on name and price
    const uniqueItems = validMenuItems.filter((item, index, arr) => 
      arr.findIndex(i => i.name === item.name && i.price === item.price) === index
    );
    
    const query = debouncedSearchQuery.toLowerCase().trim();
    return uniqueItems.filter(item => 
      item.name.toLowerCase().includes(query) ||
      (item.category && item.category.toLowerCase().includes(query)) ||
      (item.description && item.description.toLowerCase().includes(query))
    );
  }, [menuItems, debouncedSearchQuery]);

  // Items to display with lazy loading
  const displayedSearchItems = useMemo(() => {
    return filteredMenuItems.slice(0, visibleItems);
  }, [filteredMenuItems, visibleItems]);
  
  const hasMoreSearchItems = filteredMenuItems.length > visibleItems;

  // Load more items function
  const loadMoreItems = useCallback(() => {
    if (!isLoadingMore && hasMoreSearchItems) {
      setIsLoadingMore(true);
      setTimeout(() => {
        setVisibleItems(prev => prev + 8);
        setIsLoadingMore(false);
      }, 300); // Small delay for smooth UX
    }
  }, [isLoadingMore, hasMoreSearchItems]);

  // Reset visible items when search changes
  useEffect(() => {
    setVisibleItems(8);
  }, [debouncedSearchQuery]);

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

  // Remove full-page loading - show skeleton instead
  // if (loading) {
  //   return (
  //     <div className="flex justify-center items-center min-h-screen">
  //       <LoadingSpinner message="Loading dine-in menu..." />
  //     </div>
  //   );
  // }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky Table Bar - Same as numeric URLs */}
      <div className="sticky top-0 z-50 bg-blue-600 text-white shadow-lg">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="text-xl">🪑</div>
              <div>
                <div className="font-semibold text-base">Table {actualTableNumber}</div>
                <div className="text-sm opacity-90">Dine-in Order</div>
              </div>
            </div>
            <button
              onClick={handleViewMenu}
              className="bg-white text-orange-600 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors font-semibold text-sm"
            >
              📋 Full Menu
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-semibold mb-6 text-center text-gray-800">Order for Table {actualTableNumber}</h1>

        {/* Add Items Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 max-w-md w-full mx-4">
          <h2 className="text-xl font-semibold mb-4">Quick Search & Add Items</h2>
        
        {/* Menu Search */}
        <div className="mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder="Search menu items, categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 pl-10 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Search Results Info */}
        {debouncedSearchQuery && (
          <div className="text-center mb-4">
            <p className="text-gray-600">
              Found {filteredMenuItems.length} items for "{debouncedSearchQuery}"
              <button
                onClick={() => setSearchQuery('')}
                className="ml-2 underline text-sm text-blue-600 hover:text-blue-800"
              >
                Clear search
              </button>
            </p>
          </div>
        )}

        {/* Search Results with Lazy Loading */}
        {displayedSearchItems.length > 0 && debouncedSearchQuery.trim() && (
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-3">
              Found {filteredMenuItems.length} items for "{debouncedSearchQuery}" (showing {displayedSearchItems.length}):
            </p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              <Suspense fallback={<div className="animate-pulse bg-gray-200 h-16 rounded-lg"></div>}>
                {displayedSearchItems.map(item => {
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
                          className="bg-primary text-white px-4 py-2 rounded hover:bg-orange-600 transition-colors text-sm min-h-[40px] touch-manipulation"
                          style={{ touchAction: 'manipulation' }}
                        >
                          Add
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(item.id, quantity - 1)}
                            className="bg-gray-200 text-gray-700 w-10 h-10 md:w-8 md:h-8 rounded-full hover:bg-gray-300 text-sm flex items-center justify-center touch-manipulation"
                            style={{ touchAction: 'manipulation' }}
                          >
                            -
                          </button>
                          <span className="text-sm font-medium w-8 text-center">{quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, quantity + 1)}
                            className="bg-primary text-white w-10 h-10 md:w-8 md:h-8 rounded-full hover:bg-orange-600 text-sm flex items-center justify-center touch-manipulation"
                            style={{ touchAction: 'manipulation' }}
                          >
                            +
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
                })}
              </Suspense>
              {/* Load More Button for Search Results */}
              {hasMoreSearchItems && (
                <div className="text-center py-2">
                  <button
                    onClick={loadMoreItems}
                    disabled={isLoadingMore}
                    className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isLoadingMore ? 'Loading...' : `Load More (${filteredMenuItems.length - displayedSearchItems.length} remaining)`}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* No Results Message */}
        {debouncedSearchQuery && debouncedSearchQuery.trim() !== '' && filteredMenuItems.length === 0 && (
          <div className="text-center py-4">
            <p className="text-gray-500">No items found for "{debouncedSearchQuery}"</p>
            <button
              onClick={() => setSearchQuery('')}
              className="text-primary hover:text-orange-600 underline text-sm mt-1"
            >
              Clear search
            </button>
          </div>
        )}

        {/* Search Instructions */}
        {!debouncedSearchQuery && (
          <div className="text-center py-8">
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-gray-500 text-lg mb-2">Search for menu items</p>
            <p className="text-gray-400 text-sm">Type in the search box above to find items by name, category, or description</p>
          </div>
        )}

      </div>

      {/* Cart Summary */}
      {cartItems.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 max-w-md w-full mx-4">
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
                    className="bg-gray-200 text-gray-700 w-10 h-10 md:w-8 md:h-8 rounded-full hover:bg-gray-300 transition-colors text-sm flex items-center justify-center touch-manipulation"
                    style={{ touchAction: 'manipulation' }}
                  >
                    -
                  </button>
                  <span className="w-8 text-center font-medium">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="bg-primary text-white w-10 h-10 md:w-8 md:h-8 rounded-full hover:bg-orange-600 transition-colors text-sm flex items-center justify-center touch-manipulation"
                    style={{ touchAction: 'manipulation' }}
                  >
                    +
                  </button>
                </div>
                
                <button
                  onClick={() => removeFromCart(item.id)}
                  className="text-red-500 hover:text-red-700 ml-2 p-2 min-w-[40px] min-h-[40px] flex items-center justify-center touch-manipulation"
                  style={{ touchAction: 'manipulation' }}
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
              type="button"
              onClick={() => setShowCheckout(true)}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
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
                disabled={isSubmitting || !customerInfo.name || !customerInfo.phone}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Order'}
              </button>
            </div>
          )}
        </div>
      )}

      </div>
    </div>
  );
};

export default TableOrder;
