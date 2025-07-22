import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Package, DollarSign, Users, TrendingUp, Search, FileSpreadsheet } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/Layout";

interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  category: string;
  seller: string;
  content?: string;
  is_on_sale?: boolean;
  sale_price?: number;
  tags?: string[];
  is_temporary?: boolean;
  product_id?: string;
  is_clothing?: boolean;
  available_sizes?: string[];
  additional_images?: string[];
}

interface AdminStats {
  totalItems: number;
  totalRevenue: number;
  totalUsers: number;
  recentOrders: number;
}

export default function Admin() {
  const [items, setItems] = useState<ShopItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<ShopItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [stats, setStats] = useState<AdminStats>({ totalItems: 0, totalRevenue: 0, totalUsers: 0, recentOrders: 0 });
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ShopItem | null>(null);
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    image_url: "",
    category: "",
    seller: "",
    content: "",
    is_on_sale: false,
    sale_price: "",
    tags: [] as string[],
    is_temporary: false,
    product_id: "",
    is_clothing: false,
    available_sizes: [] as string[],
    additional_images: [] as string[]
  });
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [additionalImageFiles, setAdditionalImageFiles] = useState<File[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchItems();
    fetchStats();
  }, []);

  useEffect(() => {
    filterItems();
  }, [items, searchTerm]);

  const filterItems = () => {
    if (!searchTerm.trim()) {
      setFilteredItems(items);
      return;
    }

    const filtered = items.filter(item =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.seller.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredItems(filtered);
  };

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from('shop_items')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setItems(data || []);
      setFilteredItems(data || []);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les articles",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // Get total items
      const { count: itemsCount } = await supabase
        .from('shop_items')
        .select('*', { count: 'exact', head: true });

      // Get total revenue
      const { data: ordersData } = await supabase
        .from('orders')
        .select('price')
        .eq('status', 'completed');

      const totalRevenue = ordersData?.reduce((sum, order) => sum + order.price, 0) || 0;

      // Get total users
      const { count: usersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Get recent orders (last 7 days)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      const { count: recentOrdersCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', weekAgo.toISOString());

      setStats({
        totalItems: itemsCount || 0,
        totalRevenue,
        totalUsers: usersCount || 0,
        recentOrders: recentOrdersCount || 0
      });
    } catch (error: any) {
      console.error('Error fetching stats:', error);
    }
  };

  const uploadImage = async (file: File, path: string): Promise<string> => {
    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('product-images')
      .getPublicUrl(data.path);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setUploadingImages(true);
      let finalImageUrl = formData.image_url;
      let finalAdditionalImages = formData.additional_images;

      // Upload cover image if a new file is selected
      if (coverImageFile) {
        const coverPath = `covers/${Date.now()}-${coverImageFile.name}`;
        finalImageUrl = await uploadImage(coverImageFile, coverPath);
      }

      // Upload additional images if any
      if (additionalImageFiles.length > 0) {
        const uploadPromises = additionalImageFiles.map(async (file) => {
          const imagePath = `additional/${Date.now()}-${file.name}`;
          return uploadImage(file, imagePath);
        });
        
        const uploadedUrls = await Promise.all(uploadPromises);
        finalAdditionalImages = [...formData.additional_images, ...uploadedUrls];
      }

      const finalData = {
        ...formData,
        image_url: finalImageUrl,
        additional_images: finalAdditionalImages,
        price: parseInt(formData.price),
        sale_price: formData.is_on_sale && formData.sale_price ? parseInt(formData.sale_price) : null,
        tags: formData.tags
      };

      if (editingItem) {
        const { data: updatedData, error: updateError } = await supabase
          .from('shop_items')
          .update({
            name: finalData.name,
            description: finalData.description,
            price: finalData.price,
            image_url: finalData.image_url,
            category: finalData.category,
            seller: finalData.seller,
            content: finalData.content,
            is_on_sale: finalData.is_on_sale,
            sale_price: finalData.sale_price,
            tags: finalData.tags,
            is_temporary: finalData.is_temporary,
            product_id: finalData.product_id,
            is_clothing: finalData.is_clothing,
            available_sizes: finalData.available_sizes,
            additional_images: finalData.additional_images
          })
          .eq('id', editingItem.id)
          .select()
          .single();

        if (updateError) throw updateError;

        // Update the item in the state
        setItems(prev => prev.map(item => 
          item.id === editingItem.id ? updatedData : item
        ));

        toast({
          title: "Article mis à jour",
          description: "L'article a été modifié avec succès",
        });
      } else {
        const { data: newItem, error: insertError } = await supabase
          .from('shop_items')
          .insert([finalData])
          .select()
          .single();

        if (insertError) throw insertError;

        // Add the new item to the state
        setItems(prev => [newItem, ...prev]);

        toast({
          title: "Article créé",
          description: "Le nouvel article a été ajouté avec succès",
        });
      }

      setDialogOpen(false);
      setEditingItem(null);
      setFormData({
        name: "",
        description: "",
        price: "",
        image_url: "",
        category: "",
        seller: "",
        content: "",
        is_on_sale: false,
        sale_price: "",
        tags: [],
        is_temporary: false,
        product_id: "",
        is_clothing: false,
        available_sizes: [],
        additional_images: []
      });
      setCoverImageFile(null);
      setAdditionalImageFiles([]);
      setTagInput("");
      fetchStats();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la sauvegarde",
        variant: "destructive",
      });
    } finally {
      setUploadingImages(false);
    }
  };

  const handleEdit = (item: ShopItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description,
      price: item.price.toString(),
      image_url: item.image_url,
      category: item.category,
      seller: item.seller,
      content: item.content || "",
      is_on_sale: item.is_on_sale || false,
      sale_price: item.sale_price ? item.sale_price.toString() : "",
      tags: item.tags || [],
      is_temporary: item.is_temporary || false,
      product_id: item.product_id || "",
      is_clothing: item.is_clothing || false,
      available_sizes: item.available_sizes || [],
      additional_images: item.additional_images || []
    });
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => handleDeleteItem(id);

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      price: "",
      image_url: "",
      category: "",
      seller: "",
      content: "",
      is_on_sale: false,
      sale_price: "",
      tags: [],
      is_temporary: false,
      product_id: "",
      is_clothing: false,
      available_sizes: [],
      additional_images: []
    });
    setCoverImageFile(null);
    setAdditionalImageFiles([]);
    setTagInput("");
    setEditingItem(null);
  };


  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cet article ?")) return;

    try {
      const { error } = await supabase
        .from('shop_items')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Article supprimé",
        description: "L'article a été supprimé avec succès",
      });

      fetchItems();
      fetchStats();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la suppression",
        variant: "destructive",
      });
    }
  };

  const handleNewItem = () => {
    setEditingItem(null);
    resetForm();
    setDialogOpen(true);
  };

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-20">
          <div className="animate-pulse">
            <Package className="h-16 w-16 text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Chargement du tableau de bord...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <h1 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Administration Oryshop
            </h1>
            <p className="text-muted-foreground text-base md:text-lg mt-2">
              Gérez les articles et suivez les statistiques
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              onClick={() => navigate('/admin/sales-export')}
              variant="outline"
              className="flex items-center gap-2"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Export des ventes
            </Button>
            
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleNewItem} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Nouvel article
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
                <DialogHeader>
                  <DialogTitle>
                    {editingItem ? "Modifier l'article" : "Créer un nouvel article"}
                  </DialogTitle>
                </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nom de l'article</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="price">Prix (€)</Label>
                    <Input
                      id="price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="seller">Vendeur</Label>
                  <Input
                    id="seller"
                    value={formData.seller}
                    onChange={(e) => setFormData(prev => ({ ...prev, seller: e.target.value }))}
                    placeholder="ex: Artisan local"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="product_id">Identifiant produit</Label>
                  <Input
                    id="product_id"
                    value={formData.product_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, product_id: e.target.value }))}
                    placeholder="ex: PROD-001"
                  />
                </div>

                {/* Image Upload Section */}
                <div className="space-y-4 p-4 border border-border rounded-lg bg-muted/20">
                  <Label>Images du produit</Label>
                  
                  {/* Cover Image */}
                  <div className="space-y-2">
                    <Label htmlFor="cover_image">Image de couverture</Label>
                    <Input
                      id="cover_image"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setCoverImageFile(file);
                      }}
                      className="cursor-pointer"
                    />
                    {(coverImageFile || formData.image_url) && (
                      <div className="mt-2">
                        <img
                          src={coverImageFile ? URL.createObjectURL(coverImageFile) : formData.image_url}
                          alt="Aperçu"
                          className="w-24 h-24 object-cover rounded-lg border"
                        />
                      </div>
                    )}
                  </div>

                  {/* Additional Images */}
                  <div className="space-y-2">
                    <Label htmlFor="additional_images">Images supplémentaires</Label>
                    <Input
                      id="additional_images"
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        setAdditionalImageFiles(prev => [...prev, ...files]);
                      }}
                      className="cursor-pointer"
                    />
                    
                    {/* Preview existing additional images */}
                    {formData.additional_images.length > 0 && (
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        {formData.additional_images.map((url, index) => (
                          <div key={index} className="relative">
                            <img
                              src={url}
                              alt={`Image ${index + 1}`}
                              className="w-full h-20 object-cover rounded-lg border"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setFormData(prev => ({
                                  ...prev,
                                  additional_images: prev.additional_images.filter((_, i) => i !== index)
                                }));
                              }}
                              className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Preview new additional images */}
                    {additionalImageFiles.length > 0 && (
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        {additionalImageFiles.map((file, index) => (
                          <div key={index} className="relative">
                            <img
                              src={URL.createObjectURL(file)}
                              alt={`Nouvelle image ${index + 1}`}
                              className="w-full h-20 object-cover rounded-lg border"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setAdditionalImageFiles(prev => prev.filter((_, i) => i !== index));
                              }}
                              className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content">Contenu détaillé (optionnel)</Label>
                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                    rows={4}
                  />
                </div>

                {/* Tags Section */}
                <div className="space-y-2">
                  <Label>Tags</Label>
                  <div className="flex gap-2">
                    <Input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      placeholder="Ajouter un tag"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    />
                    <Button type="button" onClick={addTag} size="sm">
                      Ajouter
                    </Button>
                  </div>
                  {formData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="cursor-pointer" onClick={() => removeTag(tag)}>
                          {tag} ×
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Sale Section */}
                <div className="space-y-4 p-4 border border-border rounded-lg bg-muted/20">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_on_sale"
                      checked={formData.is_on_sale}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_on_sale: checked, sale_price: checked ? formData.sale_price : "" })}
                    />
                    <Label htmlFor="is_on_sale">Article en solde</Label>
                  </div>
                  
                  {formData.is_on_sale && (
                    <div className="space-y-2">
                      <Label htmlFor="sale_price">Prix soldé (€)</Label>
                      <Input
                        id="sale_price"
                        type="number"
                        value={formData.sale_price}
                        onChange={(e) => setFormData({ ...formData, sale_price: e.target.value })}
                        placeholder="ex: 15"
                      />
                    </div>
                  )}
                </div>

                {/* Temporary Section */}
                <div className="space-y-4 p-4 border border-border rounded-lg bg-muted/20">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_temporary"
                      checked={formData.is_temporary}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_temporary: checked })}
                    />
                    <Label htmlFor="is_temporary">Article temporaire (seulement ce mois-ci)</Label>
                  </div>
                </div>

                {/* Clothing Section */}
                <div className="space-y-4 p-4 border border-border rounded-lg bg-muted/20">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_clothing"
                      checked={formData.is_clothing}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_clothing: checked, available_sizes: checked ? formData.available_sizes : [] })}
                    />
                    <Label htmlFor="is_clothing">Vêtements inclus</Label>
                  </div>
                  
                  {formData.is_clothing && (
                    <div className="space-y-2">
                      <Label>Tailles disponibles</Label>
                      <div className="grid grid-cols-3 gap-2">
                        {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map((size) => (
                          <div key={size} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={`size-${size}`}
                              checked={formData.available_sizes.includes(size)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFormData(prev => ({
                                    ...prev,
                                    available_sizes: [...prev.available_sizes, size]
                                  }));
                                } else {
                                  setFormData(prev => ({
                                    ...prev,
                                    available_sizes: prev.available_sizes.filter(s => s !== size)
                                  }));
                                }
                              }}
                              className="rounded border-gray-300"
                            />
                            <Label htmlFor={`size-${size}`} className="text-sm">
                              {size}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={uploadingImages}>
                  {uploadingImages ? "Upload en cours..." : (editingItem ? "Mettre à jour" : "Créer l'article")}
                </Button>
              </form>
            </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-border bg-card/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Articles totaux</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stats.totalItems}</div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenus totaux</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stats.totalRevenue}€</div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Utilisateurs</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stats.totalUsers}</div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Commandes (7j)</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stats.recentOrders}</div>
            </CardContent>
          </Card>
        </div>

        {/* Items List */}
        <Card className="border-border bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle>Articles de la boutique</CardTitle>
                <CardDescription>
                  Gérez tous les articles disponibles dans Oryshop
                </CardDescription>
              </div>
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un article..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {filteredItems.map((item) => (
                <div key={item.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 border border-border rounded-lg bg-muted/20">
                  <div className="flex items-center space-x-4 flex-1 min-w-0">
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <h4 className="font-semibold truncate">{item.name}</h4>
                      <p className="text-sm text-muted-foreground line-clamp-2 sm:line-clamp-1">
                        {item.description}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <Badge variant="secondary">{item.category}</Badge>
                        {item.is_on_sale && (
                          <Badge variant="destructive" className="bg-red-600">Soldé</Badge>
                        )}
                        {item.is_temporary && (
                          <Badge className="bg-orange-600 text-white">Temporaire</Badge>
                        )}
                        {item.tags && item.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {item.tags.slice(0, 2).map((tag, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {item.tags.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{item.tags.length - 2}
                              </Badge>
                            )}
                          </div>
                        )}
                        <span className="text-sm text-muted-foreground">par {item.seller}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-2">
                    <div className="text-right">
                      {item.is_on_sale && item.sale_price ? (
                        <div className="flex flex-col items-end">
                          <span className="text-sm text-muted-foreground line-through">{item.price}€</span>
                          <span className="text-lg font-bold text-red-600">{item.sale_price}€</span>
                        </div>
                      ) : (
                        <span className="text-lg font-bold text-primary">{item.price}€</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(item)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(item.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredItems.length === 0 && items.length > 0 && (
              <div className="text-center py-12">
                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Aucun article trouvé</h3>
                <p className="text-muted-foreground">
                  Aucun article ne correspond à votre recherche "{searchTerm}"
                </p>
              </div>
            )}

            {items.length === 0 && (
              <div className="text-center py-20">
                <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Aucun article</h3>
                <p className="text-muted-foreground mb-4">
                  Commencez par créer votre premier article
                </p>
                <Button onClick={handleNewItem}>
                  <Plus className="h-4 w-4 mr-2" />
                  Créer un article
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}