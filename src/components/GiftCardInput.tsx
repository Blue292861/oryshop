import { useState } from "react";
import { Gift, X, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart } from "@/contexts/CartContext";

export default function GiftCardInput() {
  const { 
    appliedGiftCard, 
    applyGiftCard, 
    removeGiftCard, 
    getGiftCardDiscount,
    getGiftCardRemainingBalance,
    getTotalWithShipping
  } = useCart();
  
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleApply = async () => {
    if (!code.trim()) return;
    
    setLoading(true);
    setError("");
    
    const result = await applyGiftCard(code.trim().toUpperCase());
    
    if (!result.success) {
      setError(result.message);
    } else {
      setCode("");
    }
    
    setLoading(false);
  };

  const handleRemove = () => {
    removeGiftCard();
    setError("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleApply();
    }
  };

  if (appliedGiftCard) {
    const discount = getGiftCardDiscount();
    const remainingBalance = getGiftCardRemainingBalance();
    
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-green-500" />
            <span className="font-medium text-green-700 dark:text-green-400">
              {appliedGiftCard.code}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="text-sm space-y-1 px-1">
          <div className="flex justify-between text-muted-foreground">
            <span>Solde disponible</span>
            <span>{appliedGiftCard.current_balance.toFixed(2)}€</span>
          </div>
          <div className="flex justify-between text-green-600 font-medium">
            <span>Montant utilisé</span>
            <span>-{discount.toFixed(2)}€</span>
          </div>
          {remainingBalance > 0 && (
            <div className="flex justify-between text-muted-foreground text-xs">
              <span>Solde après achat</span>
              <span>{remainingBalance.toFixed(2)}€</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Gift className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="GIFT-XXXX-XXXX"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setError("");
            }}
            onKeyPress={handleKeyPress}
            className="pl-9 uppercase"
            disabled={loading}
          />
        </div>
        <Button
          onClick={handleApply}
          disabled={loading || !code.trim()}
          variant="secondary"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Appliquer"
          )}
        </Button>
      </div>
      
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
