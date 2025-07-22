import { useState } from "react";
import { ShoppingCart, Star, Coins, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";

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
}

interface ProductModalProps {
  item: ShopItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ProductModal({ item, isOpen, onClose }: ProductModalProps) {
  const { addToCart } = useCart();
  const { toast } = useToast();
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  if (!item) return null;

  // Create array of all images (cover + additional)
  const allImages = [item.image_url, ...(item.additional_images || [])];

  const handleAddToCart = () => {
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
    onClose();
  };

  const finalPrice = item.is_on_sale && item.sale_price ? item.sale_price : item.price;
  const tensensEarned = Math.round(finalPrice * 0.01) * 166;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{item.name}</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Images */}
          <div className="space-y-4">
            {/* Main Image */}
            <div className="relative aspect-square overflow-hidden rounded-lg">
              <img
                src={allImages[currentImageIndex]}
                alt={item.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-4 right-4 flex flex-col gap-2">
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
                      className="w-full h-full object-cover"
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
                      {item.price}€
                    </span>
                    <span className="text-3xl font-bold text-red-600">
                      {item.sale_price}€
                    </span>
                  </>
                ) : (
                  <span className="text-3xl font-bold text-primary">
                    {item.price}€
                  </span>
                )}
              </div>
              
              <div className="flex items-center text-green-600">
                <Coins className="h-5 w-5 mr-2" />
                <span className="font-medium">
                  +{tensensEarned} points Tensens à gagner
                </span>
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

            {/* Rating */}
            <div className="flex items-center gap-2">
              <div className="flex items-center">
                <Star className="h-5 w-5 text-yellow-400 fill-current" />
                <Star className="h-5 w-5 text-yellow-400 fill-current" />
                <Star className="h-5 w-5 text-yellow-400 fill-current" />
                <Star className="h-5 w-5 text-yellow-400 fill-current" />
                <Star className="h-5 w-5 text-muted-foreground" />
              </div>
              <span className="text-sm text-muted-foreground">(4.0/5)</span>
            </div>

            {/* Add to Cart Button */}
            <Button 
              onClick={handleAddToCart}
              size="lg"
              className="w-full"
            >
              <ShoppingCart className="h-5 w-5 mr-2" />
              Ajouter au panier
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}