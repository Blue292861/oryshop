import { useState, useEffect } from "react";
import { ShoppingCart, Plus, Minus, Trash2, Coins, CreditCard, LogIn, UserPlus, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/Layout";
import { Link } from "react-router-dom";
import BundleSuggestionCard from "@/components/BundleSuggestionCard";

export default function Cart() {
  const { 
    items, 
    updateQuantity, 
    removeFromCart, 
    clearCart, 
    getTotalPrice, 
    getShippingCost, 
    getTotalWithShipping,
    getSubtotal,
    getAppliedDiscounts,
    getTotalDiscount,
    getIncompleteBundles,
    addBundleToCart
  } = useCart();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [incompleteBundles, setIncompleteBundles] = useState<any[]>([]);
  const [loadingBundleProducts, setLoadingBundleProducts] = useState(false);
  const { toast } = useToast();

  // Récupérer les bundles incomplets et les détails des produits
  useEffect(() => {
    const fetchIncompleteBundlesData = async () => {
      const incomplete = getIncompleteBundles();
      
      // Pour chaque bundle incomplet, récupérer les infos des produits manquants
      const bundlesWithProducts = await Promise.all(
        incomplete.map(async (bundleData) => {
          const { data: products } = await supabase
            .from('shop_items')
            .select('id, name, price, image_url')
            .in('id', bundleData.missingProducts);
          
          return {
            ...bundleData,
            missingProductsDetails: products || []
          };
        })
      );
      
      setIncompleteBundles(bundlesWithProducts);
    };
    
    fetchIncompleteBundlesData();
  }, [items]);

  const handleCompleteBundle = async (bundleId: string) => {
    setLoadingBundleProducts(true);
    try {
      await addBundleToCart(bundleId);
      toast({
        title: "🎉 Lot complété !",
        description: "Les articles manquants ont été ajoutés à votre panier",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter les articles",
        variant: "destructive",
      });
    } finally {
      setLoadingBundleProducts(false);
    }
  };

  const handleCheckout = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Erreur",
          description: "Vous devez être connecté pour passer commande",
          variant: "destructive",
        });
        return;
      }

      // Create Stripe checkout session
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: { items }
      });

      if (error) {
        console.error('Erreur lors de la création de la session de paiement:', error);
        throw new Error(error.message || 'Erreur lors de la création de la session de paiement');
      }

      if (data?.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        console.error('Aucune URL de paiement reçue:', data);
        throw new Error('URL de paiement non reçue du serveur');
      }
      
    } catch (error: any) {
      console.error('Erreur complète lors du checkout:', error);
      
      let errorMessage = "Une erreur est survenue lors de la commande. Veuillez réessayer.";
      
      // Provide more specific error messages
      if (error.message?.includes('RLS') || error.message?.includes('row-level security')) {
        errorMessage = "Erreur de sécurité. Veuillez vous reconnecter et réessayer.";
      } else if (error.message?.includes('Rate limit')) {
        errorMessage = "Trop de tentatives. Veuillez attendre quelques minutes avant de réessayer.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Erreur de commande",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <Layout>
        <div className="text-center py-20">
          <ShoppingCart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Votre panier est vide</h2>
          <p className="text-muted-foreground">
            Ajoutez des articles depuis la boutique pour commencer
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Mon Panier
          </h1>
          <p className="text-muted-foreground text-lg">
            Vérifiez vos articles avant de finaliser votre commande
          </p>
        </div>

        {/* Bundle Suggestions */}
        {incompleteBundles.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <Gift className="h-6 w-6 text-primary" />
              Offres spéciales pour vous
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {incompleteBundles.map((bundleData) => (
                <BundleSuggestionCard
                  key={bundleData.bundle.id}
                  bundle={bundleData.bundle}
                  missingProducts={bundleData.missingProductsDetails}
                  onAddBundle={handleCompleteBundle}
                />
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => {
              const price = item.is_on_sale && item.sale_price ? item.sale_price : item.price;
              const itemKey = `${item.id}-${item.selectedSize || 'no-size'}`;
              
              return (
                <Card key={itemKey} className="overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex gap-4">
                      <div className="w-24 h-24 relative overflow-hidden rounded-lg">
                         <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-full h-full object-contain bg-background"
                        />
                        {item.is_on_sale && (
                          <Badge className="absolute top-1 right-1 bg-red-600 text-white text-xs">
                            Soldé
                          </Badge>
                        )}
                      </div>
                      
                       <div className="flex-1">
                         <h3 className="font-semibold text-lg mb-1">{item.name}</h3>
                         {item.selectedSize && (
                           <p className="text-sm font-medium text-primary">Taille: {item.selectedSize}</p>
                         )}
                       </div>
                      
                      <div className="text-right space-y-2">
                         <div className="flex flex-col items-end">
                           {item.is_on_sale && item.sale_price ? (
                             <>
                               <span className="text-sm text-muted-foreground line-through">
                                 {item.price.toFixed(2)}€
                               </span>
                               <span className="text-xl font-bold text-red-600">
                                 {price.toFixed(2)}€
                               </span>
                             </>
                           ) : (
                             <span className="text-xl font-bold text-primary">
                               {price.toFixed(2)}€
                             </span>
                            )}
                          </div>
                        
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateQuantity(item.id, item.quantity - 1, item.selectedSize)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center">{item.quantity}</span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateQuantity(item.id, item.quantity + 1, item.selectedSize)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => removeFromCart(item.id, item.selectedSize)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Récapitulatif de commande</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Sous-total ({items.reduce((sum, item) => sum + item.quantity, 0)} articles)</span>
                    <span>{getSubtotal().toFixed(2)}€</span>
                  </div>
                  
                  {/* Applied Discounts */}
                  {getAppliedDiscounts().map((discount, index) => (
                    <div key={index} className="flex justify-between text-green-600">
                      <span className="text-sm">
                        🎉 {discount.bundle_name} (-{discount.discount_percentage}%)
                      </span>
                      <span>-{discount.discount_amount.toFixed(2)}€</span>
                    </div>
                  ))}
                  
                  {getTotalDiscount() > 0 && (
                    <div className="flex justify-between font-medium text-green-600">
                      <span>Total des remises:</span>
                      <span>-{getTotalDiscount().toFixed(2)}€</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between">
                    <span>Frais de port</span>
                    <span>{getShippingCost().toFixed(2)}€</span>
                  </div>
                </div>
                
                <hr className="border-border" />
                
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>{getTotalWithShipping().toFixed(2)}€</span>
                </div>
                
                {user ? (
                  <>
                    <Button 
                      onClick={handleCheckout}
                      disabled={loading}
                      className="w-full cursor-coin-pouch"
                      size="lg"
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      {loading ? "Traitement..." : "Finaliser la commande"}
                    </Button>
                    
                    <p className="text-xs text-muted-foreground text-center">
                      Vous serez redirigé vers Stripe pour le paiement sécurisé
                    </p>
                  </>
                ) : (
                  <div className="space-y-3">
                    <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg text-center">
                      <h3 className="font-semibold mb-2">Finalisez votre commande</h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        Créez votre compte gratuit pour passer commande et profiter de tous nos avantages !
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <Link to="/auth" className="block">
                        <Button variant="outline" className="w-full gap-2">
                          <LogIn className="h-4 w-4" />
                          Se connecter
                        </Button>
                      </Link>
                      <Link to="/auth" className="block">
                        <Button className="w-full gap-2">
                          <UserPlus className="h-4 w-4" />
                          S'inscrire
                        </Button>
                      </Link>
                    </div>
                    
                    <p className="text-xs text-muted-foreground text-center">
                      Vos articles resteront dans votre panier après inscription
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}