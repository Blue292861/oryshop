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

interface PromoCode {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  minimum_purchase_amount: number;
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
  bundles: BundleDeal[];
  appliedPromoCode: PromoCode | null;
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
  getPromoDiscount: () => number;
  getSubtotal: () => number;
  getBundlesForProduct: (productId: string) => BundleDeal[];
  getIncompleteBundles: () => Array<{
    bundle: BundleDeal;
    missingProducts: string[];
    hasAtLeastOne: boolean;
  }>;
  addBundleToCart: (bundleId: string) => Promise<void>;
  applyPromoCode: (code: string) => Promise<{ success: boolean; message: string }>;
  removePromoCode: () => void;
  getRecommendations: (productId: string, limit?: number) => Promise<CartItem[]>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [bundles, setBundles] = useState<BundleDeal[]>([]);
  const [appliedPromoCode, setAppliedPromoCode] = useState<PromoCode | null>(null);

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

  const getPromoDiscount = () => {
    if (!appliedPromoCode) return 0;
    
    const subtotal = getSubtotal();
    const bundleDiscount = getTotalDiscount();
    const subtotalAfterBundles = subtotal - bundleDiscount;
    
    if (appliedPromoCode.discount_type === 'percentage') {
      return parseFloat((subtotalAfterBundles * (appliedPromoCode.discount_value / 100)).toFixed(2));
    } else {
      return Math.min(appliedPromoCode.discount_value, subtotalAfterBundles);
    }
  };

