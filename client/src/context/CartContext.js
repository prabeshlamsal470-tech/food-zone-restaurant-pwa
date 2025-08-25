import React, { createContext, useContext, useState, useEffect } from 'react';
import { decryptTableCode } from '../utils/tableEncryption';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [currentTable, setCurrentTable] = useState(null);

  // Get current table from URL or localStorage - ENCRYPTED CODES ONLY
  useEffect(() => {
    const path = window.location.pathname;
    const encryptedTableMatch = path.match(/^\/([A-Z0-9]{8,})$/);
    
    let tableId = null;
    
    if (encryptedTableMatch) {
      // Only encrypted table codes allowed - decrypt to get actual table number
      const encryptedCode = encryptedTableMatch[1];
      tableId = decryptTableCode(encryptedCode);
    }
    
    if (tableId && tableId >= 1 && tableId <= 25) {
      setCurrentTable(tableId);
      
      // Load cart items for current table
      const savedCart = localStorage.getItem(`cart_table_${tableId}`);
      const savedTimestamp = localStorage.getItem(`cart_timestamp_${tableId}`);
      
      if (savedCart && savedTimestamp) {
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        if (parseInt(savedTimestamp) > oneHourAgo) {
          setCartItems(JSON.parse(savedCart));
        } else {
          // Clear expired cart
          localStorage.removeItem(`cart_table_${tableId}`);
          localStorage.removeItem(`cart_timestamp_${tableId}`);
          setCartItems([]);
        }
      }
    } else {
      setCurrentTable(null);
      setCartItems([]);
    }
  }, []);

  const saveCart = (items) => {
    if (currentTable) {
      localStorage.setItem(`cart_table_${currentTable}`, JSON.stringify(items));
      localStorage.setItem(`cart_timestamp_${currentTable}`, Date.now().toString());
    }
  };

  const addToCart = (item, quantity = 1) => {
    setCartItems(prevItems => {
      const existingItem = prevItems.find(cartItem => cartItem.id === item.id);
      let newItems;
      
      if (existingItem) {
        newItems = prevItems.map(cartItem =>
          cartItem.id === item.id
            ? { ...cartItem, quantity: cartItem.quantity + quantity }
            : cartItem
        );
      } else {
        newItems = [...prevItems, { ...item, quantity }];
      }
      
      saveCart(newItems);
      return newItems;
    });
  };

  const removeFromCart = (itemId) => {
    setCartItems(prevItems => {
      const newItems = prevItems.filter(item => item.id !== itemId);
      saveCart(newItems);
      return newItems;
    });
  };

  const updateQuantity = (itemId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
      return;
    }
    
    setCartItems(prevItems => {
      const newItems = prevItems.map(item =>
        item.id === itemId ? { ...item, quantity } : item
      );
      saveCart(newItems);
      return newItems;
    });
  };

  const clearCart = () => {
    setCartItems([]);
    if (currentTable) {
      localStorage.removeItem(`cart_table_${currentTable}`);
      localStorage.removeItem(`cart_timestamp_${currentTable}`);
    }
  };

  const setTableContext = (tableId) => {
    setCurrentTable(tableId);
    
    // Load cart items for the new table
    const savedCart = localStorage.getItem(`cart_table_${tableId}`);
    const savedTimestamp = localStorage.getItem(`cart_timestamp_${tableId}`);
    
    if (savedCart && savedTimestamp) {
      const oneHourAgo = Date.now() - (60 * 60 * 1000);
      if (parseInt(savedTimestamp) > oneHourAgo) {
        setCartItems(JSON.parse(savedCart));
      } else {
        // Clear expired cart
        localStorage.removeItem(`cart_table_${tableId}`);
        localStorage.removeItem(`cart_timestamp_${tableId}`);
        setCartItems([]);
      }
    } else {
      setCartItems([]);
    }
  };

  const getTotalPrice = () => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getTotalItems = () => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  };

  return (
    <CartContext.Provider value={{
      cartItems,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      getTotalPrice,
      getTotalItems,
      currentTable,
      setTableContext
    }}>
      {children}
    </CartContext.Provider>
  );
};
