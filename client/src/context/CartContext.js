import React, { createContext, useContext, useState, useEffect } from 'react';
import { useTable } from './TableContext';

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
  const { currentTable } = useTable();

  useEffect(() => {
    if (currentTable) {
      // Load cart items for current table
      const savedCart = localStorage.getItem(`cart_table_${currentTable}`);
      const savedTimestamp = localStorage.getItem(`cart_timestamp_${currentTable}`);
      
      if (savedCart && savedTimestamp) {
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        if (parseInt(savedTimestamp) > oneHourAgo) {
          setCartItems(JSON.parse(savedCart));
        } else {
          // Clear expired cart
          localStorage.removeItem(`cart_table_${currentTable}`);
          localStorage.removeItem(`cart_timestamp_${currentTable}`);
          setCartItems([]);
        }
      }
    } else {
      setCartItems([]);
    }
  }, [currentTable]);

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
      getTotalItems
    }}>
      {children}
    </CartContext.Provider>
  );
};
