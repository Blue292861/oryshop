import { useState, useEffect } from "react";
import { Gift, Copy, Check, Share2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Link, useSearchParams } from "react-router-dom";

export default function GiftCardSuccess() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [giftCard, setGiftCard] = useState<{
    code: string;
    amount: number;
    recipientName?: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchGiftCard = async () => {
      if (!sessionId) {
        setLoading(false);
        return;
      }

      try {
        // Wait a bit for webhook to process
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Get the most recent gift card for the current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('gift_cards')
          .select('code, initial_amount, recipient_name')
          .eq('purchaser_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (error) throw error;

        setGiftCard({
          code: data.code,
          amount: data.initial_amount,
          recipientName: data.recipient_name,
        });
      } catch (error) {
        console.error("Error fetching gift card:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchGiftCard();
  }, [sessionId]);

  const handleCopy = async () => {
    if (!giftCard?.code) return;
    
    try {
      await navigator.clipboard.writeText(giftCard.code);
      setCopied(true);
      toast({
        title: "Code copié !",
        description: "Le code a été copié dans le presse-papiers",
      });
      setTimeout(() => setCopied(false), 3000);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de copier le code",
        variant: "destructive",
      });
    }
  };

  const handleShare = async () => {
    if (!giftCard) return;

    const shareText = `🎁 Voici une carte cadeau OryShop de ${giftCard.amount}€ !\n\nCode: ${giftCard.code}\n\nUtilisable sur oryshop.fr`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Carte Cadeau OryShop",
          text: shareText,
        });
      } catch (error) {
        // User cancelled or error
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(shareText);
      toast({
        title: "Texte copié !",
        description: "Le message a été copié dans le presse-papiers",
      });
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mx-auto" />
            <p className="text-muted-foreground">Création de votre carte cadeau...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!giftCard) {
    return (
      <Layout>
        <div className="max-w-lg mx-auto text-center space-y-6 py-12">
          <Gift className="h-16 w-16 text-muted-foreground mx-auto" />
          <h1 className="text-2xl font-bold">Carte cadeau non trouvée</h1>
          <p className="text-muted-foreground">
            Impossible de récupérer les détails de votre carte cadeau. 
            Veuillez vérifier votre email ou contacter le support.
          </p>
          <Link to="/gift-cards">
            <Button>Retour aux cartes cadeaux</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-8 py-8">
        {/* Success Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/10 mb-4">
            <Check className="h-10 w-10 text-green-500" />
          </div>
          <h1 className="text-3xl font-bold">Carte cadeau créée !</h1>
          <p className="text-muted-foreground">
            Votre carte cadeau a été créée avec succès. Partagez le code ci-dessous.
          </p>
        </div>

        {/* Gift Card Display */}
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-br from-primary to-accent p-8 text-primary-foreground">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Gift className="h-6 w-6" />
                <span className="font-bold">CARTE CADEAU ORYSHOP</span>
              </div>
              <span className="text-3xl font-bold">{giftCard.amount}€</span>
            </div>

            {giftCard.recipientName && (
              <p className="text-sm opacity-80 mb-4">Pour: {giftCard.recipientName}</p>
            )}

            {/* Code Display */}
            <div className="bg-background/20 backdrop-blur rounded-lg p-4 text-center">
              <p className="text-sm opacity-80 mb-2">Votre code</p>
              <p className="text-3xl font-mono font-bold tracking-wider">
                {giftCard.code}
              </p>
            </div>

            <p className="text-xs opacity-70 mt-4 text-center">
              Valable 1 an à partir d'aujourd'hui
            </p>
          </div>

          <CardContent className="pt-6 space-y-4">
            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={handleCopy}
                className="h-12"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Copié !
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copier le code
                  </>
                )}
              </Button>
              
              <Button
                variant="outline"
                onClick={handleShare}
                className="h-12"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Partager
              </Button>
            </div>

            {/* Email Info */}
            <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
              <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Email de confirmation</p>
                <p className="text-muted-foreground">
                  Vous avez reçu un email avec les détails de votre carte cadeau.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Comment utiliser cette carte ?</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3 text-sm text-muted-foreground">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">1</span>
                <span>Ajoutez des articles à votre panier sur OryShop</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">2</span>
                <span>Dans le récapitulatif, entrez le code de la carte cadeau</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">3</span>
                <span>Le montant sera automatiquement déduit de votre commande</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">4</span>
                <span>Si le solde est insuffisant, payez le reste par carte bancaire</span>
              </li>
            </ol>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/shop">
            <Button size="lg">
              Continuer les achats
            </Button>
          </Link>
          <Link to="/gift-cards">
            <Button variant="outline" size="lg">
              Acheter une autre carte
            </Button>
          </Link>
        </div>
      </div>
    </Layout>
  );
}
