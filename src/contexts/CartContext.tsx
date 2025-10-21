import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";

interface BundleDeal {
  id: string;
  name: string;
  description?: string;
  product_ids: string[];
  discount_percentage: number;
  is_active: boolean;
}

interface AppliedDiscount {
  bundle_deal_id: string;
  bundle_name: string;
  discount_amount: number;
  discount_percentage: number;
}

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
  getAppliedDiscounts: () => AppliedDiscount[];
  getTotalDiscount: () => number;
  getSubtotal: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [bundles, setBundles] = useState<BundleDeal[]>([]);

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      const parsedCart = JSON.parse(savedCart);
      setItems(parsedCart);
      
      // Check if cart contains recently completed orders
      checkAndClearCompletedOrders(parsedCart);
    }
    fetchBundles();
    
    // Listen for cart changes in other tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'cart' && e.newValue === null) {
        setItems([]);
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Save cart to localStorage whenever items change
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(items));
  }, [items]);

  const fetchBundles = async () => {
    try {
      const { data, error } = await supabase
        .from('bundle_deals')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;
      setBundles(data || []);
    } catch (error) {
      console.error('Error fetching bundles:', error);
    }
  };

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

  const checkAndClearCompletedOrders = async (cartItems: CartItem[]) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || cartItems.length === 0) return;
    
    // Check for completed orders in the last 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: recentOrders } = await supabase
      .from('orders')
      .select('item_id')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .gte('created_at', tenMinutesAgo);
    
    if (recentOrders && recentOrders.length > 0) {
      const completedItemIds = recentOrders.map(o => o.item_id);
      const hasCompletedItems = cartItems.some(item => 
        completedItemIds.includes(item.id)
      );
      
      if (hasCompletedItems) {
        clearCart();
      }
    }
  };

  const getSubtotal = () => {
    return parseFloat(items.reduce((total, item) => {
      const price = item.is_on_sale && item.sale_price ? item.sale_price : item.price;
      return total + (price * item.quantity);
    }, 0).toFixed(2));
  };

  const getAppliedDiscounts = (): AppliedDiscount[] => {
    const appliedDiscounts: AppliedDiscount[] = [];
    const cartProductIds = items.map(item => item.id);

    bundles.forEach(bundle => {
      // Check if all products in the bundle are in the cart
      const bundleInCart = bundle.product_ids.every(productId => 
        cartProductIds.includes(productId)
      );

      if (bundleInCart) {
        // Calculate discount amount based on the products in the bundle
        let bundleTotal = 0;
        bundle.product_ids.forEach(productId => {
          const cartItem = items.find(item => item.id === productId);
          if (cartItem) {
            const price = cartItem.is_on_sale && cartItem.sale_price ? cartItem.sale_price : cartItem.price;
            bundleTotal += price * cartItem.quantity;
          }
        });

        const discountAmount = parseFloat((bundleTotal * (bundle.discount_percentage / 100)).toFixed(2));
        
        appliedDiscounts.push({
          bundle_deal_id: bundle.id,
          bundle_name: bundle.name,
          discount_amount: discountAmount,
          discount_percentage: bundle.discount_percentage
        });
      }
    });

    return appliedDiscounts;
  };

  const getTotalDiscount = () => {
    return parseFloat(getAppliedDiscounts().reduce((total, discount) => 
      total + discount.discount_amount, 0
    ).toFixed(2));
  };

  const getTotalPrice = () => {
    const subtotal = getSubtotal();
    const totalDiscount = getTotalDiscount();
    return parseFloat((subtotal - totalDiscount).toFixed(2));
  };

  const getShippingCost = () => {
    return items.length > 0 ? 4 : 0;
  };

  const getTotalWithShipping = () => {
    return parseFloat((getTotalPrice() + getShippingCost()).toFixed(2));
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
      getTotalItems,
      getAppliedDiscounts,
      getTotalDiscount,
      getSubtotal
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