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
const TableOrder = React.lazy(() => import('./pages/TableOrder'));
const DeliveryCart = React.lazy(() => import('./pages/DeliveryCart'));
const Admin = React.lazy(() => import('./pages/Admin'));
const AdminMobile = React.lazy(() => import('./pages/AdminMobile'));
const AdminPremium = React.lazy(() => import('./pages/AdminPremium'));
const StaffDashboard = React.lazy(() => import('./pages/StaffDashboard'));
const Reception = React.lazy(() => import('./pages/Reception'));

// Loading component for Suspense fallback
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mb-4"></div>
      <div className="text-lg font-semibold text-gray-700">Loading Food Zone...</div>
      <div className="text-sm text-gray-500 mt-2">Please wait a moment</div>
    </div>
  </div>
);

function AppContent() {
  const location = useLocation();
  
  // Check if current path is an admin, staff, or reception page
  const isAdminPage = location.pathname.startsWith('/admin');
  const isStaffPage = location.pathname.startsWith('/staff');
  const isReceptionPage = location.pathname.startsWith('/reception');
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Only show Header and TableBanner on non-admin, non-staff, and non-reception pages */}
      {!isAdminPage && !isStaffPage && !isReceptionPage && (
        <>
          <Header />
          <TableBanner />
        </>
      )}
      
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/" element={<Homepage />} />
          <Route path="/menu" element={<Menu />} />
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
      
      {/* Only show Floating Cart on non-admin, non-staff, and non-reception pages */}
      {!isAdminPage && !isStaffPage && !isReceptionPage && <FloatingCart />}
    </div>
  );
}

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
