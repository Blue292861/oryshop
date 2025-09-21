import { useState, useEffect } from "react";
import { User, Mail, MapPin, Building, Edit, Save, X, Trophy, Coins, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/Layout";

interface Profile {
  id: string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  street_address: string | null;
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

export default function Profile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editForm, setEditForm] = useState<Partial<Profile>>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchProfile();
    fetchOrders();
    fetchUserStats();
  }, []);

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
        street_address: data.street_address || null,
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
          street_address: editForm.street_address,
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
                  <Label htmlFor="street_address">Adresse</Label>
                  <Input
                    id="street_address"
                    value={editing ? (editForm.street_address || '') : (profile?.street_address || '')}
                    onChange={(e) => handleEditChange('street_address', e.target.value)}
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
      </div>
    </Layout>
  );
}
