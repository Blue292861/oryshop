import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface FavoritesContextType {
  favorites: string[];
  addToFavorites: (itemId: string) => Promise<void>;
  removeFromFavorites: (itemId: string) => Promise<void>;
  isFavorite: (itemId: string) => boolean;
  getFavoritesCount: () => number;
  loading: boolean;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export const FavoritesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Load favorites on mount
  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('user_favorites')
        .select('item_id')
        .eq('user_id', user.id);

      if (error) throw error;

      setFavorites(data?.map(f => f.item_id) || []);
    } catch (error) {
      console.error('Error loading favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  const addToFavorites = async (itemId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Connexion requise",
        description: "Vous devez être connecté pour ajouter des favoris",
        variant: "destructive",
      });
      return;
    }

    // Optimistic update
    setFavorites(prev => [...prev, itemId]);

    try {
      const { error } = await supabase
        .from('user_favorites')
        .insert({ user_id: user.id, item_id: itemId });

      if (error) {
        // Rollback on error
        setFavorites(prev => prev.filter(id => id !== itemId));
        
        if (error.code === '23505') { // Unique constraint violation
          toast({
            title: "Déjà en favoris",
            description: "Cet article est déjà dans vos favoris",
          });
        } else {
          throw error;
        }
      } else {
        toast({
          title: "❤️ Ajouté aux favoris !",
          description: "L'article a été ajouté à vos favoris",
        });
      }
    } catch (error) {
      console.error('Error adding to favorites:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter l'article aux favoris",
        variant: "destructive",
      });
    }
  };

  const removeFromFavorites = async (itemId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Optimistic update
    setFavorites(prev => prev.filter(id => id !== itemId));

    try {
      const { error } = await supabase
        .from('user_favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('item_id', itemId);

      if (error) {
        // Rollback on error
        setFavorites(prev => [...prev, itemId]);
        throw error;
      }

      toast({
        title: "💔 Retiré des favoris",
        description: "L'article a été retiré de vos favoris",
      });
    } catch (error) {
      console.error('Error removing from favorites:', error);
      toast({
        title: "Erreur",
        description: "Impossible de retirer l'article des favoris",
        variant: "destructive",
      });
    }
  };

  const isFavorite = (itemId: string): boolean => {
    return favorites.includes(itemId);
  };

  const getFavoritesCount = (): number => {
    return favorites.length;
  };

  return (
    <FavoritesContext.Provider
      value={{
        favorites,
        addToFavorites,
        removeFromFavorites,
        isFavorite,
        getFavoritesCount,
        loading,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
};
