import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle, Package, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const updateOrderStatus = async () => {
      if (!sessionId) {
        setLoading(false);
        return;
      }

      try {
        // Get user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Update pending orders to completed
        const { error } = await supabase
          .from('orders')
          .update({ status: 'completed' })
          .eq('user_id', user.id)
          .eq('status', 'pending');

        if (error) {
          console.error('Error updating orders:', error);
        } else {
          // Clear cart from localStorage
          localStorage.removeItem('cart');
          
          toast({
            title: "Paiement réussi !",
            description: "Votre commande a été confirmée et sera traitée dans les plus brefs délais.",
          });
        }
      } catch (error) {
        console.error('Error updating order status:', error);
      } finally {
        setLoading(false);
      }
    };

    updateOrderStatus();
  }, [sessionId, toast]);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Confirmation de votre paiement...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto py-12">
        <Card className="text-center">
          <CardHeader className="pb-6">
            <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl text-green-600">
              Paiement réussi !
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <p className="text-lg text-muted-foreground">
                Merci pour votre commande ! Votre paiement a été traité avec succès.
              </p>
              
              <div className="bg-muted/50 p-4 rounded-lg">
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Package className="h-4 w-4" />
                  Votre commande sera traitée dans les plus brefs délais
                </div>
              </div>

              {sessionId && (
                <p className="text-xs text-muted-foreground">
                  Référence de paiement : {sessionId.slice(-8)}
                </p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild>
                <Link to="/shop">
                  <Package className="h-4 w-4 mr-2" />
                  Continuer mes achats
                </Link>
              </Button>
              
              <Button variant="outline" asChild>
                <Link to="/">
                  <Home className="h-4 w-4 mr-2" />
                  Retour à l'accueil
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}