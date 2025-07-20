import { useState, useEffect } from "react";
import { ShoppingCart, Clock, Star, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/Layout";
import { Link } from "react-router-dom";

interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  category: string;
  seller: string;
  is_on_sale?: boolean;
  sale_price?: number;
  tags?: string[];
  is_temporary?: boolean;
}

export default function Index() {
  const [temporaryItems, setTemporaryItems] = useState<ShopItem[]>([]);
  const [showTemporary, setShowTemporary] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchTemporaryItems();
  }, []);

  const fetchTemporaryItems = async () => {
    try {
      const { data, error } = await supabase
        .from('shop_items')
        .select('*')
        .eq('is_temporary', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setTemporaryItems(data || []);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les articles temporaires",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (item: ShopItem) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Erreur",
          description: "Vous devez être connecté pour acheter",
          variant: "destructive",
        });
        return;
      }

      const finalPrice = item.is_on_sale && item.sale_price ? item.sale_price : item.price;
      const tensensEarned = Math.floor((finalPrice * 0.05) * 166);

      const { error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          item_id: item.id,
          item_name: item.name,
          price: finalPrice,
          status: 'completed'
        });

      if (orderError) throw orderError;

      const { error: pointsError } = await supabase
        .from('point_transactions')
        .insert({
          user_id: user.id,
          points: tensensEarned,
          transaction_type: 'purchase_reward',
          description: `Achat: ${item.name}`,
          source_app: 'oryshop'
        });

      if (pointsError) throw pointsError;

      toast({
        title: "Achat réussi !",
        description: `Vous avez gagné ${tensensEarned} points Tensens !`,
      });

    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de l'achat",
        variant: "destructive",
      });
    }
  };

  return (
    <Layout>
      <div className="space-y-8">
        {/* Hero Section */}
        <div className="text-center py-12">
          <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Bienvenue sur Oryshop
          </h1>
          <p className="text-muted-foreground text-xl mb-8">
            Votre boutique de produits dérivés où chaque achat rapporte des points Tensens !
          </p>
          <Link to="/shop">
            <Button size="lg" className="text-lg px-8 py-3">
              <ShoppingCart className="h-5 w-5 mr-2" />
              Explorer la boutique
            </Button>
          </Link>
        </div>

        {/* Temporary Items Section */}
        {temporaryItems.length > 0 && (
          <Card className="border-orange-200 bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-950/20 dark:to-yellow-950/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Clock className="h-6 w-6 text-orange-600" />
                  <div>
                    <CardTitle className="text-orange-800 dark:text-orange-200">
                      Seulement ce mois-ci !
                    </CardTitle>
                    <CardDescription className="text-orange-600 dark:text-orange-400">
                      Articles disponibles pour une durée limitée
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Label htmlFor="show-temporary" className="text-sm text-orange-700 dark:text-orange-300">
                    Afficher
                  </Label>
                  <Switch
                    id="show-temporary"
                    checked={showTemporary}
                    onCheckedChange={setShowTemporary}
                  />
                </div>
              </div>
            </CardHeader>
            
            {showTemporary && (
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {temporaryItems.slice(0, 6).map((item) => (
                    <Card key={item.id} className="group hover:shadow-lg transition-all duration-300 border-orange-200">
                      <CardHeader className="p-0">
                        <div className="aspect-square relative overflow-hidden rounded-t-lg">
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute top-2 right-2 flex flex-col gap-1">
                            <Badge className="bg-orange-600 text-white">
                              Temporaire
                            </Badge>
                            {item.is_on_sale && (
                              <Badge className="bg-red-600 text-white">
                                Soldé
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4">
                        <CardTitle className="text-lg mb-2 group-hover:text-primary transition-colors">
                          {item.name}
                        </CardTitle>
                        <CardDescription className="text-sm mb-3 line-clamp-2">
                          {item.description}
                        </CardDescription>
                        
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex flex-col">
                            {item.is_on_sale && item.sale_price ? (
                              <>
                                <span className="text-sm text-muted-foreground line-through opacity-60">
                                  {item.price}€
                                </span>
                                <span className="text-xl font-bold text-red-600">
                                  {item.sale_price}€
                                </span>
                              </>
                            ) : (
                              <span className="text-xl font-bold text-primary">
                                {item.price}€
                              </span>
                            )}
                          </div>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Coins className="h-4 w-4 mr-1" />
                            <span>+{Math.floor(((item.is_on_sale && item.sale_price ? item.sale_price : item.price) * 0.05) * 166)}</span>
                          </div>
                        </div>

                        <Button 
                          onClick={() => handlePurchase(item)}
                          className="w-full"
                          size="sm"
                        >
                          <ShoppingCart className="h-4 w-4 mr-2" />
                          Acheter
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                {temporaryItems.length > 6 && (
                  <div className="text-center mt-6">
                    <Link to="/shop">
                      <Button variant="outline">
                        Voir tous les articles temporaires
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        )}

        {/* Features Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="text-center p-6">
            <ShoppingCart className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Boutique complète</h3>
            <p className="text-muted-foreground">
              Découvrez une large gamme de produits dérivés de qualité
            </p>
          </Card>
          
          <Card className="text-center p-6">
            <Coins className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Points Tensens</h3>
            <p className="text-muted-foreground">
              Gagnez des points à chaque achat et débloquez des récompenses
            </p>
          </Card>
          
          <Card className="text-center p-6">
            <Star className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Qualité premium</h3>
            <p className="text-muted-foreground">
              Tous nos produits sont sélectionnés avec soin pour leur qualité
            </p>
          </Card>
        </div>
      </div>
    </Layout>
  );
}