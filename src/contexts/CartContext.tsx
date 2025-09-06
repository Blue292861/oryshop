import React, { createContext, useContext, useState, useEffect } from 'react';

export interface CartItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  seller: string;
  is_on_sale?: boolean;
  sale_price?: number;
  tags?: string[];
  quantity: number;
  selectedSize?: string;
  additional_images?: string[];
}

interface CartContextType {
  items: CartItem[];
  addToCart: (item: Omit<CartItem, 'quantity'>) => void;
  removeFromCart: (id: string, selectedSize?: string) => void;
  updateQuantity: (id: string, quantity: number, selectedSize?: string) => void;
  clearCart: () => void;
  getTotalPrice: () => number;
  getShippingCost: () => number;
  getTotalWithShipping: () => number;
  getTotalItems: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      setItems(JSON.parse(savedCart));
    }
  }, []);

  // Save cart to localStorage whenever items change
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(items));
  }, [items]);

  const addToCart = (item: Omit<CartItem, 'quantity'>) => {
    setItems(prev => {
      // For clothing items, treat different sizes as different items
      const existingItem = prev.find(cartItem => 
        cartItem.id === item.id && 
        (!item.selectedSize || cartItem.selectedSize === item.selectedSize)
      );
      
      if (existingItem) {
        return prev.map(cartItem =>
          cartItem.id === item.id && 
          (!item.selectedSize || cartItem.selectedSize === item.selectedSize)
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (id: string, selectedSize?: string) => {
    setItems(prev => prev.filter(item => 
      !(item.id === id && (!selectedSize || item.selectedSize === selectedSize))
    ));
  };

  const updateQuantity = (id: string, quantity: number, selectedSize?: string) => {
    if (quantity <= 0) {
      removeFromCart(id, selectedSize);
      return;
    }
    setItems(prev =>
      prev.map(item =>
        item.id === id && (!selectedSize || item.selectedSize === selectedSize) 
          ? { ...item, quantity } 
          : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const getTotalPrice = () => {
    return items.reduce((total, item) => {
      const price = item.is_on_sale && item.sale_price ? item.sale_price : item.price;
      return total + (price * item.quantity);
    }, 0);
  };

  const getShippingCost = () => {
    return items.length > 0 ? 4 : 0;
  };

  const getTotalWithShipping = () => {
    return getTotalPrice() + getShippingCost();
  };

  const getTotalItems = () => {
    return items.reduce((total, item) => total + item.quantity, 0);
  };


  return (
    <CartContext.Provider value={{
      items,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      getTotalPrice,
      getShippingCost,
      getTotalWithShipping,
      getTotalItems
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};