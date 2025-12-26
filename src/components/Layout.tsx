import { Crown, ShoppingBag, User, Settings, LogOut, ShoppingCart, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { getTotalItems } = useCart();
  const { user, isAdmin, isLoading, signOut } = useAuth();
  const totalItems = getTotalItems();

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  const isActivePage = (path: string) => location.pathname === path;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Crown className="h-12 w-12 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Chargement d'Oryshop...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2 md:space-x-4">
            <Crown className="h-6 w-6 md:h-8 md:w-8 text-primary" />
            <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Oryshop
            </h1>
          </div>

          <nav className="flex items-center gap-1 md:gap-2">
            <Button
              variant={isActivePage('/') ? 'default' : 'ghost'}
              size="sm"
              onClick={() => navigate('/')}
              className="flex items-center gap-1 md:gap-2 px-2 md:px-3"
            >
              <ShoppingBag className="h-4 w-4" />
              <span className="hidden sm:inline">Accueil</span>
            </Button>

            <Button
              variant={isActivePage('/shop') ? 'default' : 'ghost'}
              size="sm"
              onClick={() => navigate('/shop')}
              className="flex items-center gap-1 md:gap-2 px-2 md:px-3"
            >
              <ShoppingCart className="h-4 w-4" />
              <span className="hidden sm:inline">Boutique</span>
            </Button>

            <Button
              variant={isActivePage('/gift-cards') ? 'default' : 'ghost'}
              size="sm"
              onClick={() => navigate('/gift-cards')}
              className="flex items-center gap-1 md:gap-2 px-2 md:px-3"
            >
              <Gift className="h-4 w-4" />
              <span className="hidden sm:inline">Cartes Cadeaux</span>
            </Button>

            {user ? (
              <>
                <Button
                  variant={isActivePage('/cart') ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => navigate('/cart')}
                  className="flex items-center gap-1 md:gap-2 px-2 md:px-3 relative"
                >
                  <ShoppingCart className="h-4 w-4" />
                  <span className="hidden sm:inline">Panier</span>
                  {totalItems > 0 && (
                    <Badge variant="destructive" className="absolute -top-1 -right-1 text-xs px-1.5 py-0.5 h-5 w-5 flex items-center justify-center">
                      {totalItems}
                    </Badge>
                  )}
                </Button>

                <Button
                  variant={isActivePage('/profile') ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => navigate('/profile')}
                  className="flex items-center gap-1 md:gap-2 px-2 md:px-3"
                >
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">Profil</span>
                </Button>

                {isAdmin && (
                  <Button
                    variant={isActivePage('/admin') ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => navigate('/admin')}
                    className="flex items-center gap-1 md:gap-2 px-2 md:px-3"
                  >
                    <Settings className="h-4 w-4" />
                    <span className="hidden sm:inline">Admin</span>
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="flex items-center gap-1 md:gap-2 px-2 md:px-3 text-destructive hover:text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden md:inline">Déconnexion</span>
                </Button>
              </>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={() => navigate('/auth')}
                className="flex items-center gap-1 md:gap-2 px-2 md:px-3"
              >
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Connexion</span>
              </Button>
            )}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8 pb-20">
        {children}
      </main>

      {/* Fixed Footer */}
      <footer className="fixed bottom-0 left-0 right-0 border-t border-border bg-card/80 backdrop-blur-sm z-40">
        <div className="container mx-auto px-4 py-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-center">
            <p className="text-xs text-muted-foreground">
              © 2024 Oryshop - Boutique médiévale fantastique
            </p>
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <a 
                href="/documents/CGV_et_CGU.pdf" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:text-primary/80 underline"
                download
              >
                Conditions générales de vente et d'utilisation
              </a>
              <span className="text-muted-foreground">•</span>
              <a 
                href="/documents/Mentions_légales.pdf" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:text-primary/80 underline"
                download
              >
                Mentions légales
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};