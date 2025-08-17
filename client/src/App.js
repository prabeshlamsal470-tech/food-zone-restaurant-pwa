import React from 'react';
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
import AdminMobile from './pages/AdminMobile';
import AdminPremium from './pages/AdminPremium';
import { CartProvider } from './context/CartContext';
import { DeliveryCartProvider } from './context/DeliveryCartContext';
import { TableProvider } from './context/TableContext';

function App() {

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
                <Route path="/admin" element={<AdminPremium />} />
                <Route path="/admin-mobile" element={<AdminMobile />} />
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
