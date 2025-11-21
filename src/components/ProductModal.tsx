import { useState } from "react";
import { ShoppingCart, Star, Coins, X, Heart, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCart } from "@/contexts/CartContext";
import { useFavorites } from "@/contexts/FavoritesContext";
import { useToast } from "@/hooks/use-toast";
import { ShareButton } from "@/components/ShareButton";
import { useNavigate } from "react-router-dom";
import BundleNotificationDialog from "@/components/BundleNotificationDialog";
import RecommendationsDialog from "@/components/RecommendationsDialog";

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
  is_clothing?: boolean;
  available_sizes?: string[];
  additional_images?: string[];
  slug?: string;
}

interface ProductModalProps {
  item: ShopItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ProductModal({ item, isOpen, onClose }: ProductModalProps) {
  const { addToCart, getBundlesForProduct, addBundleToCart, getRecommendations } = useCart();
  const { isFavorite, addToFavorites, removeFromFavorites } = useFavorites();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showBundleDialog, setShowBundleDialog] = useState(false);
  const [availableBundles, setAvailableBundles] = useState<any[]>([]);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [recommendations, setRecommendations] = useState<any[]>([]);

  if (!item) return null;

  // Create array of all images (cover + additional)
  const allImages = [item.image_url, ...(item.additional_images || [])];

  const handleAddToCart = async () => {
    if (item.is_clothing && (!selectedSize || !item.available_sizes?.includes(selectedSize))) {
      toast({
        title: "Taille requise",
        description: "Veuillez sélectionner une taille disponible",
        variant: "destructive",
      });
      return;
    }

    addToCart({ ...item, selectedSize });
    toast({
      title: "Article ajouté !",
      description: `${item.name} a été ajouté à votre panier${selectedSize ? ` (taille ${selectedSize})` : ''}`,
    });

    // Vérifier si le produit fait partie d'un bundle
    const productBundles = getBundlesForProduct(item.id);
    if (productBundles.length > 0) {
      setAvailableBundles(productBundles);
      setShowBundleDialog(true);
      return;
    }

    // Charger les recommandations
    const recs = await getRecommendations(item.id);
    if (recs.length > 0) {
      setRecommendations(recs);
      setShowRecommendations(true);
    } else {
      onClose();
    }
  };

  const handleAddBundle = async (bundleId: string) => {
    await addBundleToCart(bundleId);
    toast({
      title: "🎉 Lot ajouté !",
      description: "Tous les articles du lot ont été ajoutés à votre panier",
    });
    setShowBundleDialog(false);

    // Charger les recommandations après le bundle
    const recs = await getRecommendations(item.id);
    if (recs.length > 0) {
      setRecommendations(recs);
      setShowRecommendations(true);
    } else {
      onClose();
    }
  };

  const finalPrice = item.is_on_sale && item.sale_price ? item.sale_price : item.price;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <DialogTitle className="text-2xl flex-1">{item.name}</DialogTitle>
            <div className="flex gap-2">
              {item.slug && (
                <>
                  <ShareButton 
                    url={`${window.location.origin}/product/${item.slug}`}
                    title={item.name}
                    description={item.description}
                    size="sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/product/${item.slug}`)}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Images */}
          <div className="space-y-4">
            {/* Main Image */}
            <div className="relative aspect-square overflow-hidden rounded-lg">
              <img
                src={allImages[currentImageIndex]}
                alt={item.name}
                className="w-full h-full object-contain bg-background"
              />
              <div className="absolute top-4 right-4 flex flex-col gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isFavorite(item.id)) {
                      removeFromFavorites(item.id);
                    } else {
                      addToFavorites(item.id);
                    }
                  }}
                  className="p-2 bg-background/80 backdrop-blur-sm rounded-full hover:bg-background transition-all hover:scale-110"
                  aria-label={isFavorite(item.id) ? "Retirer des favoris" : "Ajouter aux favoris"}
                >
                  <Heart
                    className={`w-5 h-5 transition-colors ${
                      isFavorite(item.id) ? "text-primary fill-primary" : "text-muted-foreground"
                    }`}
                  />
                </button>
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

            {/* Image Thumbnails */}
            {allImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {allImages.map((imageUrl, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                      currentImageIndex === index ? 'border-primary' : 'border-border'
                    }`}
                  >
                    <img
                      src={imageUrl}
                      alt={`Image ${index + 1}`}
                      className="w-full h-full object-contain bg-background"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="space-y-6">
            <div>
              <p className="text-muted-foreground text-lg leading-relaxed">
                {item.description}
              </p>
            </div>

            {/* Tags */}
            {item.tags && item.tags.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Catégories</h3>
                <div className="flex flex-wrap gap-2">
                  {item.tags.map((tag, index) => (
                    <Badge key={index} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Price */}
            <div className="space-y-2">
              <div className="flex items-center gap-4">
                {item.is_on_sale && item.sale_price ? (
                  <>
                    <span className="text-2xl text-muted-foreground line-through">
                      {item.price.toFixed(2)}€
                    </span>
                    <span className="text-3xl font-bold text-red-600">
                      {item.sale_price.toFixed(2)}€
                    </span>
                  </>
                ) : (
                  <span className="text-3xl font-bold text-primary">
                    {item.price.toFixed(2)}€
                  </span>
                )}
              </div>
            </div>

            {/* Seller */}
            <div>
              <span className="text-muted-foreground">
                Vendu par <span className="font-medium">{item.seller}</span>
              </span>
            </div>

            {/* Size Selection for Clothing */}
            {item.is_clothing && item.available_sizes && item.available_sizes.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold">Taille</h3>
                <div className="grid grid-cols-3 gap-2">
                  {item.available_sizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`p-2 border rounded-md text-center font-medium transition-colors ${
                        selectedSize === size
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border hover:border-primary'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}


            {/* Add to Cart Button */}
            <Button 
              onClick={handleAddToCart}
              size="lg"
              className="w-full cursor-coin-pouch"
            >
              <ShoppingCart className="h-5 w-5 mr-2" />
              Ajouter au panier
            </Button>
          </div>
        </div>
      </DialogContent>

      <BundleNotificationDialog
        isOpen={showBundleDialog}
        onClose={() => {
          setShowBundleDialog(false);
          onClose();
        }}
        bundles={availableBundles}
        currentProductName={item.name}
        onAddBundle={handleAddBundle}
      />

      <RecommendationsDialog
        isOpen={showRecommendations}
        onClose={() => {
          setShowRecommendations(false);
          onClose();
        }}
        recommendations={recommendations}
        currentProductName={item.name}
        currentProductTags={item.tags}
        onAddToCart={(product) => {
          addToCart(product);
        }}
      />
    </Dialog>
  );
}