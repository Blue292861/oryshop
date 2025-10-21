import { useState, useEffect } from "react";
import { User, Mail, MapPin, Building, Edit, Save, X, Trophy, Coins, ShoppingBag, Heart, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/Layout";
import { useFavorites } from "@/contexts/FavoritesContext";
import { useCart } from "@/contexts/CartContext";
import { useNavigate } from "react-router-dom";
import ProductModal from "@/components/ProductModal";

interface Profile {
  id: string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  address: string | null; // Correction ici
  city: string | null;
  postal_code: string | null;
  country: string | null;
}

interface Order {
  id: string;
  item_name: string;
  price: number;
  status: string;
  created_at: string;
}

interface UserStats {
  total_points: number;
  level: number;
  experience_points: number;
}

interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  category: string;
  seller: string;
  is_on_sale?: boolean;
  sale_price?: number;
  is_temporary?: boolean;
  is_clothing?: boolean;
  available_sizes?: string[];
  additional_images?: string[];
}

export default function Profile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [favoriteItems, setFavoriteItems] = useState<ShopItem[]>([]);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editForm, setEditForm] = useState<Partial<Profile>>({});
  const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast } = useToast();
  const { favorites, removeFromFavorites } = useFavorites();
  const { addToCart } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    fetchProfile();
    fetchOrders();
    fetchUserStats();
  }, []);

  useEffect(() => {
    fetchFavoriteItems();
  }, [favorites]);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      const profileData: Profile = {
        id: data.id,
        username: data.username || null,
        first_name: data.first_name || null,
        last_name: data.last_name || null,
        avatar_url: data.avatar_url || null,
        address: (data as any).address || null, // Correction ici
        city: data.city || null,
        postal_code: (data as any).postal_code || null,
        country: data.country || null,
      };

      setProfile(profileData);
      setEditForm(profileData);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de charger le profil",
        variant: "destructive",
      });
    }
  };

  const fetchOrders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      setOrders(data || []);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les commandes",
        variant: "destructive",
      });
    }
  };

  const fetchUserStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_stats')
        .select('total_points, level, experience_points')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      setUserStats(data || { total_points: 0, level: 1, experience_points: 0 });
    } catch (error: any) {
      console.error('Error fetching user stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({
          username: editForm.username,
          first_name: editForm.first_name,
          last_name: editForm.last_name,
          address: editForm.address, // Correction ici
          city: editForm.city,
          postal_code: editForm.postal_code,
          country: editForm.country,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      setProfile({ ...profile!, ...editForm });
      setEditing(false);
      
      toast({
        title: "Profil mis à jour",
        description: "Vos informations ont été sauvegardées avec succès",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la mise à jour",
        variant: "destructive",
      });
    }
  };

  const handleEditChange = (field: string, value: string) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-20">
          <div className="animate-pulse">
            <User className="h-16 w-16 text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Chargement du profil...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Mon Profil
          </h1>
          <p className="text-muted-foreground text-lg">
            Gérez vos informations et suivez vos statistiques
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8">
          {/* Profile Information */}
          <div className="xl:col-span-2">
            <Card className="border-border bg-card/50 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Informations personnelles
                  </CardTitle>
                  <CardDescription>
                    Modifiez vos informations personnelles
                  </CardDescription>
                </div>
                <Button
                  variant={editing ? "outline" : "default"}
                  size="sm"
                  onClick={() => editing ? setEditing(false) : setEditing(true)}
                >
                  {editing ? <X className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
                  {editing ? "Annuler" : "Modifier"}
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Prénom</Label>
                    <Input
                      id="firstName"
                      value={editing ? (editForm.first_name || '') : (profile?.first_name || '')}
                      onChange={(e) => handleEditChange('first_name', e.target.value)}
                      disabled={!editing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Nom</Label>
                    <Input
                      id="lastName"
                      value={editing ? (editForm.last_name || '') : (profile?.last_name || '')}
                      onChange={(e) => handleEditChange('last_name', e.target.value)}
                      disabled={!editing}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username">Nom d'utilisateur</Label>
                  <Input
                    id="username"
                    value={editing ? (editForm.username || '') : (profile?.username || '')}
                    onChange={(e) => handleEditChange('username', e.target.value)}
                    disabled={!editing}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Adresse</Label>
                  <Input
                    id="address" // Correction ici
                    value={editing ? (editForm.address || '') : (profile?.address || '')}
                    onChange={(e) => handleEditChange('address', e.target.value)}
                    disabled={!editing}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">Ville</Label>
                    <Input
                      id="city"
                      value={editing ? (editForm.city || '') : (profile?.city || '')}
                      onChange={(e) => handleEditChange('city', e.target.value)}
                      disabled={!editing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="postalCode">Code postal</Label>
                    <Input
                      id="postalCode"
                      value={editing ? (editForm.postal_code || '') : (profile?.postal_code || '')}
                      onChange={(e) => handleEditChange('postal_code', e.target.value)}
                      disabled={!editing}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2 lg:col-span-1">
                    <Label htmlFor="country">Pays</Label>
                    <Input
                      id="country"
                      value={editing ? (editForm.country || '') : (profile?.country || '')}
                      onChange={(e) => handleEditChange('country', e.target.value)}
                      disabled={!editing}
                    />
                  </div>
                </div>

                {editing && (
                  <Button onClick={handleSaveProfile} className="w-full">
                    <Save className="h-4 w-4 mr-2" />
                    Sauvegarder
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Stats and Orders */}
          <div className="space-y-6">
            {/* Stats Card */}
            <Card className="border-border bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Statistiques Orydia
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary mb-1">
                    Niveau {userStats?.level || 1}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {userStats?.experience_points || 0} XP
                  </p>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Coins className="h-4 w-4 text-primary" />
                    <span className="text-sm">Points Tensens</span>
                  </div>
                  <span className="font-bold text-primary">
                    {userStats?.total_points || 0}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Recent Orders */}
            <Card className="border-border bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5" />
                  Commandes récentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {orders.length > 0 ? (
                    orders.map((order) => (
                      <div key={order.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div>
                          <p className="font-medium text-sm">{order.item_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(order.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-primary">{order.price}€</p>
                          <Badge variant={order.status === 'completed' ? 'default' : 'secondary'}>
                            {order.status}
                          </Badge>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground text-sm py-4">
                      Aucune commande récente
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Favorites Section */}
        <Card className="border-border bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-primary" />
                Mes Favoris
              </CardTitle>
              {favoriteItems.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/profile/favorites')}
                >
                  Voir tout
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {favoriteItems.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {favoriteItems.map((item) => (
                  <div
                    key={item.id}
                    className="bg-background rounded-lg overflow-hidden border border-border hover:shadow-lg transition-all"
                  >
                    <div className="relative cursor-pointer" onClick={() => {
                      setSelectedItem(item);
                      setIsModalOpen(true);
                    }}>
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-full h-32 object-cover"
                      />
                      {item.is_temporary && (
                        <Badge className="absolute top-2 left-2 bg-orange-600 text-white text-xs">
                          Temporaire
                        </Badge>
                      )}
                      {item.is_on_sale && item.sale_price && (
                        <Badge className="absolute top-2 right-2 bg-red-600 text-white text-xs">
                          Soldé
                        </Badge>
                      )}
                    </div>
                    <div className="p-3 space-y-2">
                      <h4 className="font-semibold text-sm line-clamp-1">{item.name}</h4>
                      <div className="flex items-center justify-between">
                        {item.is_on_sale && item.sale_price ? (
                          <div className="flex items-center gap-1">
                            <span className="text-sm font-bold text-primary">{item.sale_price}€</span>
                            <span className="text-xs text-muted-foreground line-through">{item.price}€</span>
                          </div>
                        ) : (
                          <span className="text-sm font-bold text-primary">{item.price}€</span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleAddToCartFromFavorites(item)}
                          className="flex-1"
                        >
                          <ShoppingBag className="h-3 w-3 mr-1" />
                          Panier
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => removeFromFavorites(item.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Heart className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground text-sm">
                  Vous n'avez pas encore de favoris
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/shop')}
                  className="mt-4"
                >
                  Explorer la boutique
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {selectedItem && (
        <ProductModal
          item={selectedItem}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedItem(null);
          }}
        />
      )}
    </Layout>
  );
}
