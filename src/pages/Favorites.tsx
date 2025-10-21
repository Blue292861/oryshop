import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useFavorites } from "@/contexts/FavoritesContext";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ProductModal from "@/components/ProductModal";
import { Heart, Search, ShoppingBag } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  category: string;
  seller: string;
  is_temporary?: boolean;
  is_on_sale?: boolean;
  sale_price?: number;
  tags?: string[];
  is_clothing?: boolean;
  available_sizes?: string[];
  additional_images?: string[];
}

export default function Favorites() {
  const [items, setItems] = useState<ShopItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<ShopItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const { favorites, removeFromFavorites } = useFavorites();
  const { addToCart } = useCart();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchFavoriteItems();
  }, [favorites]);

  useEffect(() => {
    filterItems();
  }, [searchTerm, items]);

  const fetchFavoriteItems = async () => {
    try {
      if (favorites.length === 0) {
        setItems([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('shop_items')
        .select('*')
        .in('id', favorites);

      if (error) throw error;

      // Sort by favorites order (most recent first)
      const sortedData = data?.sort((a, b) => {
        const aIndex = favorites.indexOf(a.id);
        const bIndex = favorites.indexOf(b.id);
        return aIndex - bIndex;
      }) || [];

      setItems(sortedData);
    } catch (error) {
      console.error('Error fetching favorite items:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger vos favoris",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterItems = () => {
    if (!searchTerm.trim()) {
      setFilteredItems(items);
      return;
    }

    const filtered = items.filter(item =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredItems(filtered);
  };

  const handleAddToCart = (item: ShopItem) => {
    if (item.is_clothing) {
      setSelectedItem(item);
      setIsModalOpen(true);
    } else {
      addToCart(item);
      toast({
        title: "Article ajouté !",
        description: `${item.name} a été ajouté à votre panier`,
      });
    }
  };

  const handleRemoveFavorite = async (itemId: string, itemName: string) => {
    await removeFromFavorites(itemId);
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-8">
            <Heart className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">Mes Articles Favoris</h1>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-muted rounded-lg h-64 mb-4"></div>
                <div className="bg-muted h-4 rounded mb-2"></div>
                <div className="bg-muted h-4 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Heart className="w-8 h-8 text-primary fill-primary" />
          <h1 className="text-3xl font-bold">Mes Articles Favoris</h1>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-16">
            <Heart className="w-24 h-24 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Aucun favori pour le moment</h2>
            <p className="text-muted-foreground mb-6">
              Vous n'avez pas encore ajouté d'articles à vos favoris. Explorez la boutique pour découvrir nos produits !
            </p>
            <Button onClick={() => navigate('/shop')}>
              <ShoppingBag className="w-4 h-4 mr-2" />
              Explorer la boutique
            </Button>
          </div>
        ) : (
          <>
            {/* Search bar */}
            <div className="mb-6 relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <Input
                type="text"
                placeholder="Rechercher dans mes favoris..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {filteredItems.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-muted-foreground">Aucun article ne correspond à votre recherche</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredItems.map((item) => (
                  <div
                    key={item.id}
                    className="bg-card rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 border border-border"
                  >
                    <div className="relative">
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-full h-48 object-cover cursor-pointer"
                        onClick={() => {
                          setSelectedItem(item);
                          setIsModalOpen(true);
                        }}
                      />
                      <button
                        onClick={() => handleRemoveFavorite(item.id, item.name)}
                        className="absolute top-2 right-2 p-2 bg-background/80 backdrop-blur-sm rounded-full hover:bg-background transition-colors"
                        aria-label="Retirer des favoris"
                      >
                        <Heart className="w-5 h-5 text-primary fill-primary" />
                      </button>
                      {item.is_temporary && (
                        <div className="absolute top-2 left-2 bg-orange-500 text-white px-2 py-1 rounded text-xs font-semibold">
                          Temporaire
                        </div>
                      )}
                      {item.is_on_sale && item.sale_price && (
                        <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded text-xs font-semibold">
                          Soldé
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-lg mb-2 line-clamp-1">{item.name}</h3>
                      <p className="text-muted-foreground text-sm mb-3 line-clamp-2">{item.description}</p>
                      <div className="flex items-center justify-between mb-3">
                        {item.is_on_sale && item.sale_price ? (
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-primary">{item.sale_price}€</span>
                            <span className="text-sm text-muted-foreground line-through">{item.price}€</span>
                          </div>
                        ) : (
                          <span className="text-lg font-bold text-primary">{item.price}€</span>
                        )}
                      </div>
                      <Button
                        onClick={() => handleAddToCart(item)}
                        className="w-full"
                      >
                        <ShoppingBag className="w-4 h-4 mr-2" />
                        Ajouter au panier
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {selectedItem && (
          <ProductModal
            item={selectedItem}
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
              setSelectedItem(null);
            }}
          />
        )}
      </div>
    </Layout>
  );
}
