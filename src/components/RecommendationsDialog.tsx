import { useState } from "react";
import { Sparkles, ShoppingCart, Link2, Tag as TagIcon, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface RecommendationsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  recommendations: Array<{
    id: string;
    name: string;
    price: number;
    image_url: string;
    is_on_sale?: boolean;
    sale_price?: number;
    tags?: string[];
  }>;
  currentProductName: string;
  currentProductTags?: string[];
  onAddToCart: (item: any) => void;
}

export default function RecommendationsDialog({
  isOpen,
  onClose,
  recommendations,
  currentProductName,
  currentProductTags = [],
  onAddToCart,
}: RecommendationsDialogProps) {
  const [addingItems, setAddingItems] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  if (recommendations.length === 0) return null;

  const handleAddToCart = async (item: any) => {
    setAddingItems(prev => new Set(prev).add(item.id));
    try {
      await onAddToCart(item);
      toast({
        title: "Ajouté !",
        description: `${item.name} a été ajouté au panier`,
      });
    } finally {
      setAddingItems(prev => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  };

  const getRecommendationType = (item: any) => {
    // Check for common tags
    const commonTags = item.tags?.filter((tag: string) => 
      currentProductTags.includes(tag)
    ) || [];
    
    if (commonTags.length >= 2) {
      return { type: "similar", label: "Style similaire", icon: TagIcon, color: "text-accent" };
    }
    
    return { type: "related", label: "Recommandé", icon: Link2, color: "text-primary" };
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              <DialogTitle className="text-2xl">Ces produits pourraient vous intéresser</DialogTitle>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          <p className="text-muted-foreground mt-2">
            Basé sur votre ajout de <span className="font-semibold text-foreground">"{currentProductName}"</span>
          </p>
        </DialogHeader>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          {recommendations.map((item) => {
            const recommendationType = getRecommendationType(item);
            const displayPrice = item.is_on_sale && item.sale_price ? item.sale_price : item.price;
            const isAdding = addingItems.has(item.id);

            return (
              <Card 
                key={item.id} 
                className="group hover:shadow-lg transition-all duration-300 hover:scale-105 relative overflow-hidden"
              >
                <div className="absolute top-2 right-2 z-10">
                  <Badge 
                    variant="secondary" 
                    className={`${recommendationType.color} bg-background/90 backdrop-blur-sm flex items-center gap-1`}
                  >
                    <recommendationType.icon className="h-3 w-3" />
                    <span className="text-xs">{recommendationType.label}</span>
                  </Badge>
                </div>

                <CardContent className="p-3 space-y-3">
                  <div className="aspect-square relative overflow-hidden rounded-lg bg-muted">
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-full h-full object-contain transition-transform group-hover:scale-110"
                    />
                    {item.is_on_sale && (
                      <Badge className="absolute bottom-2 left-2 bg-red-600 text-white">
                        Soldé
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-1">
                    <h3 className="font-semibold text-sm line-clamp-2 min-h-[2.5rem]">
                      {item.name}
                    </h3>
                    
                    <div className="flex flex-col gap-1">
                      {item.is_on_sale && item.sale_price ? (
                        <>
                          <span className="text-xs text-muted-foreground line-through">
                            {item.price.toFixed(2)}€
                          </span>
                          <span className="text-lg font-bold text-red-600">
                            {displayPrice.toFixed(2)}€
                          </span>
                        </>
                      ) : (
                        <span className="text-lg font-bold text-primary">
                          {displayPrice.toFixed(2)}€
                        </span>
                      )}
                    </div>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => handleAddToCart(item)}
                    disabled={isAdding}
                    className="w-full"
                  >
                    <ShoppingCart className="h-3 w-3 mr-2" />
                    {isAdding ? "Ajout..." : "Ajouter"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="flex justify-center mt-6">
          <Button onClick={onClose} variant="outline" size="lg">
            Continuer mes achats
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
