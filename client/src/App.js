import React, { useEffect } from 'react';
import './App.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import TableBanner from './components/TableBanner';
import FloatingCart from './components/FloatingCart';
import Homepage from './pages/Homepage';
import Menu from './pages/Menu';
import TableOrder from './pages/TableOrder';
import DeliveryCart from './pages/DeliveryCart';
import Admin from './pages/Admin';
import AdminModern from './pages/AdminModern';
import AdminMobile from './pages/AdminMobile';
import { CartProvider } from './context/CartContext';
import { DeliveryCartProvider } from './context/DeliveryCartContext';
import { TableProvider } from './context/TableContext';
import tableCacheManager from './utils/tableCacheManager';
import advancedCacheManager from './utils/advancedCacheManager';
import tableCacheScheduler from './utils/tableCacheScheduler';

function App() {
  const [isMobile, setIsMobile] = React.useState(false);

  useEffect(() => {
    // Check if device is mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    // Initialize comprehensive cache management system
    console.log('🚀 Food Zone Restaurant - Comprehensive Cache Management Initialized');
    console.log('🧹 Automatic cleanup every 10 minutes for all table URLs (1-25)');
    console.log('💾 Clearing: LocalStorage, SessionStorage, Cookies, IndexedDB, Cache API, WebSQL');
    console.log('🎯 Smart scheduling with admin panel integration');
    
    // Initialize scheduler (coordinates all cache managers)
    tableCacheScheduler.init();
    
    // Listen for cache cleanup events
    const handleTableCacheCleanup = (event) => {
      console.log(`✅ Table cache cleanup completed for ${event.detail.tablesCleared} tables at ${event.detail.timestamp}`);
    };
    
    const handleAdvancedCacheCleanup = (event) => {
      console.log(`🔄 Advanced cache cleanup completed in ${event.detail.duration}ms at ${event.detail.timestamp}`);
    };
    
    window.addEventListener('tableCacheCleanup', handleTableCacheCleanup);
    window.addEventListener('cacheCleanupComplete', handleAdvancedCacheCleanup);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('tableCacheCleanup', handleTableCacheCleanup);
      window.removeEventListener('cacheCleanupComplete', handleAdvancedCacheCleanup);
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
                <Route path="/admin" element={isMobile ? <AdminMobile /> : <AdminModern />} />
                <Route path="/admin-legacy" element={<Admin />} />
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
