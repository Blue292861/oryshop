import { Gift, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useCart } from "@/contexts/CartContext";

interface BundleDeal {
  id: string;
  name: string;
  description?: string;
  product_ids: string[];
  discount_percentage: number;
}

interface BundleNotificationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  bundles: BundleDeal[];
  currentProductName: string;
  onAddBundle: (bundleId: string) => Promise<void>;
}

export default function BundleNotificationDialog({
  isOpen,
  onClose,
  bundles,
  currentProductName,
  onAddBundle,
}: BundleNotificationDialogProps) {
  const { items } = useCart();

  const isProductInCart = (productId: string) => {
    return items.some(item => item.id === productId);
  };

  const allProductsInCart = (bundle: BundleDeal) => {
    return bundle.product_ids.every(id => isProductInCart(id));
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-primary/10 rounded-full">
              <Gift className="h-6 w-6 text-primary" />
            </div>
            <div>
              <AlertDialogTitle className="text-2xl">
                Économisez avec nos lots !
              </AlertDialogTitle>
              <AlertDialogDescription className="text-base mt-1">
                "{currentProductName}" fait partie de {bundles.length} lot{bundles.length > 1 ? 's' : ''} spécial{bundles.length > 1 ? 'aux' : ''}
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <div className="space-y-4 my-6">
          {bundles.map((bundle) => {
            const isComplete = allProductsInCart(bundle);
            
            return (
              <div
                key={bundle.id}
                className="p-4 border border-border rounded-lg bg-gradient-to-r from-primary/5 to-accent/5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                      {bundle.name}
                      <Badge className="bg-green-600 text-white animate-pulse">
                        -{bundle.discount_percentage}%
                      </Badge>
                    </h3>
                    {bundle.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {bundle.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    Produits inclus :
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {bundle.product_ids.map((productId) => {
                      const inCart = isProductInCart(productId);
                      return (
                        <Badge
                          key={productId}
                          variant={inCart ? "default" : "outline"}
                          className={inCart ? "bg-green-600" : ""}
                        >
                          {inCart && <Check className="h-3 w-3 mr-1" />}
                          Produit {bundle.product_ids.indexOf(productId) + 1}
                        </Badge>
                      );
                    })}
                  </div>
                </div>

                <Button
                  onClick={() => onAddBundle(bundle.id)}
                  disabled={isComplete}
                  className="w-full"
                  variant={isComplete ? "outline" : "default"}
                >
                  {isComplete ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Lot complet dans le panier
                    </>
                  ) : (
                    <>
                      <Gift className="h-4 w-4 mr-2" />
                      Ajouter tout le lot
                    </>
                  )}
                </Button>
              </div>
            );
          })}
        </div>

        <AlertDialogFooter>
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            <X className="h-4 w-4 mr-2" />
            Continuer mes achats
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
