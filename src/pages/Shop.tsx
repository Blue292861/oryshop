import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useCart } from '@/contexts/CartContext';
import { useFavorites } from '@/contexts/FavoritesContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ShoppingCart, Search, Filter, Coins, LogIn, Heart } from 'lucide-react';
import { Layout } from '@/components/Layout';
import ProductModal from '@/components/ProductModal';
import BundleNotificationDialog from '@/components/BundleNotificationDialog';
import { Link } from 'react-router-dom';

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
  categories?: string[];
  is_temporary?: boolean;
  is_clothing?: boolean;
  available_sizes?: string[];
}

const PREDEFINED_CATEGORIES = [
  { id: 'livres', name: 'Livres', icon: '📚' },
  { id: 'produits-derives', name: 'Produits Dérivés', icon: '🎁' },
  { id: 'packs', name: 'Packs', icon: '📦' },
  { id: 'accessoires', name: 'Accessoires', icon: '⚔️' },
  { id: 'vetements', name: 'Vêtements', icon: '👕' }
];

export default function Shop() {
  const navigate = useNavigate();
  const [items, setItems] = useState<ShopItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<ShopItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [bundleDialogOpen, setBundleDialogOpen] = useState(false);
  const [selectedBundles, setSelectedBundles] = useState<any[]>([]);
  const [lastAddedProduct, setLastAddedProduct] = useState<ShopItem | null>(null);
  const { addToCart, getBundlesForProduct, addBundleToCart } = useCart();
  const { isFavorite, addToFavorites, removeFromFavorites } = useFavorites();
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchItems();
  }, []);

  useEffect(() => {
    filterItems();
  }, [items, searchTerm]);

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from('shop_items')
        .select('*')
        .not('shop_type', 'eq', 'internal')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setItems(data || []);
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
        (item.categories && item.categories.some(cat => cat.toLowerCase().includes(searchTerm.toLowerCase()))) ||
        (item.tags && item.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())))
      );
    }

    setFilteredItems(filtered);
  };

  const handleAddToCart = (item: ShopItem) => {
    // Si c'est un vêtement, ouvrir le modal pour la sélection de taille
    if (item.is_clothing) {
      setSelectedItem(item);
      setIsModalOpen(true);
      return;
    }

    addToCart(item);
    if (!user) {
      toast({
        title: "Article ajouté !",
        description: `${item.name} a été ajouté à votre panier. Inscrivez-vous pour finaliser votre commande.`,
        action: (
          <Link to="/auth">
            <Button variant="outline" size="sm">
              S'inscrire
            </Button>
          </Link>
        ),
      });
    } else {
      toast({
        title: "Article ajouté !",
        description: `${item.name} a été ajouté à votre panier`,
      });
    }

    // Vérifier si le produit fait partie d'un bundle
    const productBundles = getBundlesForProduct(item.id);
    if (productBundles.length > 0) {
      setSelectedBundles(productBundles);
      setLastAddedProduct(item);
      setBundleDialogOpen(true);
    }
  };

  const handleAddBundleFromShop = async (bundleId: string) => {
    await addBundleToCart(bundleId);
    toast({
      title: "🎉 Lot complet ajouté !",
      description: "Tous les articles du lot sont maintenant dans votre panier",
    });
    setBundleDialogOpen(false);
  };

  const handleItemClick = (item: ShopItem) => {
    setSelectedItem(item);
    setIsModalOpen(true);
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
          {!user && (
            <div className="mt-4 p-4 bg-primary/10 border border-primary/20 rounded-lg max-w-md mx-auto">
              <p className="text-sm text-muted-foreground mb-3">
                💡 Parcourez librement nos produits ! Inscrivez-vous gratuitement pour passer commande.
              </p>
              <Link to="/auth">
                <Button size="sm" className="gap-2">
                  <LogIn className="h-4 w-4" />
                  S'inscrire / Se connecter
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Search Bar */}
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
        </div>

        {/* Category Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          {PREDEFINED_CATEGORIES.filter(cat => {
            // Afficher seulement les catégories qui ont des produits
            const categoryItems = filteredItems.filter(item => 
              item.categories?.includes(cat.id) || 
              (cat.id === 'livres' && item.category === 'livre') ||
              (cat.id === 'produits-derives' && item.category === 'produit dérivé') ||
              (cat.id === 'packs' && item.category === 'pack') ||
              (cat.id === 'accessoires' && item.category === 'accessoire') ||
              (cat.id === 'vetements' && item.category === 'vêtement')
            );
            return categoryItems.length > 0;
          }).map((cat) => {
            const categoryItems = filteredItems.filter(item => 
              item.categories?.includes(cat.id) || 
              (cat.id === 'livres' && item.category === 'livre') ||
              (cat.id === 'produits-derives' && item.category === 'produit dérivé') ||
              (cat.id === 'packs' && item.category === 'pack') ||
              (cat.id === 'accessoires' && item.category === 'accessoire') ||
              (cat.id === 'vetements' && item.category === 'vêtement')
            );
            
            return (
              <Button
                key={cat.id}
                variant="outline"
                onClick={() => navigate(`/shop/category/${cat.id}`)}
                className="h-auto p-4 flex flex-col items-center gap-2 cursor-feather hover:bg-primary/10"
              >
                <span className="text-2xl">{cat.icon}</span>
                <span className="text-sm font-medium cursor-feather">{cat.name}</span>
                <span className="text-xs text-muted-foreground">
                  {categoryItems.length} produit{categoryItems.length > 1 ? 's' : ''}
                </span>
              </Button>
            );
          })}
        </div>

        {/* Products by Categories */}
        {PREDEFINED_CATEGORIES.filter(categoryObj => {
          // Afficher seulement les catégories qui ont des produits
          const categoryItems = filteredItems.filter(item => {
            return (item.categories && item.categories.includes(categoryObj.id)) || 
                   (categoryObj.id === 'livres' && item.category === 'livre') ||
                   (categoryObj.id === 'produits-derives' && item.category === 'produit dérivé') ||
                   (categoryObj.id === 'packs' && item.category === 'pack') ||
                   (categoryObj.id === 'accessoires' && item.category === 'accessoire') ||
                   (categoryObj.id === 'vetements' && item.category === 'vêtement');
          });
          return categoryItems.length > 0;
        }).map((categoryObj) => {
          const categoryItems = filteredItems.filter(item => {
            return (item.categories && item.categories.includes(categoryObj.id)) || 
                   (categoryObj.id === 'livres' && item.category === 'livre') ||
                   (categoryObj.id === 'produits-derives' && item.category === 'produit dérivé') ||
                   (categoryObj.id === 'packs' && item.category === 'pack') ||
                   (categoryObj.id === 'accessoires' && item.category === 'accessoire') ||
                   (categoryObj.id === 'vetements' && item.category === 'vêtement');
          }).slice(0, 6); // Prendre seulement les 6 derniers produits de cette catégorie
          
          return (
            <div key={categoryObj.id} className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-primary border-b border-border pb-2 capitalize">
                  {categoryObj.name}
                </h2>
                <Button 
                  variant="outline" 
                  onClick={() => navigate(`/shop/category/${categoryObj.id}`)}
                  className="cursor-feather"
                >
                  Voir tout
                </Button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {categoryItems.map((item) => (
                  <Card 
                    key={item.id} 
                    className="group hover:shadow-lg transition-all duration-300 border-border bg-card/50 backdrop-blur-sm cursor-pointer"
                    onClick={() => handleItemClick(item)}
                  >
                    <CardHeader className="p-0">
                      <div className="aspect-square relative overflow-hidden rounded-t-lg">
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isFavorite(item.id)) {
                              removeFromFavorites(item.id);
                            } else {
                              addToFavorites(item.id);
                            }
                          }}
                          className="absolute top-2 left-2 p-2 bg-background/80 backdrop-blur-sm rounded-full hover:bg-background transition-all hover:scale-110 z-10"
                          aria-label={isFavorite(item.id) ? "Retirer des favoris" : "Ajouter aux favoris"}
                        >
                          <Heart
                            className={`w-4 h-4 transition-colors ${
                              isFavorite(item.id) ? "text-primary fill-primary" : "text-muted-foreground"
                            }`}
                          />
                        </button>
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
                    <CardContent className="p-3">
                      <CardTitle className="text-sm mb-2 group-hover:text-primary transition-colors line-clamp-2">
                        {item.name}
                      </CardTitle>
                      
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex flex-col">
                          {item.is_on_sale && item.sale_price ? (
                            <>
                              <span className="text-xs text-muted-foreground line-through opacity-60">
                                {item.price.toFixed(2)}€
                              </span>
                              <span className="text-lg font-bold text-red-600">
                                {item.sale_price.toFixed(2)}€
                              </span>
                            </>
                          ) : (
                            <span className="text-lg font-bold text-primary">
                              {item.price.toFixed(2)}€
                            </span>
                          )}
                        </div>
                        <div className="flex items-center text-xs text-muted-foreground">
                          <Coins className="h-3 w-3 mr-1" />
                          <span>+{Math.floor(((item.is_on_sale && item.sale_price ? item.sale_price : item.price) * 0.05) * 166)}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs text-muted-foreground">
                          {item.seller}
                        </span>
                      </div>

                      <Button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddToCart(item);
                        }}
                        size="sm"
                        className="w-full text-xs cursor-coin-pouch"
                      >
                        <ShoppingCart className="h-3 w-3 mr-1" />
                        Ajouter au panier
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}

        {filteredItems.length === 0 && (
          <div className="text-center py-20">
            <ShoppingCart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Aucun article trouvé</h3>
            <p className="text-muted-foreground">
              Essayez de modifier vos critères de recherche
            </p>
          </div>
        )}

        <ProductModal 
          item={selectedItem}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />

        <BundleNotificationDialog
          isOpen={bundleDialogOpen}
          onClose={() => setBundleDialogOpen(false)}
          bundles={selectedBundles}
          currentProductName={lastAddedProduct?.name || ""}
          onAddBundle={handleAddBundleFromShop}
        />
      </div>
    </Layout>
  );
}