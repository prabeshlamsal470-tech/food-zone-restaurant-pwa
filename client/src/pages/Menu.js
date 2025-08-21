import React, { useState, useEffect } from 'react';
import { fetchApi } from '../services/apiService';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useDeliveryCart } from '../context/DeliveryCartContext';

const Menu = () => {
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  // const location = useLocation();
  const { currentTable } = useCart();
  
  // Use appropriate cart based on customer type
  const { deliveryCartItems, addToDeliveryCart, updateDeliveryQuantity } = useDeliveryCart();
  const { cartItems, addToCart, updateQuantity } = useCart();
  
  // Determine customer type
  const isTableCustomer = !!currentTable;
  const canOrderDelivery = !isTableCustomer;

  useEffect(() => {
    fetchMenuItems();
  }, []);

  const fetchMenuItems = async () => {
    try {
      // const apiUrl = process.env.REACT_APP_API_URL || 'https://food-zone-backend-l00k.onrender.com';
      // const socket = io(apiUrl);
      const data = await fetchApi.get('/api/menu');
      setMenuItems(data);
    } catch (error) {
      console.error('Error fetching menu:', error);
    } finally {
      setLoading(false);
    }
  };

  const categories = ['All', ...new Set(menuItems.map(item => item.category))];
  
  // Filter items by category and search query
  const filteredItems = menuItems.filter(item => {
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesSearch = searchQuery === '' || 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesCategory && matchesSearch;
  });

  const getItemQuantity = (itemId) => {
    if (isTableCustomer) {
      // Use table cart for dine-in customers
      const cartItem = cartItems.find(item => item.id === itemId);
      return cartItem ? cartItem.quantity : 0;
    } else {
      // Use delivery cart for delivery customers
      const cartItem = deliveryCartItems.find(item => item.id === itemId);
      return cartItem ? cartItem.quantity : 0;
    }
  };


  const handleAddToCart = async (item) => {
    if (isTableCustomer) {
      addToCart(item, 1);
    } else {
      // For delivery customers, add directly to cart without API call
      addToDeliveryCart(item, 1);
    }
  };

  const handleUpdateQuantity = (itemId, newQuantity) => {
    if (isTableCustomer) {
      updateQuantity(itemId, newQuantity);
    } else {
      updateDeliveryQuantity(itemId, newQuantity);
    }
  };

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
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-center mb-8">Our Menu</h1>
      
      {/* Table Customer Notice */}
      {isTableCustomer && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6 text-center">
          <div className="text-orange-600">
            <h3 className="font-semibold mb-2">🪑 You're dining at Table {currentTable}</h3>
            <p className="text-sm mb-3">To place your order, please use your table's ordering system.</p>
            <Link
              to={`/${currentTable}`}
              className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors inline-block"
            >
              Go to Table {currentTable} Ordering
            </Link>
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
            className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>
      
      {/* Category Filter */}
      <div className="flex flex-wrap justify-center gap-2 mb-8">
        {categories.map(category => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-4 py-2 rounded-full transition-colors ${
              selectedCategory === category
                ? 'bg-primary text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Search Results Info */}
      {searchQuery && (
        <div className="text-center mb-4">
          <p className="text-gray-600">
            Found {filteredItems.length} items for "{searchQuery}"
            <button
              onClick={() => setSearchQuery('')}
              className="ml-2 text-primary hover:text-orange-600 underline text-sm"
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
            {searchQuery 
              ? `No menu items match "${searchQuery}". Try a different search term.`
              : 'No items match the selected category.'
            }
          </p>
          {searchQuery && (
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
      {filteredItems.length > 0 && (
        <div className="space-y-8">
          {selectedCategory === 'All' ? (
            // Show all categories with subheadings
            categories.filter(cat => cat !== 'All').map(category => {
              const categoryItems = filteredItems.filter(item => item.category === category);
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
                      <span className="text-sm font-normal text-gray-500">({categoryItems.length} items)</span>
                    </h2>
                  </div>
                  
                  {/* Category Items Grid */}
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {categoryItems.map(item => {
                      const quantity = getItemQuantity(item.id);
                      return (
                        <div key={item.id} className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-100 overflow-hidden">
                          <div className="p-6">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex-1">
                                <h3 className="text-xl font-bold text-gray-800 mb-2 leading-tight">{item.name}</h3>
                                {item.description && <p className="text-sm text-gray-600 mb-3 leading-relaxed">{item.description}</p>}
                              </div>
                              <div className="ml-4 flex-shrink-0">
                                <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-2 rounded-full shadow-md">
                                  <span className="text-lg font-bold">NPR {item.price}</span>
                                </div>
                              </div>
                            </div>
                            
                            {quantity === 0 ? (
                              <button
                                onClick={() => handleAddToCart(item)}
                                className={`w-full px-6 py-3 rounded-xl font-bold text-lg transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg ${
                                  isTableCustomer 
                                    ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600' 
                                    : 'bg-gradient-to-r from-green-500 to-blue-500 text-white hover:from-green-600 hover:to-blue-600'
                                }`}
                              >
                                {isTableCustomer ? `🍽️ Add to Table ${currentTable}` : '🚚 Add for Delivery'}
                              </button>
                            ) : (
                              <div className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
                                <div className="flex items-center gap-3">
                                  <button
                                    onClick={() => handleUpdateQuantity(item.id, quantity - 1)}
                                    className="bg-white text-gray-700 w-10 h-10 rounded-full hover:bg-gray-100 transition-all duration-200 shadow-md hover:shadow-lg font-bold text-lg"
                                  >
                                    −
                                  </button>
                                  <span className="font-bold text-xl w-8 text-center text-gray-800">{quantity}</span>
                                  <button
                                    onClick={() => handleUpdateQuantity(item.id, quantity + 1)}
                                    className={`w-10 h-10 rounded-full text-white transition-all duration-200 shadow-md hover:shadow-lg font-bold text-lg ${
                                      isTableCustomer 
                                        ? 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600' 
                                        : 'bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600'
                                    }`}
                                  >
                                    +
                                  </button>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm text-gray-500 font-medium">Total</div>
                                  <div className="text-lg font-bold text-gray-800">NPR {(item.price * quantity)}</div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          ) : (
            // Show single category without subheading
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredItems.map(item => {
                const quantity = getItemQuantity(item.id);
                return (
                  <div key={item.id} className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-100 overflow-hidden">
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-gray-800 mb-2 leading-tight">{item.name}</h3>
                          {item.description && <p className="text-sm text-gray-600 mb-3 leading-relaxed">{item.description}</p>}
                        </div>
                        <div className="ml-4 flex-shrink-0">
                          <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-2 rounded-full shadow-md">
                            <span className="text-lg font-bold">NPR {item.price}</span>
                          </div>
                        </div>
                      </div>
                      
                      {quantity === 0 ? (
                        <button
                          onClick={() => handleAddToCart(item)}
                          className={`w-full px-6 py-3 rounded-xl font-bold text-lg transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg ${
                            isTableCustomer 
                              ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600' 
                              : 'bg-gradient-to-r from-green-500 to-blue-500 text-white hover:from-green-600 hover:to-blue-600'
                          }`}
                        >
                          {isTableCustomer ? `🍽️ Add to Table ${currentTable}` : '🚚 Add for Delivery'}
                        </button>
                      ) : (
                        <div className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => handleUpdateQuantity(item.id, quantity - 1)}
                              className="bg-white text-gray-700 w-10 h-10 rounded-full hover:bg-gray-100 transition-all duration-200 shadow-md hover:shadow-lg font-bold text-lg"
                            >
                              −
                            </button>
                            <span className="font-bold text-xl w-8 text-center text-gray-800">{quantity}</span>
                            <button
                              onClick={() => handleUpdateQuantity(item.id, quantity + 1)}
                              className={`w-10 h-10 rounded-full text-white transition-all duration-200 shadow-md hover:shadow-lg font-bold text-lg ${
                                isTableCustomer 
                                  ? 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600' 
                                  : 'bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600'
                              }`}
                            >
                              +
                            </button>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-gray-500 font-medium">Total</div>
                            <div className="text-lg font-bold text-gray-800">NPR {(item.price * quantity)}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
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
  );
};

export default Menu;
