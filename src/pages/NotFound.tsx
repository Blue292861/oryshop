import { Link } from "react-router-dom";
import { Crown, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center max-w-md mx-auto">
        <Crown className="h-24 w-24 text-primary mx-auto mb-6 animate-pulse" />
        <h1 className="text-6xl md:text-7xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          404
        </h1>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
          Page introuvable
        </h2>
        <p className="text-muted-foreground mb-8 text-base md:text-lg">
          La page que vous recherchez n'existe pas dans le royaume d'Oryshop.
        </p>
        <Link to="/">
          <Button size="lg" className="flex items-center gap-2">
            <Home className="h-5 w-5" />
            Retour à l'accueil
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
