import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { fetchApi } from '../services/apiService';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useDeliveryCart } from '../context/DeliveryCartContext';
import useDebounce from '../hooks/useDebounce';
import useIntersectionObserver from '../hooks/useIntersectionObserver';
import ErrorBoundary from '../components/ErrorBoundary';

// Lazy load components
const MenuItemCard = lazy(() => import('../components/MenuItemCard'));
const HappyHourSection = lazy(() => import('../components/HappyHourSection'));

const Menu = () => {
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isHappyHour, setIsHappyHour] = useState(false);
  const [visibleItems, setVisibleItems] = useState(12); // Initial items to show
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  // Debounce search query to improve performance
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  
  const { currentTable } = useCart();
  
  // Use appropriate cart based on customer type
  const { deliveryCartItems, addToDeliveryCart, updateDeliveryQuantity } = useDeliveryCart();
  const { cartItems, addToCart, updateQuantity } = useCart();
  
  // Memoized customer type determination
  const isTableCustomer = useMemo(() => !!currentTable, [currentTable]);
  const canOrderDelivery = useMemo(() => !isTableCustomer, [isTableCustomer]);

  const checkHappyHour = () => {
    const now = new Date();
    const currentHour = now.getHours();
    // Happy hour is from 11 AM to 2 PM (11:00 - 13:59)
    setIsHappyHour(currentHour >= 11 && currentHour < 14);
  };

  const fetchMenuItems = useCallback(async () => {
    try {
      // Check if data is cached in sessionStorage
      const cachedData = sessionStorage.getItem('menuItems');
      const cacheTimestamp = sessionStorage.getItem('menuCacheTime');
      const now = Date.now();
      
      // Use cache if it's less than 5 minutes old
      if (cachedData && cacheTimestamp && (now - parseInt(cacheTimestamp)) < 300000) {
        setMenuItems(JSON.parse(cachedData));
        setLoading(false);
        return;
      }
      
      const response = await fetchApi.get('/api/menu');
      
      // fetchApi.get returns the parsed JSON directly, not wrapped in .data
      const menuData = Array.isArray(response) ? response : (response.data || response || []);
      setMenuItems(menuData);
      
      // Cache the data
      sessionStorage.setItem('menuItems', JSON.stringify(menuData));
      sessionStorage.setItem('menuCacheTime', now.toString());
    } catch (error) {
      console.error('Error fetching menu:', error);
      console.error('Error details:', error.message, error.stack);
      // Set empty array on error to prevent infinite loading
      setMenuItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMenuItems();
    checkHappyHour();
    
    // Check happy hour every minute
    const interval = setInterval(checkHappyHour, 60000);
    return () => clearInterval(interval);
  }, [fetchMenuItems]);

  // Memoized categories to prevent recalculation
  const categories = useMemo(() => {
    return ['All', ...new Set(menuItems.map(item => item.category))];
  }, [menuItems]);
  
  // Happy Hour menu items - using integer IDs for database compatibility
  const happyHourItems = [
    { id: 1001, name: 'Chicken Momo', price: 125, category: 'Happy Hour', description: 'Delicious steamed chicken dumplings' },
    { id: 1002, name: 'Chicken Fried Rice', price: 145, category: 'Happy Hour', description: 'Aromatic fried rice with tender chicken pieces' },
    { id: 1003, name: 'Veg Fried Rice', price: 110, category: 'Happy Hour', description: 'Flavorful vegetarian fried rice with fresh vegetables' },
    { id: 1004, name: 'Burger', price: 150, category: 'Happy Hour', description: 'Juicy beef burger with fresh toppings' },
    { id: 1005, name: 'Chicken Chowmein', price: 110, category: 'Happy Hour', description: 'Stir-fried noodles with chicken and vegetables' },
    { id: 1006, name: 'Veg Chowmein', price: 80, category: 'Happy Hour', description: 'Vegetarian stir-fried noodles with fresh vegetables' }
  ];
  
  // Memoized filtered items to prevent recalculation (using debounced search)
  const filteredItems = useMemo(() => {
    return menuItems.filter(item => {
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
      const matchesSearch = debouncedSearchQuery === '' || 
        item.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(debouncedSearchQuery.toLowerCase()));
      
      return matchesCategory && matchesSearch;
    });
  }, [menuItems, selectedCategory, debouncedSearchQuery]);
  
  // Items to display with lazy loading
  const displayedItems = useMemo(() => {
    return filteredItems.slice(0, visibleItems);
  }, [filteredItems, visibleItems]);
  
  const hasMoreItems = filteredItems.length > visibleItems;

  const getItemQuantity = useCallback((itemId) => {
    if (isTableCustomer) {
      // Use table cart for dine-in customers
      const cartItem = cartItems.find(item => item.id === itemId);
      return cartItem ? cartItem.quantity : 0;
    } else {
      // Use delivery cart for delivery customers
      const cartItem = deliveryCartItems.find(item => item.id === itemId);
      return cartItem ? cartItem.quantity : 0;
    }
  }, [isTableCustomer, cartItems, deliveryCartItems]);


  const handleAddToCart = useCallback(async (item) => {
    if (isTableCustomer) {
      addToCart(item, 1);
    } else {
      // For delivery customers, add directly to cart without API call
      addToDeliveryCart(item, 1);
    }
  }, [isTableCustomer, addToCart, addToDeliveryCart]);

  const handleUpdateQuantity = useCallback((itemId, newQuantity) => {
    if (isTableCustomer) {
      updateQuantity(itemId, newQuantity);
    } else {
      updateDeliveryQuantity(itemId, newQuantity);
    }
  }, [isTableCustomer, updateQuantity, updateDeliveryQuantity]);
  
  // Load more items function
  const loadMoreItems = useCallback(() => {
    if (!isLoadingMore && hasMoreItems) {
      setIsLoadingMore(true);
      setTimeout(() => {
        setVisibleItems(prev => prev + 12);
        setIsLoadingMore(false);
      }, 300); // Small delay for smooth UX
    }
  }, [isLoadingMore, hasMoreItems]);
  
  // Intersection observer for auto-loading more items
  const [loadMoreRef, isLoadMoreVisible] = useIntersectionObserver({
    threshold: 0.1,
    rootMargin: '100px'
  });
  
  // Auto-load more items when load more button comes into view
  useEffect(() => {
    if (isLoadMoreVisible && hasMoreItems && !isLoadingMore) {
      loadMoreItems();
    }
  }, [isLoadMoreVisible, hasMoreItems, isLoadingMore, loadMoreItems]);
  
  // Reset visible items when category or search changes
  useEffect(() => {
    setVisibleItems(12);
  }, [selectedCategory, debouncedSearchQuery]);

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
    <ErrorBoundary>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-center mb-8">Our Menu</h1>
      
      {/* Happy Hour Section */}
      {isHappyHour && (
        <Suspense fallback={<div className="h-32 bg-gray-100 rounded-2xl animate-pulse mb-8"></div>}>
          <HappyHourSection 
            happyHourItems={happyHourItems}
            getItemQuantity={getItemQuantity}
            handleAddToCart={handleAddToCart}
            handleUpdateQuantity={handleUpdateQuantity}
            isTableCustomer={isTableCustomer}
            currentTable={currentTable}
          />
        </Suspense>
      )}

      {/* Dine-In Menu Header for Table Customers */}
      {isTableCustomer && (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl p-6 mb-8 text-center shadow-lg">
          <div className="text-amber-800">
            <div className="flex items-center justify-center mb-4">
              <span className="text-5xl mr-3">🍽️</span>
              <div>
                <h2 className="text-3xl font-bold text-amber-900">Dine-In Menu</h2>
                <p className="text-lg text-amber-700">Table {currentTable}</p>
              </div>
            </div>
            <div className="bg-amber-100 rounded-xl p-4 mb-4">
              <p className="text-lg font-semibold text-amber-800">🪑 Welcome to your table dining experience!</p>
              <p className="text-amber-700">Browse our full menu below and add items to your table order.</p>
            </div>
            <p className="text-lg mb-6 text-amber-600">Ready to order? Please select your favorite food from our menu.</p>
            <button
              onClick={() => {
                // Get the encrypted table URL from sessionStorage or localStorage
                const encryptedTableUrl = sessionStorage.getItem('currentTableUrl') || localStorage.getItem('currentTableUrl');
                if (encryptedTableUrl) {
                  window.location.href = encryptedTableUrl;
                } else {
                  // Check if we came from an encrypted table URL in referrer
                  const referrer = document.referrer;
                  const encryptedMatch = referrer.match(/\/([A-Z0-9]+)$/);
                  if (encryptedMatch) {
                    window.location.href = `/${encryptedMatch[1]}`;
                  } else {
                    // Import encryption utility and generate encrypted URL
                    import('../utils/tableEncryption').then(({ encryptTableNumber }) => {
                      try {
                        const encryptedCode = encryptTableNumber(currentTable);
                        window.location.href = `/${encryptedCode}`;
                      } catch (error) {
                        console.error('Failed to encrypt table number:', error);
                        // Last resort fallback - shouldn't happen in production
                        window.location.href = `/${currentTable}`;
                      }
                    });
                  }
                }
              }}
              className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-8 py-4 rounded-xl hover:from-orange-600 hover:to-red-600 transition-all duration-300 font-bold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 inline-flex items-center space-x-3"
            >
              <span className="text-2xl">🍽️</span>
              <span>Go Back to Table {currentTable}</span>
            </button>
          </div>
        </div>
      )}
      
      {/* Search Bar */}
      <div className="max-w-md mx-auto mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Search menu items, categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full px-4 py-3 pl-10 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent ${
              isTableCustomer 
                ? 'border-amber-300 focus:ring-amber-500 bg-amber-50' 
                : 'border-gray-300 focus:ring-primary'
            }`}
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className={`h-5 w-5 ${isTableCustomer ? 'text-amber-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>
      
      {/* Category Filter */}
      <div className="mb-8">
        {/* Dine-In Menu Label for Table Customers */}
        {isTableCustomer && (
          <div className="text-center mb-4">
            <div className="inline-flex items-center bg-amber-100 text-amber-800 px-6 py-2 rounded-full border border-amber-300">
              <span className="text-2xl mr-2">🍽️</span>
              <span className="font-bold text-lg">Dine-In Menu Categories</span>
            </div>
          </div>
        )}
        
        <div className="flex flex-wrap justify-center gap-2">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-full transition-colors ${
                selectedCategory === category
                  ? isTableCustomer 
                    ? 'bg-amber-600 text-white shadow-lg'
                    : 'bg-primary text-white'
                  : isTableCustomer
                    ? 'bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-300'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Search Results Info */}
      {debouncedSearchQuery && (
        <div className="text-center mb-4">
          <p className={`${isTableCustomer ? 'text-amber-700' : 'text-gray-600'}`}>
            Found {filteredItems.length} items for "{debouncedSearchQuery}"
            <button
              onClick={() => setSearchQuery('')}
              className={`ml-2 underline text-sm ${isTableCustomer ? 'text-amber-800 hover:text-amber-900' : 'text-primary hover:text-orange-600'}`}
            >
              Clear search
            </button>
          </p>
        </div>
      )}

      {/* No Results Message */}
      {filteredItems.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-2xl font-semibold text-gray-600 mb-2">No items found</h2>
          <p className="text-gray-500 mb-4">
            {debouncedSearchQuery 
              ? `No menu items match "${debouncedSearchQuery}". Try a different search term.`
              : 'No items match the selected category.'
            }
          </p>
          {debouncedSearchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors"
            >
              Clear search
            </button>
          )}
        </div>
      )}

      {/* Menu Items by Category */}
      {displayedItems.length > 0 && (
        <div className="space-y-8">
          {selectedCategory === 'All' ? (
            // Show all categories with subheadings
            categories.filter(cat => cat !== 'All').map(category => {
              const categoryItems = displayedItems.filter(item => item.category === category);
              if (categoryItems.length === 0) return null;
              
              return (
                <div key={category} className="space-y-4">
                  {/* Category Subheading */}
                  <div className="border-b border-gray-200 pb-2">
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                      <span className="text-primary">
                        {category === 'Appetizers' && '🥗'}
                        {category === 'Main Course' && '🍛'}
                        {category === 'Beverages' && '🥤'}
                        {category === 'Desserts' && '🍰'}
                        {category === 'Snacks' && '🍿'}
                        {category === 'Specials' && '⭐'}
                        {!['Appetizers', 'Main Course', 'Beverages', 'Desserts', 'Snacks', 'Specials'].includes(category) && '🍽️'}
                      </span>
                      {category}
                      <span className="text-sm font-normal text-gray-500">({filteredItems.filter(item => item.category === category).length} items)</span>
                    </h2>
                  </div>
                  
                  {/* Category Items Grid */}
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {categoryItems.map(item => (
                      <Suspense key={item.id} fallback={<div className="h-64 bg-gray-100 rounded-2xl animate-pulse"></div>}>
                        <MenuItemCard 
                          item={item}
                          quantity={getItemQuantity(item.id)}
                          onAddToCart={handleAddToCart}
                          onUpdateQuantity={handleUpdateQuantity}
                          isTableCustomer={isTableCustomer}
                          currentTable={currentTable}
                        />
                      </Suspense>
                    ))}
                  </div>
                </div>
              );
            })
          ) : (
            // Show single category without subheading
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedItems.map(item => (
                <Suspense key={item.id} fallback={<div className="h-64 bg-gray-100 rounded-2xl animate-pulse"></div>}>
                  <MenuItemCard 
                    item={item}
                    quantity={getItemQuantity(item.id)}
                    onAddToCart={handleAddToCart}
                    onUpdateQuantity={handleUpdateQuantity}
                    isTableCustomer={isTableCustomer}
                    currentTable={currentTable}
                  />
                </Suspense>
              ))}
            </div>
          )}
          
          {/* Load More Button */}
          {hasMoreItems && (
            <div ref={loadMoreRef} className="text-center mt-8">
              <button
                onClick={loadMoreItems}
                disabled={isLoadingMore}
                className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-8 py-4 rounded-xl hover:from-orange-600 hover:to-red-600 transition-all duration-300 font-bold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoadingMore ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Loading more items...
                  </div>
                ) : (
                  `Load More Items (${filteredItems.length - visibleItems} remaining)`
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Delivery Cart Notice - Only for non-table customers */}
      {deliveryCartItems.length > 0 && canOrderDelivery && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-8 text-center">
          <div className="text-green-600">
            <h3 className="font-semibold mb-2">🚚 You have {deliveryCartItems.length} items in your delivery cart</h3>
            <p className="text-sm mb-3">Ready to place your delivery order?</p>
            <Link 
              to="/delivery-cart"
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              Go to Delivery Cart
            </Link>
          </div>
        </div>
      )}
      </div>
    </ErrorBoundary>
  );
};

export default Menu;
