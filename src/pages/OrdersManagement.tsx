import { useState, useEffect } from "react";
import { Package, Check, X, AlertTriangle, RefreshCw, Eye, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/Layout";
import { format } from "date-fns";
import { Spinner } from "@/components/ui/spinner"; // Assuming you have a spinner component

interface Order {
  id: string;
  user_id: string;
  item_name: string;
  price: number;
  status: string;
  created_at: string;
  item_id: string;
}

interface UserProfile {
  first_name: string;
  last_name: string;
  street_address: string;
  email: string;
}

export default function OrdersManagement() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setOrders(data || []);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les commandes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    setUpdating(orderId);
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);
      
      if (error) throw error;
      
      setOrders(prev => prev.map(order => 
        order.id === orderId ? { ...order, status: newStatus } : order
      ));
      
      toast({
        title: "Statut mis à jour",
        description: `Commande ${newStatus === 'completed' ? 'validée' : 'mise en attente'}`,
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut",
        variant: "destructive",
      });
    } finally {
      setUpdating(null);
    }
  };

  const validateAllPendingOrders = async () => {
    const pendingOrders = orders.filter(order => order.status === 'pending');
    
    if (pendingOrders.length === 0) {
      toast({
        title: "Aucune commande en attente",
        description: "Toutes les commandes sont déjà validées",
      });
      return;
    }

    if (!confirm(`Êtes-vous sûr de vouloir valider ${pendingOrders.length} commande(s) en attente ?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'completed' })
        .eq('status', 'pending');
      
      if (error) throw error;
      
      setOrders(prev => prev.map(order => 
        order.status === 'pending' ? { ...order, status: 'completed' } : order
      ));
      
      toast({
        title: "Commandes validées",
        description: `${pendingOrders.length} commande(s) ont été validées`,
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de valider les commandes",
        variant: "destructive",
      });
    }
  };

  const fetchUserProfile = async (userId: string) => {
    setIsUserLoading(true);
    setSelectedUser(null);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, last_name, street_address, email')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      setSelectedUser(data);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les informations de l'utilisateur.",
        variant: "destructive",
      });
    } finally {
      setIsUserLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Complétée</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">En attente</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const pendingCount = orders.filter(order => order.status === 'pending').length;
  const completedCount = orders.filter(order => order.status === 'completed').length;

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto py-8">
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin" />
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Gestion des Commandes</h1>
            <p className="text-muted-foreground">
              Visualisez et gérez le statut de toutes les commandes
            </p>
          </div>
          
          {pendingCount > 0 && (
            <Dialog>
              <DialogTrigger asChild>
                <Button className="bg-green-600 hover:bg-green-700">
                  <Check className="mr-2 h-4 w-4" />
                  Valider toutes les commandes en attente ({pendingCount})
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Validation des commandes en attente</DialogTitle>
                  <DialogDescription>
                    Cette action marquera toutes les {pendingCount} commande(s) en attente comme "complétée".
                    Cela les inclura dans les calculs de chiffre d'affaires et les exports.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline">Annuler</Button>
                  <Button onClick={validateAllPendingOrders} className="bg-green-600 hover:bg-green-700">
                    Confirmer la validation
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Statistiques */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Commandes</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{orders.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Complétées</CardTitle>
              <Check className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{completedCount}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">En Attente</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
            </CardContent>
          </Card>
        </div>

        {/* Table des commandes */}
        <Card>
          <CardHeader>
            <CardTitle>Liste des Commandes</CardTitle>
            <CardDescription>
              Toutes les commandes avec leur statut actuel
            </CardDescription>
          </CardHeader>
          <CardContent>
