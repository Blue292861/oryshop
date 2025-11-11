import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, ShoppingCart, Search, LogIn } from 'lucide-react';
import { Link } from 'react-router-dom';
import ProductModal from '@/components/ProductModal';
import BundleNotificationDialog from '@/components/BundleNotificationDialog';
import RecommendationsDialog from '@/components/RecommendationsDialog';

interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  category: string;
  categories: string[];
  seller: string;
  is_on_sale?: boolean;
  sale_price?: number | null;
  tags?: string[];
}

const CATEGORY_NAMES: Record<string, string> = {
  'livres': 'Livres',
  'produits-derives': 'Produits Dérivés',
  'packs': 'Packs',
  'accessoires': 'Accessoires',
  'vetements': 'Vêtements'
};

export default function CategoryShop() {
  const { category } = useParams<{ category: string }>();
  const navigate = useNavigate();
  const { addToCart, getBundlesForProduct, addBundleToCart, getRecommendations } = useCart();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [items, setItems] = useState<ShopItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<ShopItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [bundleDialogOpen, setBundleDialogOpen] = useState(false);
  const [selectedBundles, setSelectedBundles] = useState<any[]>([]);
  const [lastAddedProduct, setLastAddedProduct] = useState<ShopItem | null>(null);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [recommendations, setRecommendations] = useState<any[]>([]);

  useEffect(() => {
    fetchItems();
  }, [category]);

  useEffect(() => {
    filterItems();
  }, [items, searchTerm, selectedTags]);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('shop_items')
        .select('*')
        .not('shop_type', 'eq', 'internal');

      if (error) throw error;

      // Filter items that belong to the current category
      const categoryItems = data?.filter(item => 
        item.categories?.includes(category) || 
        (category === 'livres' && item.category === 'livre') ||
        (category === 'produits-derives' && item.category === 'produit dérivé') ||
        (category === 'packs' && item.category === 'pack') ||
        (category === 'accessoires' && item.category === 'accessoire') ||
        (category === 'vetements' && item.category === 'vêtement')
      ) || [];

      setItems(categoryItems);

      // Extract unique tags
      const allTags = categoryItems.flatMap(item => item.tags || []);
      const uniqueTags = Array.from(new Set(allTags)).filter(Boolean);
      setAvailableTags(uniqueTags);
    } catch (error) {
      console.error('Error fetching items:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les produits',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filterItems = () => {
    let filtered = items;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.seller.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by tags
    if (selectedTags.length > 0) {
      filtered = filtered.filter(item =>
        selectedTags.some(tag => item.tags?.includes(tag))
      );
    }

    setFilteredItems(filtered);
  };

  const handleAddToCart = async (item: ShopItem) => {
    const cartItem = {
      id: item.id,
      name: item.name,
      description: item.description,
      price: item.is_on_sale && item.sale_price ? item.sale_price : item.price,
      image_url: item.image_url,
      seller: item.seller,
      is_on_sale: item.is_on_sale,
      sale_price: item.sale_price,
      tags: item.tags,
    };
    addToCart(cartItem);
    if (!user) {
      toast({
        title: 'Ajouté au panier',
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
        title: 'Ajouté au panier',
        description: `${item.name} a été ajouté à votre panier`,
      });
    }

    // Vérifier si le produit fait partie d'un bundle
    const productBundles = getBundlesForProduct(item.id);
    if (productBundles.length > 0) {
      setSelectedBundles(productBundles);
      setLastAddedProduct(item);
      setBundleDialogOpen(true);
      return;
    }

    // Charger les recommandations
    const recs = await getRecommendations(item.id);
    if (recs.length > 0) {
      setRecommendations(recs);
      setLastAddedProduct(item);
      setShowRecommendations(true);
    }
  };

  const handleAddBundleFromCategory = async (bundleId: string) => {
    await addBundleToCart(bundleId);
    toast({
      title: "🎉 Lot complet ajouté !",
      description: "Tous les articles du lot sont maintenant dans votre panier",
    });
    setBundleDialogOpen(false);

    // Charger les recommandations après le bundle
    if (lastAddedProduct) {
      const recs = await getRecommendations(lastAddedProduct.id);
      if (recs.length > 0) {
        setRecommendations(recs);
        setShowRecommendations(true);
      }
    }
  };

  const handleItemClick = (item: ShopItem) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const categoryName = CATEGORY_NAMES[category!] || 'Catégorie';

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/shop')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour à la boutique
          </Button>
          <h1 className="text-3xl font-bold text-foreground">{categoryName}</h1>
          {!user && (
            <div className="ml-auto p-3 bg-primary/10 border border-primary/20 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">
                💡 Inscrivez-vous pour commander
              </p>
              <Link to="/auth">
                <Button size="sm" variant="outline" className="gap-2">
                  <LogIn className="h-4 w-4" />
                  S'inscrire
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Search Bar */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            type="text"
            placeholder="Rechercher dans cette catégorie..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Tags Filter */}
        {availableTags.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Filtrer par tags</h3>
            <div className="flex flex-wrap gap-2">
              {availableTags.map(tag => (
                <Badge
                  key={tag}
                  variant={selectedTags.includes(tag) ? "default" : "secondary"}
                  className="cursor-pointer transition-colors"
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </Badge>
              ))}
            </div>
            {selectedTags.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedTags([])}
                className="mt-2"
              >
                Effacer les filtres
              </Button>
            )}
          </div>
        )}

        {/* Products Grid */}
        {filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">
              Aucun produit trouvé dans cette catégorie.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredItems.map((item) => {
              const currentPrice = item.is_on_sale && item.sale_price ? item.sale_price : item.price;
              
              return (
                <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
                  <div className="relative" onClick={() => handleItemClick(item)}>
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-full h-48 object-cover"
                    />
                    {item.is_on_sale && (
                      <div className="absolute top-2 right-2 bg-destructive text-destructive-foreground px-2 py-1 rounded text-sm font-bold">
                        PROMO
                      </div>
                    )}
                  </div>
                  <CardHeader className="pb-2" onClick={() => handleItemClick(item)}>
                    <CardTitle className="text-lg cursor-pointer">{item.name}</CardTitle>
                    <CardDescription className="text-sm line-clamp-2 cursor-pointer">
                      {item.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between mb-3" onClick={() => handleItemClick(item)}>
                      <div className="flex flex-col cursor-pointer">
                        <span className="text-xl font-bold text-primary">
                          {currentPrice.toFixed(2)} €
                        </span>
                        {item.is_on_sale && item.sale_price && (
                          <span className="text-sm text-muted-foreground line-through">
                            {item.price.toFixed(2)} €
                          </span>
                        )}
                      </div>
                      <span className="text-sm text-muted-foreground cursor-pointer">
                        par {item.seller}
                      </span>
                    </div>
                    
                    {item.tags && item.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {item.tags.slice(0, 3).map(tag => (
                          <Badge key={tag} variant="outline" className="text-xs">
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
                    
                    <Button
                      onClick={() => handleAddToCart(item)}
                      className="w-full gap-2"
                    >
                      <ShoppingCart className="h-4 w-4" />
                      Ajouter au panier
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

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
        onAddBundle={handleAddBundleFromCategory}
      />

      <RecommendationsDialog
        isOpen={showRecommendations}
        onClose={() => setShowRecommendations(false)}
        recommendations={recommendations}
        currentProductName={lastAddedProduct?.name || ""}
        currentProductTags={lastAddedProduct?.tags}
        onAddToCart={(product) => {
          addToCart(product);
        }}
      />
    </div>
  );
}