import { useState, useEffect } from "react";
import { ShoppingCart, Star, Coins, Filter, Search, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/Layout";

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

export default function Shop() {
  const [items, setItems] = useState<ShopItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<ShopItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedTag, setSelectedTag] = useState("all");
  const [categories, setCategories] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchItems();
  }, []);

  useEffect(() => {
    filterItems();
  }, [items, searchTerm, selectedCategory, selectedTag]);

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from('shop_items')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setItems(data || []);
      
      // Extract unique categories
      const uniqueCategories = [...new Set((data || []).map(item => item.category))];
      setCategories(uniqueCategories);
      
      // Extract unique tags
      const allTags = (data || []).flatMap(item => item.tags || []);
      const uniqueTags = [...new Set(allTags)];
      setTags(uniqueTags);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les articles",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterItems = () => {
    let filtered = items;

    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.tags && item.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())))
      );
    }

    if (selectedCategory !== "all") {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }

    if (selectedTag !== "all") {
      filtered = filtered.filter(item => item.tags && item.tags.includes(selectedTag));
    }

    setFilteredItems(filtered);
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

      // Calculate Tensens points: 5% of final price * 166
      const finalPrice = item.is_on_sale && item.sale_price ? item.sale_price : item.price;
      const tensensEarned = Math.floor((finalPrice * 0.05) * 166);

      // Create order
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

      // Add Tensens points transaction
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

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-20">
          <div className="animate-pulse">
            <ShoppingCart className="h-16 w-16 text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Chargement de la boutique...</p>
          </div>
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
            Boutique Oryshop
          </h1>
          <p className="text-muted-foreground text-lg">
            Découvrez nos trésors médiévaux et gagnez des points Tensens !
          </p>
        </div>

        {/* Filters */}
        <div className="space-y-4">
          <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
            <div className="relative flex-1 max-w-md mx-auto lg:mx-0">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher des articles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          {/* Category Filters */}
          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2">
            <Filter className="h-4 w-4 text-muted-foreground hidden sm:inline" />
            <span className="text-sm text-muted-foreground hidden sm:inline">Catégories:</span>
            <Button
              variant={selectedCategory === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory("all")}
            >
              Toutes
            </Button>
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className="text-xs sm:text-sm"
              >
                {category}
              </Button>
            ))}
          </div>

          {/* Tag Filters */}
          {tags.length > 0 && (
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2">
              <Tag className="h-4 w-4 text-muted-foreground hidden sm:inline" />
              <span className="text-sm text-muted-foreground hidden sm:inline">Tags:</span>
              <Button
                variant={selectedTag === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedTag("all")}
              >
                Tous
              </Button>
              {tags.map((tag) => (
                <Button
                  key={tag}
                  variant={selectedTag === tag ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedTag(tag)}
                  className="text-xs sm:text-sm"
                >
                  {tag}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Items Grid by Categories */}
        {tags.map((tag) => {
          const categoryItems = filteredItems.filter(item => item.tags && item.tags.includes(tag));
          if (categoryItems.length === 0) return null;
          
          return (
            <div key={tag} className="space-y-6">
              <h2 className="text-2xl font-bold text-primary border-b border-border pb-2">
                {tag}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {categoryItems.map((item) => (
                  <Card key={item.id} className="group hover:shadow-lg transition-all duration-300 border-border bg-card/50 backdrop-blur-sm">
                    <CardHeader className="p-0">
                      <div className="aspect-square relative overflow-hidden rounded-t-lg">
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute top-2 right-2 flex flex-col gap-1">
                          {item.is_on_sale && (
                            <Badge className="bg-red-600 text-white">
                              Soldé
                            </Badge>
                          )}
                          {item.is_temporary && (
                            <Badge className="bg-orange-600 text-white">
                              Temporaire
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

                      {/* Tags */}
                      {item.tags && item.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {item.tags.slice(0, 3).map((tag, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {item.tags.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{item.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex flex-col">
                          {item.is_on_sale && item.sale_price ? (
                            <>
                              <span className="text-sm text-muted-foreground line-through opacity-60">
                                {item.price}€
                              </span>
                              <span className="text-2xl font-bold text-red-600">
                                {item.sale_price}€
                              </span>
                            </>
                          ) : (
                            <span className="text-2xl font-bold text-primary">
                              {item.price}€
                            </span>
                          )}
                        </div>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Coins className="h-4 w-4 mr-1" />
                          <span>+{Math.floor(((item.is_on_sale && item.sale_price ? item.sale_price : item.price) * 0.05) * 166)} Tensens</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mb-4">
                        <span className="text-sm text-muted-foreground">
                          Par {item.seller}
                        </span>
                        <div className="flex items-center">
                          <Star className="h-4 w-4 text-yellow-400 fill-current" />
                          <Star className="h-4 w-4 text-yellow-400 fill-current" />
                          <Star className="h-4 w-4 text-yellow-400 fill-current" />
                          <Star className="h-4 w-4 text-yellow-400 fill-current" />
                          <Star className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>

                      <Button 
                        onClick={() => handlePurchase(item)}
                        className="w-full group-hover:bg-primary/90 transition-colors"
                      >
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        Acheter
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}

        {/* Items without tags */}
        {(() => {
          const itemsWithoutTags = filteredItems.filter(item => !item.tags || item.tags.length === 0);
          if (itemsWithoutTags.length === 0) return null;
          
          return (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-primary border-b border-border pb-2">
                Sans catégorie
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {itemsWithoutTags.map((item) => (
                  <Card key={item.id} className="group hover:shadow-lg transition-all duration-300 border-border bg-card/50 backdrop-blur-sm">
                    <CardHeader className="p-0">
                      <div className="aspect-square relative overflow-hidden rounded-t-lg">
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute top-2 right-2 flex flex-col gap-1">
                          {item.is_on_sale && (
                            <Badge className="bg-red-600 text-white">
                              Soldé
                            </Badge>
                          )}
                          {item.is_temporary && (
                            <Badge className="bg-orange-600 text-white">
                              Temporaire
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
                              <span className="text-2xl font-bold text-red-600">
                                {item.sale_price}€
                              </span>
                            </>
                          ) : (
                            <span className="text-2xl font-bold text-primary">
                              {item.price}€
                            </span>
                          )}
                        </div>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Coins className="h-4 w-4 mr-1" />
                          <span>+{Math.floor(((item.is_on_sale && item.sale_price ? item.sale_price : item.price) * 0.05) * 166)} Tensens</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mb-4">
                        <span className="text-sm text-muted-foreground">
                          Par {item.seller}
                        </span>
                        <div className="flex items-center">
                          <Star className="h-4 w-4 text-yellow-400 fill-current" />
                          <Star className="h-4 w-4 text-yellow-400 fill-current" />
                          <Star className="h-4 w-4 text-yellow-400 fill-current" />
                          <Star className="h-4 w-4 text-yellow-400 fill-current" />
                          <Star className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>

                      <Button 
                        onClick={() => handlePurchase(item)}
                        className="w-full group-hover:bg-primary/90 transition-colors"
                      >
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        Acheter
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })()}

        {filteredItems.length === 0 && (
          <div className="text-center py-20">
            <ShoppingCart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Aucun article trouvé</h3>
            <p className="text-muted-foreground">
              Essayez de modifier vos critères de recherche
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}