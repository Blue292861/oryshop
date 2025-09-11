import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Crown, Mail, CheckCircle, AlertCircle, ArrowRight, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function EmailConfirmation() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      try {
        const token = searchParams.get('token');
        const type = searchParams.get('type');
        
        if (type === 'signup' && token) {
          // Handle email confirmation
          const { error } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: 'signup'
          });

          if (error) {
            throw error;
          }

          setStatus('success');
          setMessage('Votre email a été confirmé avec succès ! Vous pouvez maintenant vous connecter et profiter pleinement d\'Oryshop.');
          
          toast({
            title: "Email confirmé !",
            description: "Votre compte a été activé avec succès.",
          });

          // Auto-redirect after 3 seconds
          setTimeout(() => {
            navigate('/shop');
          }, 3000);

        } else if (type === 'recovery' && token) {
          // Handle password reset
          const { error } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: 'recovery'
          });

          if (error) {
            throw error;
          }

          setStatus('success');
          setMessage('Votre demande de réinitialisation a été validée. Vous allez être redirigé pour choisir un nouveau mot de passe.');
          
          // Redirect to auth page to set new password
          setTimeout(() => {
            navigate('/auth');
          }, 2000);

        } else {
          // No valid token or already confirmed
          setStatus('success');
          setMessage('Bienvenue sur Oryshop ! Découvrez nos produits dérivés exclusifs.');
        }

      } catch (error: any) {
        console.error('Email confirmation error:', error);
        setStatus('error');
        setMessage(error.message || 'Une erreur est survenue lors de la confirmation de votre email.');
        
        toast({
          title: "Erreur de confirmation",
          description: "Impossible de confirmer votre email. Le lien a peut-être expiré.",
          variant: "destructive",
        });
      }
    };

    handleEmailConfirmation();
  }, [searchParams, navigate, toast]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <Crown className="h-16 w-16 text-primary mx-auto mb-4" />
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Oryshop
          </h1>
          <p className="text-muted-foreground mt-2">
            Votre boutique de produits dérivés
          </p>
        </div>

        <Card className="border-border bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {status === 'loading' && <Mail className="h-5 w-5 animate-pulse text-primary" />}
              {status === 'success' && <CheckCircle className="h-5 w-5 text-green-500" />}
              {status === 'error' && <AlertCircle className="h-5 w-5 text-destructive" />}
              {status === 'loading' && "Confirmation en cours..."}
              {status === 'success' && "Confirmation réussie !"}
              {status === 'error' && "Erreur de confirmation"}
            </CardTitle>
            <CardDescription>
              {status === 'loading' && "Vérification de votre email en cours..."}
              {status === 'success' && "Votre email a été confirmé avec succès"}
              {status === 'error' && "Impossible de confirmer votre email"}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {message}
              </p>
            </div>

            {status === 'success' && (
              <div className="space-y-3">
                <Button 
                  onClick={() => navigate('/shop')} 
                  className="w-full"
                  size="lg"
                >
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Découvrir la boutique
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/')} 
                  className="w-full"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Retour à l'accueil
                </Button>
              </div>
            )}

            {status === 'error' && (
              <div className="space-y-3">
                <Button 
                  onClick={() => navigate('/auth')} 
                  className="w-full"
                >
                  Aller à la connexion
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/')} 
                  className="w-full"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Retour à l'accueil
                </Button>
              </div>
            )}

            {status === 'loading' && (
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}