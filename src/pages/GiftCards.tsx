import { useState } from "react";
import { Gift, Send, CreditCard, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Link } from "react-router-dom";

const PRESET_AMOUNTS = [25, 50, 75, 100];

export default function GiftCards() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(50);
  const [customAmount, setCustomAmount] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [personalMessage, setPersonalMessage] = useState("");

  const finalAmount = selectedAmount || (customAmount ? parseFloat(customAmount) : 0);

  const handlePurchase = async () => {
    if (!user) {
      toast({
        title: "Connexion requise",
        description: "Vous devez être connecté pour acheter une carte cadeau",
        variant: "destructive",
      });
      return;
    }

    if (!finalAmount || finalAmount < 5 || finalAmount > 500) {
      toast({
        title: "Montant invalide",
        description: "Le montant doit être entre 5€ et 500€",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.functions.invoke('purchase-gift-card', {
        body: {
          amount: finalAmount,
          recipientEmail: recipientEmail || undefined,
          recipientName: recipientName || undefined,
          personalMessage: personalMessage || undefined,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("URL de paiement non reçue");
      }
    } catch (error: any) {
      console.error("Error purchasing gift card:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer la carte cadeau",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Gift className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Cartes Cadeaux
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Offrez une carte cadeau OryShop et faites plaisir à vos proches ! 
            Valable 1 an sur toute la boutique.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Amount Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Choisissez un montant
              </CardTitle>
              <CardDescription>
                Sélectionnez un montant prédéfini ou entrez un montant personnalisé
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Preset amounts */}
              <div className="grid grid-cols-2 gap-3">
                {PRESET_AMOUNTS.map((amount) => (
                  <Button
                    key={amount}
                    variant={selectedAmount === amount ? "default" : "outline"}
                    className="h-16 text-lg font-semibold"
                    onClick={() => {
                      setSelectedAmount(amount);
                      setCustomAmount("");
                    }}
                  >
                    {selectedAmount === amount && <Check className="h-4 w-4 mr-2" />}
                    {amount}€
                  </Button>
                ))}
              </div>

              {/* Custom amount */}
              <div className="space-y-2">
                <Label htmlFor="custom-amount">Ou entrez un montant personnalisé</Label>
                <div className="relative">
                  <Input
                    id="custom-amount"
                    type="number"
                    min="5"
                    max="500"
                    placeholder="Montant (5€ - 500€)"
                    value={customAmount}
                    onChange={(e) => {
                      setCustomAmount(e.target.value);
                      setSelectedAmount(null);
                    }}
                    className="pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    €
                  </span>
                </div>
              </div>

              {/* Recipient info */}
              <div className="space-y-4 pt-4 border-t">
                <h4 className="font-medium flex items-center gap-2">
                  <Send className="h-4 w-4" />
                  Pour qui ? (optionnel)
                </h4>
                
                <div className="space-y-2">
                  <Label htmlFor="recipient-name">Nom du destinataire</Label>
                  <Input
                    id="recipient-name"
                    placeholder="Marie"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="recipient-email">Email du destinataire</Label>
                  <Input
                    id="recipient-email"
                    type="email"
                    placeholder="marie@example.com"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Le code sera envoyé automatiquement à cette adresse
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Message personnalisé</Label>
                  <Textarea
                    id="message"
                    placeholder="Joyeux anniversaire ! 🎂"
                    value={personalMessage}
                    onChange={(e) => setPersonalMessage(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Preview & Purchase */}
          <div className="space-y-6">
            {/* Preview Card */}
            <Card className="bg-gradient-to-br from-primary/10 via-background to-accent/10 border-primary/20">
              <CardHeader>
                <CardTitle>Aperçu de la carte</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative bg-gradient-to-br from-primary to-accent p-6 rounded-xl text-primary-foreground overflow-hidden">
                  {/* Background pattern */}
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-4 right-4">
                      <Gift className="h-24 w-24" />
                    </div>
                  </div>
                  
                  <div className="relative space-y-4">
                    <div className="flex items-center gap-2">
                      <Gift className="h-6 w-6" />
                      <span className="font-bold text-lg">CARTE CADEAU ORYSHOP</span>
                    </div>
                    
                    <div className="text-4xl font-bold">
                      {finalAmount > 0 ? `${finalAmount.toFixed(2)}€` : "0,00€"}
                    </div>
                    
                    {recipientName && (
                      <div className="text-sm opacity-90">
                        Pour: {recipientName}
                      </div>
                    )}
                    
                    {personalMessage && (
                      <div className="text-sm italic opacity-80 border-l-2 border-primary-foreground/30 pl-3">
                        "{personalMessage}"
                      </div>
                    )}
                    
                    <div className="text-xs opacity-70 pt-2">
                      Valable 1 an • Code unique
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Purchase Button */}
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex justify-between items-center text-lg">
                  <span>Montant total</span>
                  <span className="font-bold text-2xl text-primary">
                    {finalAmount > 0 ? `${finalAmount.toFixed(2)}€` : "—"}
                  </span>
                </div>

                {user ? (
                  <>
                    <Button
                      onClick={handlePurchase}
                      disabled={loading || finalAmount < 5}
                      className="w-full h-14 text-lg"
                      size="lg"
                    >
                      <Gift className="h-5 w-5 mr-2" />
                      {loading ? "Traitement..." : "Acheter cette carte cadeau"}
                    </Button>
                    <p className="text-xs text-center text-muted-foreground">
                      Paiement sécurisé par Stripe
                    </p>
                  </>
                ) : (
                  <div className="space-y-3">
                    <p className="text-center text-muted-foreground">
                      Connectez-vous pour acheter une carte cadeau
                    </p>
                    <Link to="/auth" className="block">
                      <Button className="w-full" size="lg">
                        Se connecter
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Info */}
            <Card className="bg-muted/30">
              <CardContent className="pt-6">
                <h4 className="font-medium mb-3">Comment ça marche ?</h4>
                <ol className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex gap-2">
                    <span className="font-bold text-primary">1.</span>
                    Choisissez le montant de la carte cadeau
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-primary">2.</span>
                    Payez en ligne de manière sécurisée
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-primary">3.</span>
                    Recevez immédiatement le code unique
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-primary">4.</span>
                    Partagez le code avec la personne de votre choix
                  </li>
                </ol>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
