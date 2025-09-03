import { useState } from "react";
import { ShoppingCart, Plus, Minus, Trash2, Coins, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/contexts/CartContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/Layout";

export default function Cart() {
  const { items, updateQuantity, removeFromCart, clearCart, getTotalPrice } = useCart();
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

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

      // Create orders for each item
      const orderPromises = items.map(async (item) => {
        const finalPrice = item.is_on_sale && item.sale_price ? item.sale_price : item.price;
        
        // Create order
        const { error: orderError } = await supabase
          .from('orders')
          .insert({
            user_id: user.id,
            item_id: item.id,
            item_name: item.name,
            price: finalPrice * item.quantity,
            status: 'completed'
          });

        if (orderError) throw orderError;
      });

      await Promise.all(orderPromises);

      // Clear cart after successful purchase
      clearCart();

      toast({
        title: "Commande confirmée !",
        description: "Votre commande a été traitée avec succès !",
      });

      // Here you would normally integrate with Stripe
      // For now, we'll just show a success message
      
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la commande",
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
                          className="w-full h-full object-cover"
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
                          <p className="text-sm font-medium text-primary mb-1">Taille: {item.selectedSize}</p>
                        )}
                        <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                        <div className="flex flex-wrap gap-1 mb-2">
                          {item.tags?.slice(0, 2).map((tag, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        <p className="text-sm text-muted-foreground">Par {item.seller}</p>
                      </div>
                      
                      <div className="text-right space-y-2">
                        <div className="flex flex-col items-end">
                          {item.is_on_sale && item.sale_price ? (
                            <>
                              <span className="text-sm text-muted-foreground line-through">
                                {item.price}€
                              </span>
                              <span className="text-xl font-bold text-red-600">
                                {price}€
                              </span>
                            </>
                          ) : (
                            <span className="text-xl font-bold text-primary">
                              {price}€
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
                    <span>Articles ({items.reduce((sum, item) => sum + item.quantity, 0)})</span>
                    <span>{getTotalPrice()}€</span>
                  </div>
                </div>
                
                <hr className="border-border" />
                
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>{getTotalPrice()}€</span>
                </div>
                
                <Button 
                  onClick={handleCheckout}
                  disabled={loading}
                  className="w-full"
                  size="lg"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  {loading ? "Traitement..." : "Finaliser la commande"}
                </Button>
                
                <p className="text-xs text-muted-foreground text-center">
                  Vous serez redirigé vers Stripe pour le paiement sécurisé
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}