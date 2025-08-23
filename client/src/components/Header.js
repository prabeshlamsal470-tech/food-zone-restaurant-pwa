import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
// import { useCart } from '../context/CartContext';
// import { useDeliveryCart } from '../context/DeliveryCartContext';

const Header = () => {
  const location = useLocation();
  // const { getTotalItems, currentTable } = useCart();
  // const { getDeliveryTotalItems } = useDeliveryCart();
  // const totalItems = getTotalItems();
  // const deliveryItems = getDeliveryTotalItems();
  const [isScrolled, setIsScrolled] = useState(false);
  
  // Show delivery cart for non-table pages, table cart for table pages
  const isNumericTablePage = location.pathname.match(/^\/\d+$/);
  const isEncryptedTablePage = location.pathname.match(/^\/[A-Za-z0-9]{12,}$/);
  const isTablePage = isNumericTablePage || isEncryptedTablePage;
  const isDeliveryCartPage = location.pathname === '/delivery-cart';
  const isMenuPage = location.pathname === '/menu';
  // const isTableMenuPage = isMenuPage && currentTable; // Menu page accessed from a table
  // const displayItems = isTablePage ? totalItems : deliveryItems;

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      setIsScrolled(scrollTop > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`sticky top-0 z-50 ${isTablePage ? 'bg-gradient-to-r from-amber-800 to-yellow-800' : 'bg-transparent'}`}>
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <Link to="/" className="flex items-center space-x-3">
            <div className="relative">
              <img 
                src="/images/logo.jpg" 
                alt="Food Zone Logo" 
                className={`h-16 w-16 rounded-full object-cover shadow-lg border-2 ${isTablePage ? 'border-amber-200' : 'border-white'}`}
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextElementSibling.style.display = 'flex';
                }}
              />
              <div className={`h-16 w-16 rounded-full bg-gradient-to-br from-orange-500 to-red-600 shadow-lg border-2 ${isTablePage ? 'border-amber-200' : 'border-white'} hidden items-center justify-center`}>
                <span className="text-white font-bold text-lg">FZ</span>
              </div>
            </div>
            <div className={`${isTablePage ? 'text-amber-100' : 'text-white'} transition-all duration-300 ${isScrolled || location.pathname !== '/' ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>
              <h1 className="text-xl font-bold">Food Zone</h1>
              <p className="text-sm opacity-90">Restaurant</p>
            </div>
          </Link>
          
          <nav className="flex items-center">
            {!isMenuPage && !isTablePage && !isNumericTablePage && !isEncryptedTablePage && (
              <Link 
                to="/menu" 
                className={`flex items-center space-x-3 px-6 py-3 rounded-xl border-2 transition-all duration-300 transform hover:scale-105 ${
                  isDeliveryCartPage
                    ? 'bg-yellow-400 text-black border-yellow-400 font-bold shadow-lg'
                    : 'bg-white/10 text-white border-white/30 hover:bg-yellow-400 hover:text-black hover:border-yellow-400 font-semibold backdrop-blur-sm'
                }`}
              >
                <span className="text-3xl">🍽️</span>
                <span className="text-lg font-bold">
                  {isDeliveryCartPage ? 'Browse Menu' : 'View Menu'}
                </span>
              </Link>
            )}
          </nav>

        </div>
      </div>
    </header>
  );
};

export default Header;
