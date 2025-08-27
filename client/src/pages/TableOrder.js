import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import { getSocketUrl, apiService } from '../services/apiService';
import { useCart } from '../context/CartContext';
import { getTableNumberFromCode } from '../utils/tableMapping';

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

  // Table setup - support both numeric and mapped table IDs
  useEffect(() => {
    if (tableId) {
      let tableNumber = null;
      
      // Try numeric table ID first (1-25)
      if (!isNaN(tableId) && parseInt(tableId) >= 1 && parseInt(tableId) <= 25) {
        tableNumber = parseInt(tableId);
      } else {
        // Try to get table number from URL mapping
        tableNumber = getTableNumberFromCode(tableId);
      }
      
      if (tableNumber) {
        setActualTableNumber(tableNumber);
        // Set table context
        setTableContext(tableNumber);
        // Store the table URL for proper navigation
        sessionStorage.setItem('currentTableUrl', window.location.pathname);
        localStorage.setItem('currentTableUrl', window.location.pathname);
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
      
      // Use centralized API service instead of direct fetch
      const response = await apiService.getMenu();
      const menuData = response.data;
      
      console.log('Raw API response:', menuData);
      
      if (menuData && Array.isArray(menuData) && menuData.length > 0) {
        console.log('Setting menu items from API:', menuData.length, 'items');
        setMenuItems(menuData);
      } else {
        console.log('No valid menu data from API, using fallback');
        setMenuItems([]);
      }
    } catch (error) {
      console.error('API fetch failed:', error);
      console.log('API fetch failed, setting empty menu');
      setMenuItems([]);
    }
  };

  useEffect(() => {
    // Always fetch menu items when component mounts, regardless of table number
    fetchMenuItems();
  }, []); // Remove dependency on actualTableNumber
  
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

    let socket = null;

    const connectSocket = () => {
      try {
        socket = io(getSocketUrl(), {
          timeout: 10000,
          transports: ['polling'],
          forceNew: true
        });

        socket.on('connect', () => {
          console.log('🔌 Socket connected for table:', actualTableNumber);
        });

        socket.on('connect_error', (error) => {
          console.warn('Socket connection failed:', error.message);
        });

        socket.on('tableCleared', (data) => {
          console.log('🔔 Table cleared event received:', data);
          if (data.tableId === actualTableNumber) {
            clearCart();
            localStorage.removeItem(`cart_${actualTableNumber}`);
            localStorage.removeItem(`order_submitted_${actualTableNumber}`);
            navigate('/');
          }
        });

      } catch (error) {
        console.warn('Socket initialization failed:', error);
      }
    };

    connectSocket();

    return () => {
      if (socket) {
        socket.disconnect();
      }
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

    // Validation
    if (!customerInfo.name.trim() || !customerInfo.phone.trim()) {
      setErrorMessage('Please provide your name and phone number');
      return;
    }

    if (cartItems.length === 0) {
      setErrorMessage('Your cart is empty');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const orderData = {
        tableId: actualTableNumber,
        customerName: customerInfo.name,
        phone: customerInfo.phone,
        items: cartItems,
        orderType: 'dine-in',
        totalAmount: getTotalPrice()
      };

      console.log('🍽️ Submitting table order:', orderData);
      console.log('📡 API endpoint:', '/api/order');
      console.log('🔗 Backend URL:', process.env.REACT_APP_API_URL || 'https://food-zone-backend-l00k.onrender.com');
      
      const response = await apiService.createOrder(orderData);
      console.log('✅ Table order response:', response);
      
      setOrderSubmitted(true);
      clearCart();
      
      // Store order submitted state for 30 minutes
      localStorage.setItem(`order_submitted_${actualTableNumber}`, Date.now().toString());
      
    } catch (error) {
      console.error('❌ Table order submission failed:', error);
      console.error('📋 Error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        config: error.config
      });
      
      // More specific error messages
      if (error.response?.status === 404) {
        setErrorMessage('Order endpoint not found. Please contact support.');
      } else if (error.response?.status === 500) {
        setErrorMessage('Server error. Please try again in a moment.');
      } else if (error.code === 'NETWORK_ERROR' || !error.response) {
        setErrorMessage('Network error. Please check your connection and try again.');
      } else {
        setErrorMessage(`Failed to submit order: ${error.response?.data?.message || error.message}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };


  // Enhanced search filter with better data validation
  const filteredMenuItems = useMemo(() => {
    if (!menuItems || menuItems.length === 0) {
      return [];
    }
    
    // Clean and validate menu items
    const validMenuItems = menuItems.filter(item => {
      if (!item || !item.id || !item.name) return false;
      
      // Handle both string and number prices from API
      const price = typeof item.price === 'string' ? parseFloat(item.price) : item.price;
      if (!price || isNaN(price) || price <= 0 || price > 10000) return false;
      
      // Exclude test/duplicate items
      const name = item.name.toLowerCase();
      if (name.includes('duplicate') || name.includes('test') || name.includes('happy hour')) {
        return false;
      }
      
      // Exclude happy hour category
      if (item.category && item.category.toLowerCase() === 'happy hour') {
        return false;
      }
      
      return true;
    });
    
    // Remove duplicates based on name and price
    const uniqueItems = validMenuItems.reduce((acc, item) => {
      const price = typeof item.price === 'string' ? parseFloat(item.price) : item.price;
      const key = `${item.name.toLowerCase()}-${price}`;
      if (!acc.has(key)) {
        acc.set(key, { ...item, price });
      }
      return acc;
    }, new Map());
    
    const cleanItems = Array.from(uniqueItems.values());
    
    // If no search query, return all clean items
    if (!debouncedSearchQuery || debouncedSearchQuery.trim() === '') {
      return cleanItems;
    }
    
    // Apply search filter
    const query = debouncedSearchQuery.toLowerCase().trim();
    return cleanItems.filter(item => {
      const name = item.name.toLowerCase();
      const category = (item.category || '').toLowerCase();
      const description = (item.description || '').toLowerCase();
      
      return name.includes(query) || category.includes(query) || description.includes(query);
    });
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
        
        {/* Enhanced Menu Search */}
        <div className="mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder="Search menu items, categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 pl-10 pr-10 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          {menuItems.length > 0 && (
            <p className="text-xs text-gray-500 mt-2">
              Searching {menuItems.length} menu items from Railway database
            </p>
          )}
        </div>

        {/* Search Results Info */}
        {debouncedSearchQuery && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <div className="flex items-center justify-between">
              <p className="text-blue-800 font-medium">
                {filteredMenuItems.length > 0 
                  ? `Found ${filteredMenuItems.length} items for "${debouncedSearchQuery}"`
                  : `No items found for "${debouncedSearchQuery}"`
                }
              </p>
              <button
                onClick={() => setSearchQuery('')}
                className="text-blue-600 hover:text-blue-800 underline text-sm font-medium"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Menu Items with Lazy Loading */}
        {displayedSearchItems.length > 0 && (
          <div className="mb-4">
            <div className="space-y-3 max-h-80 overflow-y-auto">
              <Suspense fallback={<div className="animate-pulse bg-gray-200 h-16 rounded-lg"></div>}>
                {displayedSearchItems.map(item => {
                const quantity = cartItems.find(cartItem => cartItem.id === item.id)?.quantity || 0;
                return (
                  <div key={item.id} className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{item.name}</h4>
                      <p className="text-sm text-blue-600 font-medium">{item.category}</p>
                      {item.description && (
                        <p className="text-xs text-gray-500 mt-1">{item.description}</p>
                      )}
                      <p className="text-lg font-bold text-orange-600 mt-1">NPR {typeof item.price === 'string' ? parseFloat(item.price) : item.price}/-</p>
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

        {/* No Menu Items Message */}
        {!debouncedSearchQuery && filteredMenuItems.length === 0 && menuItems.length === 0 && (
          <div className="text-center py-8">
            <div className="text-4xl mb-3">🍽️</div>
            <p className="text-gray-500 text-lg mb-2">Loading menu items...</p>
            <p className="text-gray-400 text-sm">Please wait while we fetch the latest menu from our kitchen</p>
          </div>
        )}

        {/* Menu Available Message */}
        {!debouncedSearchQuery && filteredMenuItems.length === 0 && menuItems.length > 0 && (
          <div className="text-center py-8">
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-gray-500 text-lg mb-2">Search our menu</p>
            <p className="text-gray-400 text-sm">Type in the search box above to find items from our {menuItems.length} available dishes</p>
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
