import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useDeliveryCart } from '../context/DeliveryCartContext';

const Header = () => {
  const location = useLocation();
  const { getTotalItems, currentTable } = useCart();
  const { getDeliveryTotalItems } = useDeliveryCart();
  const totalItems = getTotalItems();
  const deliveryItems = getDeliveryTotalItems();
  
  // Show delivery cart for non-table pages, table cart for table pages
  const isTablePage = location.pathname.match(/^\/\d+$/);
  const displayItems = isTablePage ? totalItems : deliveryItems;

  return (
    <header className="bg-transparent sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <Link to="/" className="flex items-center space-x-3">
            <div className="relative">
              <img 
                src="/images/logo.jpg" 
                alt="Food Zone Logo" 
                className="h-16 w-16 rounded-full object-cover shadow-lg border-2 border-white"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextElementSibling.style.display = 'flex';
                }}
              />
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-orange-500 to-red-600 shadow-lg border-2 border-white hidden items-center justify-center">
                <span className="text-white font-bold text-lg">FZ</span>
              </div>
            </div>
            <div className="text-white">
              <h1 className="text-xl font-bold">Food Zone</h1>
              <p className="text-sm opacity-90">Restaurant</p>
            </div>
          </Link>
          
          <nav className="flex items-center">
            <Link 
              to="/menu" 
              className={`flex items-center space-x-3 px-6 py-3 rounded-xl border-2 transition-all duration-300 transform hover:scale-105 ${
                location.pathname === '/menu' 
                  ? 'bg-yellow-400 text-black border-yellow-400 font-bold shadow-lg' 
                  : 'bg-white/10 text-white border-white/30 hover:bg-yellow-400 hover:text-black hover:border-yellow-400 font-semibold backdrop-blur-sm'
              }`}
            >
              <span className="text-3xl">🍽️</span>
              <span className="text-lg font-bold">View Menu</span>
            </Link>
          </nav>

          {/* Table Cart - for dine-in customers */}
          {totalItems > 0 && currentTable && isTablePage && (
            <Link 
              to={`/${currentTable}`}
              className="bg-primary text-white px-3 py-1 rounded-full text-sm font-semibold hover:bg-orange-600 transition-colors"
            >
              🛒 Dine-in Cart: {totalItems} items
            </Link>
          )}
          
          {/* Delivery Cart - for delivery customers */}
          {deliveryItems > 0 && !isTablePage && (
            <Link 
              to="/delivery-cart"
              className="bg-green-600 text-white px-3 py-1 rounded-full text-sm font-semibold hover:bg-green-700 transition-colors"
            >
              🚚 Delivery Cart: {deliveryItems} items
            </Link>
          )}
          
          {/* Fallback for edge cases */}
          {displayItems > 0 && isTablePage && !currentTable && (
            <div className="bg-gray-400 text-white px-3 py-1 rounded-full text-sm font-semibold">
              🛒 Cart: {displayItems} items
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
