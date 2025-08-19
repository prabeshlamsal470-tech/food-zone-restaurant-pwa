import React from 'react';
import './App.css';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Header from './components/Header';
import TableBanner from './components/TableBanner';
import FloatingCart from './components/FloatingCart';
import Homepage from './pages/Homepage';
import Menu from './pages/Menu';
import TableOrder from './pages/TableOrder';
import DeliveryCart from './pages/DeliveryCart';
import Admin from './pages/Admin';
import AdminMobile from './pages/AdminMobile';
import AdminPremium from './pages/AdminPremium';
import StaffDashboard from './pages/StaffDashboard';
import { CartProvider } from './context/CartContext';
import { DeliveryCartProvider } from './context/DeliveryCartContext';

function AppContent() {
  const location = useLocation();
  
  // Check if current path is an admin or staff page
  const isAdminPage = location.pathname.startsWith('/admin');
  const isStaffPage = location.pathname.startsWith('/staff');
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Only show Header and TableBanner on non-admin and non-staff pages */}
      {!isAdminPage && !isStaffPage && (
        <>
          <Header />
          <TableBanner />
        </>
      )}
      
      <Routes>
        <Route path="/" element={<Homepage />} />
        <Route path="/menu" element={<Menu />} />
        <Route path="/delivery-cart" element={<DeliveryCart />} />
        <Route path="/staff" element={<StaffDashboard />} />
        <Route path="/admin" element={<AdminPremium />} />
        <Route path="/admin-premium" element={<AdminPremium />} />
        <Route path="/admin-mobile" element={<AdminMobile />} />
        <Route path="/admin-legacy" element={<Admin />} />
        <Route path="/:tableId" element={<TableOrder />} />
      </Routes>
      
      {/* Only show Floating Cart on non-admin and non-staff pages */}
      {!isAdminPage && !isStaffPage && <FloatingCart />}
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
