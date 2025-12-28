import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  TrendingDown, 
  ShoppingCart, 
  DollarSign, 
  Package, 
  Users, 
  Calendar,
  BarChart3,
  PieChart,
  Target,
  Percent,
  CreditCard
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface MarketingStats {
  // Ventes
  totalSales: number;
  monthlySales: number;
  weeklySales: number;
  dailySales: number;
  totalRevenue: number;
  monthlyRevenue: number;
  weeklyRevenue: number;
  
  // Panier
  averageCartValue: number;
  maxCartValue: number;
  minCartValue: number;
  
  // Produits
  totalProducts: number;
  activeProducts: number;
  averageProductPrice: number;
  medianProductPrice: number;
  productsOnSale: number;
  
  // Catégories
  categoryDistribution: { category: string; count: number; revenue: number }[];
  
  // Top produits
  topProducts: { name: string; sales: number; revenue: number }[];
  
  // Utilisateurs
  totalUsers: number;
  usersWithOrders: number;
  conversionRate: number;
  
  // Tendances
  salesTrend: number; // % par rapport au mois précédent
  revenueTrend: number;
}

export function MarketingAnalytics() {
  const [stats, setStats] = useState<MarketingStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMarketingStats();
  }, []);

  const fetchMarketingStats = async () => {
    try {
      setLoading(true);
      
      // Dates
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Fetch all orders
      const { data: allOrders } = await supabase
        .from('orders')
        .select('*')
        .in('status', ['completed', 'pending']);

      // Fetch orders for different periods
      const { data: monthlyOrders } = await supabase
        .from('orders')
        .select('*')
        .in('status', ['completed', 'pending'])
        .gte('created_at', startOfMonth.toISOString());

      const { data: lastMonthOrders } = await supabase
        .from('orders')
        .select('*')
        .in('status', ['completed', 'pending'])
        .gte('created_at', startOfLastMonth.toISOString())
        .lte('created_at', endOfLastMonth.toISOString());

      const { data: weeklyOrders } = await supabase
        .from('orders')
        .select('*')
        .in('status', ['completed', 'pending'])
        .gte('created_at', weekAgo.toISOString());

      const { data: dailyOrders } = await supabase
        .from('orders')
        .select('*')
        .in('status', ['completed', 'pending'])
        .gte('created_at', dayAgo.toISOString());

      // Fetch products
      const { data: products } = await supabase
        .from('shop_items')
        .select('*');

      // Fetch users
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Calculate stats
      const orders = allOrders || [];
      const monthly = monthlyOrders || [];
      const lastMonth = lastMonthOrders || [];
      const weekly = weeklyOrders || [];
      const daily = dailyOrders || [];
      const items = products || [];

      // Revenue calculations
      const totalRevenue = orders.reduce((sum, o) => sum + Number(o.price), 0);
      const monthlyRevenue = monthly.reduce((sum, o) => sum + Number(o.price), 0);
      const lastMonthRevenue = lastMonth.reduce((sum, o) => sum + Number(o.price), 0);
      const weeklyRevenue = weekly.reduce((sum, o) => sum + Number(o.price), 0);

      // Cart value calculations
      const cartValues = orders.map(o => Number(o.price)).filter(v => v > 0);
      const averageCartValue = cartValues.length > 0 
        ? cartValues.reduce((a, b) => a + b, 0) / cartValues.length 
        : 0;
      const maxCartValue = cartValues.length > 0 ? Math.max(...cartValues) : 0;
      const minCartValue = cartValues.length > 0 ? Math.min(...cartValues) : 0;

      // Product price calculations
      const prices = items.map(p => Number(p.price)).filter(p => p > 0);
      const averageProductPrice = prices.length > 0 
        ? prices.reduce((a, b) => a + b, 0) / prices.length 
        : 0;
      const sortedPrices = [...prices].sort((a, b) => a - b);
      const medianProductPrice = sortedPrices.length > 0 
        ? sortedPrices[Math.floor(sortedPrices.length / 2)] 
        : 0;

      // Active products (is_available = true)
      const activeProducts = items.filter(p => p.is_available !== false).length;
      const productsOnSale = items.filter(p => p.is_on_sale).length;

      // Category distribution
      const categoryMap = new Map<string, { count: number; revenue: number }>();
      items.forEach(item => {
        const cat = item.category || 'Non catégorisé';
        const existing = categoryMap.get(cat) || { count: 0, revenue: 0 };
        categoryMap.set(cat, { count: existing.count + 1, revenue: existing.revenue });
      });
      
      // Add revenue per category from orders
      orders.forEach(order => {
        const product = items.find(p => p.id === order.item_id);
        if (product) {
          const cat = product.category || 'Non catégorisé';
          const existing = categoryMap.get(cat) || { count: 0, revenue: 0 };
          categoryMap.set(cat, { ...existing, revenue: existing.revenue + Number(order.price) });
        }
      });

      const categoryDistribution = Array.from(categoryMap.entries())
        .map(([category, data]) => ({ category, ...data }))
        .sort((a, b) => b.revenue - a.revenue);

      // Top products by sales
      const productSalesMap = new Map<string, { name: string; sales: number; revenue: number }>();
      orders.forEach(order => {
        const existing = productSalesMap.get(order.item_id) || { 
          name: order.item_name, 
          sales: 0, 
          revenue: 0 
        };
        productSalesMap.set(order.item_id, {
          name: order.item_name,
          sales: existing.sales + 1,
          revenue: existing.revenue + Number(order.price)
        });
      });

      const topProducts = Array.from(productSalesMap.values())
        .sort((a, b) => b.sales - a.sales)
        .slice(0, 5);

      // Users with orders
      const uniqueUserIds = new Set(orders.map(o => o.user_id));
      const usersWithOrders = uniqueUserIds.size;

      // Conversion rate
      const conversionRate = totalUsers && totalUsers > 0 
        ? (usersWithOrders / totalUsers) * 100 
        : 0;

      // Trends (compare with last month)
      const salesTrend = lastMonth.length > 0 
        ? ((monthly.length - lastMonth.length) / lastMonth.length) * 100 
        : monthly.length > 0 ? 100 : 0;
      
      const revenueTrend = lastMonthRevenue > 0 
        ? ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 
        : monthlyRevenue > 0 ? 100 : 0;

      setStats({
        totalSales: orders.length,
        monthlySales: monthly.length,
        weeklySales: weekly.length,
        dailySales: daily.length,
        totalRevenue,
        monthlyRevenue,
        weeklyRevenue,
        averageCartValue,
        maxCartValue,
        minCartValue,
        totalProducts: items.length,
        activeProducts,
        averageProductPrice,
        medianProductPrice,
        productsOnSale,
        categoryDistribution,
        topProducts,
        totalUsers: totalUsers || 0,
        usersWithOrders,
        conversionRate,
        salesTrend,
        revenueTrend
      });
    } catch (error) {
      console.error('Error fetching marketing stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <BarChart3 className="h-12 w-12 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Chargement des analytics...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-20">
        <BarChart3 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-xl font-semibold mb-2">Erreur de chargement</h3>
        <p className="text-muted-foreground">Impossible de charger les statistiques marketing</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Analyse Marketing</h2>
          <p className="text-muted-foreground">Vue d'ensemble des performances commerciales</p>
        </div>
        <Badge variant="outline" className="text-xs">
          Mis à jour: {new Date().toLocaleString('fr-FR')}
        </Badge>
      </div>

      {/* KPIs principaux */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenus totaux</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{formatCurrency(stats.totalRevenue)}</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              {stats.revenueTrend >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
              )}
              <span className={stats.revenueTrend >= 0 ? "text-green-500" : "text-red-500"}>
                {formatPercent(stats.revenueTrend)}
              </span>
              <span className="ml-1">vs mois dernier</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ventes totales</CardTitle>
            <ShoppingCart className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.totalSales}</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              {stats.salesTrend >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
              )}
              <span className={stats.salesTrend >= 0 ? "text-green-500" : "text-red-500"}>
                {formatPercent(stats.salesTrend)}
              </span>
              <span className="ml-1">vs mois dernier</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Panier moyen</CardTitle>
            <CreditCard className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{formatCurrency(stats.averageCartValue)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Min: {formatCurrency(stats.minCartValue)} • Max: {formatCurrency(stats.maxCartValue)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux de conversion</CardTitle>
            <Target className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.conversionRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.usersWithOrders} acheteurs / {stats.totalUsers} utilisateurs
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Ventes par période */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ventes du mois</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.monthlySales}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(stats.monthlyRevenue)} de CA
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ventes de la semaine</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.weeklySales}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(stats.weeklyRevenue)} de CA
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ventes du jour</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.dailySales}</div>
            <p className="text-xs text-muted-foreground">
              Dernières 24h
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Produits */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Statistiques produits
            </CardTitle>
            <CardDescription>Analyse du catalogue</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground">Total produits</p>
                <p className="text-xl font-bold">{stats.totalProducts}</p>
              </div>
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground">Produits actifs</p>
                <p className="text-xl font-bold">{stats.activeProducts}</p>
              </div>
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground">Prix moyen</p>
                <p className="text-xl font-bold">{formatCurrency(stats.averageProductPrice)}</p>
              </div>
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground">Prix médian</p>
                <p className="text-xl font-bold">{formatCurrency(stats.medianProductPrice)}</p>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-red-500/10 rounded-lg border border-red-500/20">
              <div className="flex items-center gap-2">
                <Percent className="h-4 w-4 text-red-500" />
                <span className="text-sm">Produits en solde</span>
              </div>
              <Badge variant="destructive">{stats.productsOnSale}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Top 5 produits
            </CardTitle>
            <CardDescription>Les produits les plus vendus</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.topProducts.length > 0 ? (
              <div className="space-y-3">
                {stats.topProducts.map((product, index) => (
                  <div 
                    key={index} 
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        index === 0 ? 'bg-yellow-500 text-yellow-950' :
                        index === 1 ? 'bg-gray-300 text-gray-700' :
                        index === 2 ? 'bg-amber-600 text-amber-50' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-sm truncate max-w-[180px]">{product.name}</p>
                        <p className="text-xs text-muted-foreground">{product.sales} ventes</p>
                      </div>
                    </div>
                    <span className="font-semibold text-primary">{formatCurrency(product.revenue)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Aucune vente enregistrée</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Répartition par catégorie */}
      <Card className="border-border bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            Répartition par catégorie
          </CardTitle>
          <CardDescription>Distribution des produits et revenus par catégorie</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.categoryDistribution.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stats.categoryDistribution.map((cat, index) => (
                <div 
                  key={index}
                  className="p-4 bg-muted/30 rounded-lg border border-border"
                >
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="secondary">{cat.category}</Badge>
                    <span className="text-sm font-medium">{cat.count} produits</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Revenus</span>
                    <span className="font-semibold text-primary">{formatCurrency(cat.revenue)}</span>
                  </div>
                  {stats.totalRevenue > 0 && (
                    <div className="mt-2">
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${(cat.revenue / stats.totalRevenue) * 100}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 text-right">
                        {((cat.revenue / stats.totalRevenue) * 100).toFixed(1)}% du CA
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Aucune catégorie trouvée</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Utilisateurs */}
      <Card className="border-border bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Statistiques utilisateurs
          </CardTitle>
          <CardDescription>Analyse de la base client</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-muted/30 rounded-lg text-center">
              <Users className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{stats.totalUsers}</p>
              <p className="text-sm text-muted-foreground">Utilisateurs inscrits</p>
            </div>
            <div className="p-4 bg-muted/30 rounded-lg text-center">
              <ShoppingCart className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{stats.usersWithOrders}</p>
              <p className="text-sm text-muted-foreground">Acheteurs</p>
            </div>
            <div className="p-4 bg-muted/30 rounded-lg text-center">
              <Target className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{stats.conversionRate.toFixed(1)}%</p>
              <p className="text-sm text-muted-foreground">Taux de conversion</p>
            </div>
            <div className="p-4 bg-muted/30 rounded-lg text-center">
              <DollarSign className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">
                {stats.usersWithOrders > 0 
                  ? formatCurrency(stats.totalRevenue / stats.usersWithOrders) 
                  : formatCurrency(0)}
              </p>
              <p className="text-sm text-muted-foreground">Valeur client moyenne</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