  const getTotalPrice = () => {
    const subtotal = getSubtotal();
    const bundleDiscount = getTotalDiscount();
    const promoDiscount = getPromoDiscount();
    return parseFloat((subtotal - bundleDiscount - promoDiscount).toFixed(2));
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

  const getBundlesForProduct = (productId: string): BundleDeal[] => {
    return bundles.filter(bundle => 
      bundle.is_active && bundle.product_ids.includes(productId)
    );
  };

  const getIncompleteBundles = (): Array<{
    bundle: BundleDeal;
    missingProducts: string[];
    hasAtLeastOne: boolean;
  }> => {
    const cartProductIds = items.map(item => item.id);
    
    return bundles
      .filter(bundle => bundle.is_active)
      .map(bundle => {
        const missingProducts = bundle.product_ids.filter(
          productId => !cartProductIds.includes(productId)
        );
        const hasAtLeastOne = bundle.product_ids.some(
          productId => cartProductIds.includes(productId)
        );
        
        return {
          bundle,
          missingProducts,
          hasAtLeastOne
        };
      })
      .filter(result => result.hasAtLeastOne && result.missingProducts.length > 0);
  };

  const addBundleToCart = async (bundleId: string) => {
    const bundle = bundles.find(b => b.id === bundleId);
    if (!bundle) return;
    
    // Récupérer les détails des produits depuis Supabase
    const { data: products } = await supabase
      .from('shop_items')
      .select('*')
      .in('id', bundle.product_ids);
    
    if (products) {
      products.forEach(product => {
        // Ne pas ajouter si déjà dans le panier
        const existingItem = items.find(item => item.id === product.id);
        if (!existingItem) {
          addToCart({
            id: product.id,
            name: product.name,
            description: product.description,
            price: product.price,
            image_url: product.image_url,
            seller: product.seller,
            is_on_sale: product.is_on_sale,
            sale_price: product.sale_price,
            tags: product.tags
          });
        }
      });
    }
  };

  const applyPromoCode = async (code: string): Promise<{ success: boolean; message: string }> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, message: "Vous devez être connecté pour utiliser un code promo" };
      }

      // Vérifier l'existence et la validité du code
      const { data: promoCode, error } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('code', code.toUpperCase())
        .single();

      if (error || !promoCode) {
        return { success: false, message: "Code promo invalide" };
      }

      // Vérifier si actif
      if (!promoCode.is_active) {
        return { success: false, message: "Ce code promo n'est plus actif" };
      }

      // Vérifier les dates
      const now = new Date();
      if (promoCode.start_date && new Date(promoCode.start_date) > now) {
        return { success: false, message: "Ce code promo n'est pas encore valide" };
      }
      if (promoCode.expiration_date && new Date(promoCode.expiration_date) < now) {
        return { success: false, message: "Ce code promo a expiré" };
      }

      // Vérifier le montant minimum
      const currentTotal = getTotalPrice();
      if (currentTotal < promoCode.minimum_purchase_amount) {
        return { 
          success: false, 
          message: `Montant minimum requis: ${promoCode.minimum_purchase_amount.toFixed(2)}€` 
        };
      }

      // Vérifier le nombre d'utilisations
      if (promoCode.max_uses && promoCode.current_uses >= promoCode.max_uses) {
        return { success: false, message: "Ce code promo a atteint sa limite d'utilisation" };
      }

      // Vérifier si l'utilisateur a déjà utilisé ce code (si single_use)
      if (promoCode.is_single_use) {
        const { data: redemptions } = await supabase
          .from('promo_code_redemptions')
          .select('id')
          .eq('promo_code_id', promoCode.id)
          .eq('user_id', user.id)
          .limit(1);

        if (redemptions && redemptions.length > 0) {
          return { success: false, message: "Vous avez déjà utilisé ce code promo" };
        }
      }

      // Appliquer le code
      setAppliedPromoCode({
        id: promoCode.id,
        code: promoCode.code,
        discount_type: promoCode.discount_type as 'percentage' | 'fixed',
        discount_value: promoCode.discount_value,
        minimum_purchase_amount: promoCode.minimum_purchase_amount
      });

      return { 
        success: true, 
        message: `Code promo appliqué ! ${promoCode.discount_type === 'percentage' ? `-${promoCode.discount_value}%` : `-${promoCode.discount_value}€`}` 
      };
    } catch (error: any) {
      return { success: false, message: "Erreur lors de l'application du code promo" };
    }
  };

  const removePromoCode = () => {
    setAppliedPromoCode(null);
  };

  const getRecommendations = async (productId: string, limit = 4): Promise<CartItem[]> => {
    try {
      // Récupérer le produit ajouté
      const { data: product } = await supabase
        .from('shop_items')
        .select('tags, related_book_ids')
        .eq('id', productId)
        .single();
      
      if (!product) return [];
      
      let recommendations: any[] = [];
      
      // Stratégie 1 : Produits des mêmes livres
      if (product.related_book_ids?.length > 0) {
        const { data: bookRelated } = await supabase
          .from('shop_items')
          .select('*')
          .neq('id', productId)
          .overlaps('related_book_ids', product.related_book_ids)
          .limit(limit);
        
        recommendations = bookRelated || [];
      }
      
      // Stratégie 2 : Compléter avec produits de tags similaires
      if (recommendations.length < limit && product.tags?.length > 0) {
        const { data: tagRelated } = await supabase
          .from('shop_items')
          .select('*')
          .neq('id', productId)
          .overlaps('tags', product.tags)
          .limit(limit - recommendations.length);
        
        recommendations = [...recommendations, ...(tagRelated || [])];
      }
      
      // Stratégie 3 : Produits aléatoires si pas assez de recommandations
      if (recommendations.length < limit) {
        const { data: random } = await supabase
          .from('shop_items')
          .select('*')
          .neq('id', productId)
          .limit(limit - recommendations.length);
        
        recommendations = [...recommendations, ...(random || [])];
      }
      
      // Filtrer les produits déjà dans le panier
      const cartProductIds = items.map(item => item.id);
      recommendations = recommendations.filter(rec => !cartProductIds.includes(rec.id));
      
      return recommendations.slice(0, limit).map(rec => ({
        id: rec.id,
        name: rec.name,
        description: rec.description,
        price: rec.price,
        image_url: rec.image_url,
        seller: rec.seller,
        is_on_sale: rec.is_on_sale,
        sale_price: rec.sale_price,
        tags: rec.tags,
        quantity: 1
      }));
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      return [];
    }
  };

  return (
    <CartContext.Provider value={{
      items,
      bundles,
      appliedPromoCode,
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
      getPromoDiscount,
      getSubtotal,
      getBundlesForProduct,
      getIncompleteBundles,
      addBundleToCart,
      applyPromoCode,
      removePromoCode,
      getRecommendations
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