import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import TableBanner from './components/TableBanner';
import FloatingCart from './components/FloatingCart';
import Homepage from './pages/Homepage';
import Menu from './pages/Menu';
import TableOrder from './pages/TableOrder';
import DeliveryCart from './pages/DeliveryCart';
import Admin from './pages/Admin';
import { CartProvider } from './context/CartContext';
import { DeliveryCartProvider } from './context/DeliveryCartContext';
import { TableProvider } from './context/TableContext';
// import cacheManager from './utils/cacheManager';

function App() {
  useEffect(() => {
    // Initialize cache manager on app start
    console.log('🚀 Food Zone Restaurant - Cache Manager Initialized');
    console.log('🧹 Automatic cleanup every 10 minutes for tables 1-25');
    
    // Listen for cache cleanup events
    const handleCacheCleanup = (event) => {
      console.log(`✅ Cache cleanup completed for ${event.detail.tablesCleared} tables at ${event.detail.timestamp}`);
    };
    
    window.addEventListener('cacheCleanup', handleCacheCleanup);
    
    return () => {
      window.removeEventListener('cacheCleanup', handleCacheCleanup);
    };
  }, []);

  return (
    <Router>
      <TableProvider>
        <CartProvider>
          <DeliveryCartProvider>
            <div className="min-h-screen bg-gray-50">
              <Header />
              <TableBanner />
              <Routes>
                <Route path="/" element={<Homepage />} />
                <Route path="/menu" element={<Menu />} />
                <Route path="/delivery-cart" element={<DeliveryCart />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/:tableId" element={<TableOrder />} />
              </Routes>
              
              {/* Floating Cart - Available on all pages */}
              <FloatingCart />
            </div>
          </DeliveryCartProvider>
        </CartProvider>
      </TableProvider>
    </Router>
  );
}

export default App;
