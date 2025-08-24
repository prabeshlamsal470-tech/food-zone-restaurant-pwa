import React, { Suspense } from 'react';
import './App.css';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Header from './components/Header';
import TableBanner from './components/TableBanner';
import FloatingCart from './components/FloatingCart';
import { CartProvider } from './context/CartContext';
import { DeliveryCartProvider } from './context/DeliveryCartContext';

// Lazy load all page components for better performance
const Homepage = React.lazy(() => import('./pages/Homepage'));
const Menu = React.lazy(() => import('./pages/Menu'));
const Tables = React.lazy(() => import('./pages/Tables'));
const TableOrder = React.lazy(() => import('./pages/TableOrder'));
const DeliveryCart = React.lazy(() => import('./pages/DeliveryCart'));
const Admin = React.lazy(() => import('./pages/Admin'));
const AdminMobile = React.lazy(() => import('./pages/AdminMobile'));
const AdminPremium = React.lazy(() => import('./pages/AdminPremium'));
const StaffDashboard = React.lazy(() => import('./pages/StaffDashboard'));
const Reception = React.lazy(() => import('./pages/Reception'));

// Ultra-minimal loading component for instant render
const LoadingSpinner = React.memo(() => (
  <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',backgroundColor:'#f9fafb'}}>
    <div style={{textAlign:'center'}}>
      <div style={{display:'inline-block',animation:'spin 1s linear infinite',borderRadius:'50%',width:'32px',height:'32px',borderBottom:'2px solid #d97706',marginBottom:'8px'}}></div>
      <div style={{fontSize:'14px',color:'#4b5563'}}>Loading...</div>
    </div>
  </div>
));

const AppContent = React.memo(() => {
  const location = useLocation();
  
  // Memoize page type checks to prevent re-calculations
  const pageType = React.useMemo(() => {
    const path = location.pathname;
    return {
      isAdminPage: path.startsWith('/admin'),
      isStaffPage: path.startsWith('/staff'),
      isReceptionPage: path.startsWith('/reception')
    };
  }, [location.pathname]);
  
  const showHeaderAndCart = !pageType.isAdminPage && !pageType.isStaffPage && !pageType.isReceptionPage;
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Only show Header and TableBanner on customer pages */}
      {showHeaderAndCart && (
        <>
          <Header />
          <TableBanner />
        </>
      )}
      
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/" element={<Homepage />} />
          <Route path="/menu" element={<Menu />} />
          <Route path="/tables" element={<Tables />} />
          <Route path="/delivery-cart" element={<DeliveryCart />} />
          <Route path="/staff" element={<StaffDashboard />} />
          <Route path="/reception" element={<Reception />} />
          <Route path="/admin" element={<AdminPremium />} />
          <Route path="/admin-premium" element={<AdminPremium />} />
          <Route path="/admin-mobile" element={<AdminMobile />} />
          <Route path="/admin-legacy" element={<Admin />} />
          <Route path="/:tableId" element={<TableOrder />} />
        </Routes>
      </Suspense>
      
      {/* Only show Floating Cart on customer pages */}
      {showHeaderAndCart && <FloatingCart />}
    </div>
  );
});

function App() {
  return (
    <Router>
      <CartProvider>
        <DeliveryCartProvider>
          <AppContent />
        </DeliveryCartProvider>
      </CartProvider>
    </Router>
  );
}

export default App;
