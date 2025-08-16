import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useCart } from '../context/CartContext';
import { useDeliveryCart } from '../context/DeliveryCartContext';
// import { useLocation } from 'react-router-dom';
import { useTable } from '../context/TableContext';

const Menu = () => {
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  // const location = useLocation();
  const { currentTable } = useTable();
  
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
      const response = await axios.get('http://localhost:5001/api/menu');
      setMenuItems(response.data);
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

  const getItemImage = (item) => {
    // Use Food Zone Restaurant Logo for all menu items as stock image
    return '/images/Food Zone Restaurant Logo.jpg';
  };

  const handleAddToCart = (item) => {
    if (isTableCustomer) {
      addToCart(item, 1);
    } else {
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
            <button
              onClick={() => window.location.href = `/${currentTable}`}
              className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors"
            >
              Go to Table {currentTable} Ordering
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
                        <div key={item.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                          <img 
                            src={getItemImage(item)} 
                            alt={item.name}
                            className="w-full h-48 object-cover"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = '/images/menu-common.jpg';
                            }}
                          />
                          <div className="p-4">
                            <h3 className="text-xl font-semibold mb-2">{item.name}</h3>
                            {item.description && <p className="text-sm text-gray-500 mb-3">{item.description}</p>}
                            <p className="text-2xl font-bold text-primary mb-4">NPR {item.price}/-</p>
                            
                            {quantity === 0 ? (
                              <button
                                onClick={() => handleAddToCart(item)}
                                className={`w-full px-4 py-2 rounded-lg transition-colors font-medium ${
                                  isTableCustomer 
                                    ? 'bg-primary text-white hover:bg-orange-600' 
                                    : 'bg-green-600 text-white hover:bg-green-700'
                                }`}
                              >
                                {isTableCustomer ? `Add to Table ${currentTable}` : 'Add for Delivery'}
                              </button>
                            ) : (
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleUpdateQuantity(item.id, quantity - 1)}
                                    className="bg-gray-200 text-gray-700 w-8 h-8 rounded-full hover:bg-gray-300 transition-colors"
                                  >
                                    -
                                  </button>
                                  <span className="font-semibold text-lg w-8 text-center">{quantity}</span>
                                  <button
                                    onClick={() => handleUpdateQuantity(item.id, quantity + 1)}
                                    className={`w-8 h-8 rounded-full text-white transition-colors ${
                                      isTableCustomer 
                                        ? 'bg-primary hover:bg-orange-600' 
                                        : 'bg-green-600 hover:bg-green-700'
                                    }`}
                                  >
                                    +
                                  </button>
                                </div>
                                <span className="text-sm font-medium text-gray-600">
                                  NPR {(item.price * quantity)}/-
                                </span>
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
                  <div key={item.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                    <img 
                      src={getItemImage(item)} 
                      alt={item.name}
                      className="w-full h-48 object-cover"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = '/images/menu-common.jpg';
                      }}
                    />
                    <div className="p-4">
                      <h3 className="text-xl font-semibold mb-2">{item.name}</h3>
                      {item.description && <p className="text-sm text-gray-500 mb-3">{item.description}</p>}
                      <p className="text-2xl font-bold text-primary mb-4">NPR {item.price}/-</p>
                      
                      {quantity === 0 ? (
                        <button
                          onClick={() => handleAddToCart(item)}
                          className={`w-full px-4 py-2 rounded-lg transition-colors font-medium ${
                            isTableCustomer 
                              ? 'bg-primary text-white hover:bg-orange-600' 
                              : 'bg-green-600 text-white hover:bg-green-700'
                          }`}
                        >
                          {isTableCustomer ? `Add to Table ${currentTable}` : 'Add for Delivery'}
                        </button>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleUpdateQuantity(item.id, quantity - 1)}
                              className="bg-gray-200 text-gray-700 w-8 h-8 rounded-full hover:bg-gray-300 transition-colors"
                            >
                              -
                            </button>
                            <span className="font-semibold text-lg w-8 text-center">{quantity}</span>
                            <button
                              onClick={() => handleUpdateQuantity(item.id, quantity + 1)}
                              className={`w-8 h-8 rounded-full text-white transition-colors ${
                                isTableCustomer 
                                  ? 'bg-primary hover:bg-orange-600' 
                                  : 'bg-green-600 hover:bg-green-700'
                              }`}
                            >
                              +
                            </button>
                          </div>
                          <span className="text-sm font-medium text-gray-600">
                            NPR {(item.price * quantity)}/-
                          </span>
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
