import { useState } from "react";
import { Tag, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";

export default function PromoCodeInput() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const { appliedPromoCode, applyPromoCode, removePromoCode, getPromoDiscount } = useCart();
  const { toast } = useToast();

  const handleApply = async () => {
    if (!code.trim()) {
      toast({
        title: "Code requis",
        description: "Veuillez entrer un code promo",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const result = await applyPromoCode(code.trim());
      
      if (result.success) {
        toast({
          title: "✓ Code appliqué !",
          description: result.message,
        });
        setCode("");
      } else {
        toast({
          title: "Code invalide",
          description: result.message,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = () => {
    removePromoCode();
    toast({
      title: "Code retiré",
      description: "Le code promo a été retiré de votre commande",
    });
  };

  return (
    <div className="space-y-3">
      {appliedPromoCode ? (
        <div className="p-4 bg-success/10 border border-success/20 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-success" />
              <div>
                <p className="font-semibold text-success">Code appliqué : {appliedPromoCode.code}</p>
                <p className="text-sm text-muted-foreground">
                  Réduction de {getPromoDiscount().toFixed(2)}€
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleRemove}
              className="hover:bg-destructive/10 hover:text-destructive"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="Entrez votre code promo"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleApply();
                }
              }}
              disabled={loading}
              className="flex-1"
            />
            <Button
              onClick={handleApply}
              disabled={loading || !code.trim()}
              className="min-w-[100px]"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Vérification
                </>
              ) : (
                <>
                  <Tag className="h-4 w-4 mr-2" />
                  Appliquer
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Vous avez un code promo ? Entrez-le ici pour bénéficier de réductions
          </p>
        </div>
      )}
    </div>
  );
}
