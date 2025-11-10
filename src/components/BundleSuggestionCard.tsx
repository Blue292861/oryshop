import { Gift, ShoppingCart, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

interface BundleProduct {
  id: string;
  name: string;
  price: number;
  image_url: string;
}

interface BundleSuggestionCardProps {
  bundle: {
    id: string;
    name: string;
    description?: string;
    discount_percentage: number;
  };
  missingProducts: BundleProduct[];
  onAddBundle: (bundleId: string) => Promise<void>;
}

export default function BundleSuggestionCard({
  bundle,
  missingProducts,
  onAddBundle,
}: BundleSuggestionCardProps) {
  const [loading, setLoading] = useState(false);

  const totalMissingPrice = missingProducts.reduce((sum, p) => sum + p.price, 0);
  const savingsAmount = (totalMissingPrice * bundle.discount_percentage) / 100;

  const handleAddBundle = async () => {
    setLoading(true);
    try {
      await onAddBundle(bundle.id);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-accent/5 hover:shadow-lg transition-all duration-300">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10 pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary rounded-full animate-pulse">
              <Gift className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                Complétez votre lot !
                <Sparkles className="h-4 w-4 text-accent animate-pulse" />
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {bundle.name}
              </p>
            </div>
          </div>
          <Badge className="bg-green-600 text-white text-lg px-3 py-1 animate-pulse">
            -{bundle.discount_percentage}%
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {bundle.description && (
          <p className="text-sm text-muted-foreground">
            {bundle.description}
          </p>
        )}

        <div className="space-y-2">
          <p className="text-sm font-semibold text-foreground">
            Il vous manque {missingProducts.length} produit{missingProducts.length > 1 ? 's' : ''} :
          </p>
          <div className="grid grid-cols-1 gap-2">
            {missingProducts.map((product) => (
              <div
                key={product.id}
                className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg border border-border"
              >
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-12 h-12 object-contain rounded bg-background"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {product.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {product.price.toFixed(2)}€
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-muted-foreground">Total des produits manquants</span>
            <span className="font-semibold">{totalMissingPrice.toFixed(2)}€</span>
          </div>
          <div className="flex items-center justify-between text-sm font-bold">
            <span className="text-green-600">Économie avec ce lot</span>
            <span className="text-green-600 text-lg">
              -{savingsAmount.toFixed(2)}€
            </span>
          </div>
        </div>

        <Button
          onClick={handleAddBundle}
          disabled={loading}
          className="w-full gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity"
          size="lg"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground" />
              Ajout en cours...
            </>
          ) : (
            <>
              <ShoppingCart className="h-4 w-4" />
              Compléter le lot maintenant
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
