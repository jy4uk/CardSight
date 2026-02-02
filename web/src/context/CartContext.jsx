import { createContext, useContext, useState, useCallback } from 'react';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [lastScannedItem, setLastScannedItem] = useState(null);
  const [scanError, setScanError] = useState(null);

  // Add item to cart (each inventory item is unique by ID)
  const addToCart = useCallback((item) => {
    setCartItems(prev => {
      // Check if item already exists in cart by inventory ID
      const existingIndex = prev.findIndex(cartItem => cartItem.id === item.id);
      
      if (existingIndex >= 0) {
        // Item already in cart - don't add duplicate (each card is unique)
        return prev;
      }
      
      // Add new item
      return [...prev, { ...item, addedAt: Date.now() }];
    });
    
    setLastScannedItem(item);
    setScanError(null);
    
    // Auto-open cart on first item
    setIsCartOpen(true);
    
    // Clear the "last scanned" after 3 seconds
    setTimeout(() => {
      setLastScannedItem(prev => prev?.id === item.id ? null : prev);
    }, 3000);
  }, []);

  // Remove item from cart
  const removeFromCart = useCallback((itemId) => {
    setCartItems(prev => prev.filter(item => item.id !== itemId));
  }, []);

  // Update item in cart
  const updateCartItem = useCallback((itemId, updates) => {
    setCartItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, ...updates } : item
    ));
  }, []);

  // Clear entire cart
  const clearCart = useCallback(() => {
    setCartItems([]);
    setLastScannedItem(null);
    setScanError(null);
  }, []);

  // Set scan error (for not found barcodes)
  const setError = useCallback((error) => {
    setScanError(error);
    setTimeout(() => {
      setScanError(prev => prev === error ? null : prev);
    }, 4000);
  }, []);

  // Calculate cart totals
  const cartTotal = cartItems.reduce((sum, item) => {
    const price = parseFloat(item.front_label_price || item.purchase_price || 0);
    return sum + price;
  }, 0);

  const cartCount = cartItems.length;

  const value = {
    cartItems,
    cartCount,
    cartTotal,
    isCartOpen,
    setIsCartOpen,
    addToCart,
    removeFromCart,
    updateCartItem,
    clearCart,
    lastScannedItem,
    scanError,
    setError,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}

export default CartContext;
