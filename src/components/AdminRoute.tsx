import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Crown, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';

interface AdminRouteProps {
  children: React.ReactNode;
}

export const AdminRoute = ({ children }: AdminRouteProps) => {
  const { user, isAdmin, isLoading } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!isLoading && user && !isAdmin) {
      toast({
        title: "Accès refusé",
        description: "Vous n'avez pas les permissions administrateur requises.",
        variant: "destructive",
      });
    }
  }, [isLoading, user, isAdmin, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Crown className="h-12 w-12 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Vérification des permissions administrateur...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <Shield className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Accès Refusé</h2>
          <p className="text-muted-foreground mb-4">
            Vous n'avez pas les permissions administrateur requises pour accéder à cette section.
          </p>
          <button 
            onClick={() => window.history.back()} 
            className="text-primary hover:text-primary/80 underline"
          >
            Retour à la page précédente
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};