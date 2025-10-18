import { useState, useEffect } from "react";
import { Package, Check, X, AlertTriangle, RefreshCw, Eye, Trash2, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/Layout";
import { format } from "date-fns";

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
  address: string;
}

interface OrderGroup {
  groupId: string;
  user_id: string;
  userName: string;
  orders: Order[];
  total: number;
  created_at: string;
  status: 'completed' | 'pending' | 'mixed';
}

interface ShopItem {
  id: string;
  name: string;
  description: string;
  image_url: string;
  additional_images?: string[];
  price: number;
  category: string;
  tags?: string[];
  seller: string;
}

export default function OrdersManagement() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderGroups, setOrderGroups] = useState<OrderGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null);
  const [isItemLoading, setIsItemLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
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
      
      // Grouper les commandes après les avoir récupérées
      if (data) {
        await groupOrders(data);
      }
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

  const groupOrders = async (ordersData: Order[]) => {
    // Grouper par user_id et par fenêtre de temps (5 secondes)
    const groups: Map<string, Order[]> = new Map();
    
    ordersData.forEach((order) => {
      const orderTime = new Date(order.created_at).getTime();
      let foundGroup = false;
      
      // Chercher un groupe existant pour cet utilisateur dans une fenêtre de 5 secondes
      for (const [groupId, groupOrders] of groups.entries()) {
        const firstOrderTime = new Date(groupOrders[0].created_at).getTime();
        const timeDiff = Math.abs(orderTime - firstOrderTime);
        
        if (groupOrders[0].user_id === order.user_id && timeDiff <= 5000) {
          groupOrders.push(order);
          foundGroup = true;
          break;
        }
      }
      
      if (!foundGroup) {
        groups.set(`${order.user_id}-${orderTime}`, [order]);
      }
    });
    
    // Récupérer les noms d'utilisateurs pour tous les groupes
    const userIds = Array.from(new Set(ordersData.map(o => o.user_id)));
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .in('id', userIds);
    
    const userMap = new Map(
      profiles?.map(p => [p.id, `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Utilisateur inconnu']) || []
    );
    
    // Convertir en OrderGroup
    const orderGroupsArray: OrderGroup[] = Array.from(groups.entries()).map(([groupId, orders]) => {
      const total = orders.reduce((sum, order) => sum + order.price, 0);
      const allCompleted = orders.every(o => o.status === 'completed');
      const allPending = orders.every(o => o.status === 'pending');
      
      return {
        groupId,
        user_id: orders[0].user_id,
        userName: userMap.get(orders[0].user_id) || 'Utilisateur inconnu',
        orders,
        total,
        created_at: orders[0].created_at,
        status: allCompleted ? 'completed' : allPending ? 'pending' : 'mixed',
      };
    });
    
    setOrderGroups(orderGroupsArray);
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

  const fetchItemDetails = async (itemId: string) => {
    setIsItemLoading(true);
    setSelectedItem(null);
    try {
      const { data, error } = await supabase
        .from('shop_items')
        .select('*')
        .eq('id', itemId)
        .single();
      
      if (error) throw error;
      setSelectedItem(data);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les détails du produit.",
        variant: "destructive",
      });
    } finally {
      setIsItemLoading(false);
    }
  };

  const deleteOrderGroup = async (group: OrderGroup) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer cette commande de ${group.orders.length} article(s) ?`)) {
      return;
    }

    setDeleting(group.groupId);
    try {
      const orderIds = group.orders.map(o => o.id);
      const { error } = await supabase
        .from('orders')
        .delete()
        .in('id', orderIds);
      
      if (error) throw error;
      
      // Mettre à jour l'état local
      setOrders(prev => prev.filter(o => !orderIds.includes(o.id)));
      setOrderGroups(prev => prev.filter(g => g.groupId !== group.groupId));
      
      toast({
        title: "Commande supprimée",
        description: `La commande de ${group.orders.length} article(s) a été supprimée`,
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la commande",
        variant: "destructive",
      });
    } finally {
      setDeleting(null);
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

        {/* Liste des commandes groupées */}
        <Card>
          <CardHeader>
            <CardTitle>Liste des Commandes</CardTitle>
            <CardDescription>
              Toutes les commandes groupées par client et date
            </CardDescription>
          </CardHeader>
          <CardContent>
            {orderGroups.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Aucune commande trouvée
              </div>
            ) : (
              <Accordion type="single" collapsible className="w-full space-y-2">
                {orderGroups.map((group) => (
                  <AccordionItem 
                    key={group.groupId} 
                    value={group.groupId}
                    className="border rounded-lg px-4 bg-card"
                  >
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center justify-between w-full pr-4">
                        <div className="flex items-center gap-4">
                          <ShoppingBag className="h-5 w-5 text-muted-foreground" />
                          <div className="text-left">
                            <div className="font-semibold">{group.userName}</div>
                            <div className="text-sm text-muted-foreground">
                              {format(new Date(group.created_at), 'dd/MM/yyyy à HH:mm')}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="font-medium">{group.orders.length} article{group.orders.length > 1 ? 's' : ''}</div>
                            <div className="text-lg font-bold">{group.total.toFixed(2)} €</div>
                          </div>
                          {getStatusBadge(group.status)}
                        </div>
                      </div>
                    </AccordionTrigger>
                    
                    <AccordionContent className="pt-4">
                      <div className="space-y-3">
                        {(() => {
                          // Regrouper les articles identiques et compter les quantités
                          const itemMap = new Map<string, { 
                            item_id: string;
                            item_name: string; 
                            price: number; 
                            quantity: number; 
                            orders: Order[];
                            status: string;
                          }>();
                          
                          group.orders.forEach(order => {
                            const existing = itemMap.get(order.item_id);
                            if (existing) {
                              existing.quantity += 1;
                              existing.orders.push(order);
                            } else {
                              itemMap.set(order.item_id, {
                                item_id: order.item_id,
                                item_name: order.item_name,
                                price: order.price,
                                quantity: 1,
                                orders: [order],
                                status: order.status
                              });
                            }
                          });
                          
                          return Array.from(itemMap.values()).map((item) => (
                            <div 
                              key={item.item_id}
                              className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <div className="font-medium">{item.item_name}</div>
                                  {item.quantity > 1 && (
                                    <Badge variant="secondary" className="text-xs">
                                      Quantité: {item.quantity}
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {item.price.toFixed(2)} € × {item.quantity} = {(item.price * item.quantity).toFixed(2)} €
                                </div>
                              </div>
                              
                              <div className="flex gap-2">
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => fetchItemDetails(item.item_id)}
                                    >
                                      <Eye className="h-3 w-3 mr-1" />
                                      Détails
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                                    <DialogHeader>
                                      <DialogTitle>Détails du produit</DialogTitle>
                                      <DialogDescription>
                                        Informations complètes sur l'article commandé
                                      </DialogDescription>
                                    </DialogHeader>
                                    <div className="py-4">
                                      {isItemLoading ? (
                                        <div className="flex justify-center items-center h-48">
                                          <RefreshCw className="h-8 w-8 animate-spin" />
                                        </div>
                                      ) : selectedItem ? (
                                        <div className="space-y-4">
                                          <img 
                                            src={selectedItem.image_url} 
                                            alt={selectedItem.name}
                                            className="w-full h-64 object-cover rounded-lg"
                                          />
                                          
                                          {selectedItem.additional_images && selectedItem.additional_images.length > 0 && (
                                            <div className="grid grid-cols-4 gap-2">
                                              {selectedItem.additional_images.map((img, idx) => (
                                                <img 
                                                  key={idx}
                                                  src={img} 
                                                  alt={`${selectedItem.name} ${idx + 1}`}
                                                  className="w-full h-20 object-cover rounded"
                                                />
                                              ))}
                                            </div>
                                          )}
                                          
                                          <div className="space-y-2">
                                            <h3 className="text-xl font-bold">{selectedItem.name}</h3>
                                            <p className="text-2xl font-bold text-primary">
                                              {selectedItem.price.toFixed(2)} €
                                            </p>
                                            
                                            <div className="pt-2">
                                              <h4 className="font-semibold mb-1">Description</h4>
                                              <p className="text-muted-foreground">{selectedItem.description}</p>
                                            </div>
                                            
                                            <div className="flex gap-4">
                                              <div>
                                                <h4 className="font-semibold mb-1">Catégorie</h4>
                                                <Badge variant="secondary">{selectedItem.category}</Badge>
                                              </div>
                                              
                                              <div>
                                                <h4 className="font-semibold mb-1">Vendeur</h4>
                                                <p className="text-sm">{selectedItem.seller}</p>
                                              </div>
                                            </div>
                                            
                                            {selectedItem.tags && selectedItem.tags.length > 0 && (
                                              <div>
                                                <h4 className="font-semibold mb-1">Tags</h4>
                                                <div className="flex flex-wrap gap-1">
                                                  {selectedItem.tags.map((tag, idx) => (
                                                    <Badge key={idx} variant="outline" className="text-xs">
                                                      {tag}
                                                    </Badge>
                                                  ))}
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="text-center text-muted-foreground py-8">
                                          Détails du produit non trouvés
                                        </div>
                                      )}
                                    </div>
                                  </DialogContent>
                                </Dialog>
                                
                                {item.status === 'pending' && (
                                  <Button
                                    size="sm"
                                    onClick={async () => {
                                      // Valider tous les orders de cet item
                                      for (const order of item.orders) {
                                        await updateOrderStatus(order.id, 'completed');
                                      }
                                    }}
                                    disabled={item.orders.some(o => updating === o.id)}
                                    className="bg-green-600 hover:bg-green-700"
                                  >
                                    {item.orders.some(o => updating === o.id) ? (
                                      <RefreshCw className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <>
                                        <Check className="h-3 w-3 mr-1" />
                                        Valider
                                      </>
                                    )}
                                  </Button>
                                )}
                              </div>
                            </div>
                          ));
                        })()}
                        
                        <div className="flex justify-end pt-2 border-t">
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteOrderGroup(group)}
                            disabled={deleting === group.groupId}
                          >
                            {deleting === group.groupId ? (
                              <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                            ) : (
                              <Trash2 className="h-3 w-3 mr-1" />
                            )}
                            Supprimer la commande
                          </Button>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
