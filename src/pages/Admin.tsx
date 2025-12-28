import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Package, DollarSign, Users, TrendingUp, Search, FileSpreadsheet, Filter, ShoppingCart, Tag, Eye, EyeOff, Gift, Send, CreditCard, Check, Copy, BarChart3 } from "lucide-react";
import { MarketingAnalytics } from "@/components/admin/MarketingAnalytics";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/Layout";
import { slugify, isSlugAvailable, generateUniqueSlug } from "@/lib/slugify";

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
  categories?: string[];
  is_temporary?: boolean;
  product_id?: string;
  is_clothing?: boolean;
  available_sizes?: string[];
  additional_images?: string[];
  shop_type?: 'internal' | 'external';
}

interface BundleDeal {
  id: string;
  name: string;
  description?: string;
  product_ids: string[];
  discount_percentage: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface AdminStats {
  totalItems: number;
  totalRevenue: number;
  totalUsers: number;
  recentOrders: number;
}

interface PromoCode {
  id: string;
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  minimum_purchase_amount: number | null;
  max_uses: number | null;
  current_uses: number | null;
  is_single_use: boolean | null;
  start_date: string | null;
  expiration_date: string | null;
  description: string | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  created_by: string | null;
}

interface Book {
  id: string;
  title: string;
  author: string;
}

export default function Admin() {
  const [items, setItems] = useState<ShopItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<ShopItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [stats, setStats] = useState<AdminStats>({ totalItems: 0, totalRevenue: 0, totalUsers: 0, recentOrders: 0 });
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bundleDialogOpen, setBundleDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ShopItem | null>(null);
  const [bundles, setBundles] = useState<BundleDeal[]>([]);
  const [editingBundle, setEditingBundle] = useState<BundleDeal | null>(null);
  
  // New state for enhanced bundle management
  const [bundleProductSearch, setBundleProductSearch] = useState("");
  const [bundleSearch, setBundleSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("tous");
  const [selectedTagFilter, setSelectedTagFilter] = useState("");
  const [filteredBundles, setFilteredBundles] = useState<BundleDeal[]>([]);
  
  // Promo codes state
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [promoDialogOpen, setPromoDialogOpen] = useState(false);
  const [editingPromoCode, setEditingPromoCode] = useState<PromoCode | null>(null);
  const [promoFormData, setPromoFormData] = useState({
    code: "",
    discount_type: "percentage" as "percentage" | "fixed",
    discount_value: "",
    minimum_purchase_amount: "0",
    max_uses: "",
    is_single_use: false,
    start_date: "",
    expiration_date: "",
    description: "",
    is_active: true
  });
  
  // Books state
  const [books, setBooks] = useState<Book[]>([]);
  
  // Gift card state
  const [giftCardDialogOpen, setGiftCardDialogOpen] = useState(false);
  const [giftCardLoading, setGiftCardLoading] = useState(false);
  const [giftCardSelectedAmount, setGiftCardSelectedAmount] = useState<number | null>(50);
  const [giftCardCustomAmount, setGiftCardCustomAmount] = useState("");
  const [giftCardRecipientName, setGiftCardRecipientName] = useState("");
  const [giftCardRecipientEmail, setGiftCardRecipientEmail] = useState("");
  const [giftCardPersonalMessage, setGiftCardPersonalMessage] = useState("");
  const [createdGiftCard, setCreatedGiftCard] = useState<{code: string; amount: number; expiresAt: string; recipientName?: string; recipientEmail?: string} | null>(null);
  const PRESET_AMOUNTS = [25, 50, 75, 100];
  
  const navigate = useNavigate();
  const AVAILABLE_CATEGORIES = ["livres", "produits dérivés", "packs", "accessoires", "vêtements"];
  
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
    categories: [] as string[],
    is_temporary: false,
    product_id: "",
    is_clothing: false,
    available_sizes: [] as string[],
    additional_images: [] as string[],
    shop_type: "" as 'internal' | 'external' | "",
    related_book_ids: [] as string[],
    slug: "",
    is_available: true
  });

  const [bundleFormData, setBundleFormData] = useState({
    name: "",
    description: "",
    product_ids: [] as string[],
    discount_percentage: "",
    is_active: true
  });
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [additionalImageFiles, setAdditionalImageFiles] = useState<File[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchItems();
    fetchStats();
    fetchBundles();
    fetchPromoCodes();
    fetchBooks();
  }, []);

  useEffect(() => {
    filterItems();
  }, [items, searchTerm]);

  useEffect(() => {
    filterBundles();
  }, [bundles, bundleSearch]);

  const filterBundles = () => {
    let filtered = bundles;
    
    if (bundleSearch.trim()) {
      filtered = filtered.filter(bundle =>
        bundle.name.toLowerCase().includes(bundleSearch.toLowerCase()) ||
        (bundle.description && bundle.description.toLowerCase().includes(bundleSearch.toLowerCase()))
      );
    }
    
    setFilteredBundles(filtered);
  };

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

  const fetchBundles = async () => {
    try {
      const { data, error } = await supabase
        .from('bundle_deals')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBundles(data || []);
      setFilteredBundles(data || []);
    } catch (error: any) {
      console.error('Error fetching bundles:', error);
    }
  };

  const fetchPromoCodes = async () => {
    try {
      const { data, error } = await supabase
        .from('promo_codes')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setPromoCodes((data || []) as PromoCode[]);
    } catch (error: any) {
      console.error('Error fetching promo codes:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les codes promo",
        variant: "destructive",
      });
    }
  };

  const fetchBooks = async () => {
    try {
      const { data, error } = await supabase
        .from('books')
        .select('id, title, author')
        .order('title');
      
      if (error) throw error;
      setBooks(data || []);
    } catch (error: any) {
      console.error('Error fetching books:', error);
    }
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

      // Get total revenue (including pending orders temporarily)
      const { data: ordersData } = await supabase
        .from('orders')
        .select('price, status')
        .in('status', ['completed', 'pending']);

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
    
    // Validation du shop_type
    if (!formData.shop_type) {
      toast({
        title: "Champ requis",
        description: "Veuillez sélectionner le type de boutique (Oryshop ou Orydia)",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Check slug uniqueness (except for editing item)
      const slugIsAvailable = await isSlugAvailable(
        formData.slug,
        editingItem?.id
      );
      
      if (!slugIsAvailable) {
        toast({
          title: "Erreur",
          description: "Ce slug existe déjà. Veuillez en choisir un autre.",
          variant: "destructive",
        });
        return;
      }
      
      // Generate slug if empty
      let finalSlug = formData.slug;
      if (!finalSlug && !editingItem) {
        finalSlug = generateUniqueSlug(formData.name, Date.now().toString());
      }
      
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
        price: parseFloat(formData.price),
        sale_price: formData.is_on_sale && formData.sale_price ? parseFloat(formData.sale_price) : null,
        tags: formData.tags,
        shop_type: formData.shop_type as 'internal' | 'external',
        related_book_ids: formData.related_book_ids,
        slug: finalSlug || formData.slug,
        is_available: formData.is_available
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
            categories: finalData.categories,
            is_temporary: finalData.is_temporary,
            product_id: finalData.product_id,
            is_clothing: finalData.is_clothing,
            available_sizes: finalData.available_sizes,
            additional_images: finalData.additional_images,
            shop_type: finalData.shop_type,
            related_book_ids: finalData.related_book_ids,
            slug: finalData.slug,
            is_available: formData.is_available
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
        categories: [],
        is_temporary: false,
        product_id: "",
        is_clothing: false,
        available_sizes: [],
        additional_images: [],
        shop_type: "",
        related_book_ids: [],
        slug: "",
        is_available: true
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
      categories: item.categories || [],
      is_temporary: item.is_temporary || false,
      product_id: item.product_id || "",
      is_clothing: item.is_clothing || false,
      available_sizes: item.available_sizes || [],
      additional_images: item.additional_images || [],
      shop_type: item.shop_type || "external",
      related_book_ids: (item as any).related_book_ids || [],
      slug: (item as any).slug || "",
      is_available: (item as any).is_available !== false
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
      categories: [],
      is_temporary: false,
      product_id: "",
      is_clothing: false,
      available_sizes: [],
      additional_images: [],
      shop_type: "",
      related_book_ids: [],
      slug: "",
      is_available: true
    });
    setCoverImageFile(null);
    setAdditionalImageFiles([]);
    setTagInput("");
    setEditingItem(null);
  };

  // Gift card functions
  const giftCardFinalAmount = giftCardSelectedAmount || (giftCardCustomAmount ? parseFloat(giftCardCustomAmount) : 0);

  const resetGiftCardForm = () => {
    setGiftCardSelectedAmount(50);
    setGiftCardCustomAmount("");
    setGiftCardRecipientName("");
    setGiftCardRecipientEmail("");
    setGiftCardPersonalMessage("");
    setCreatedGiftCard(null);
  };

  const handleCreateGiftCard = async () => {
    if (!giftCardFinalAmount || giftCardFinalAmount < 5 || giftCardFinalAmount > 500) {
      toast({
        title: "Montant invalide",
        description: "Le montant doit être entre 5€ et 500€",
        variant: "destructive",
      });
      return;
    }

    try {
      setGiftCardLoading(true);

      const { data, error } = await supabase.functions.invoke('admin-create-gift-card', {
        body: {
          amount: giftCardFinalAmount,
          recipientEmail: giftCardRecipientEmail || undefined,
          recipientName: giftCardRecipientName || undefined,
          personalMessage: giftCardPersonalMessage || undefined,
        },
      });

      if (error) throw error;

      if (data?.success && data?.giftCard) {
        setCreatedGiftCard(data.giftCard);
        toast({
          title: "Carte cadeau créée !",
          description: `Code: ${data.giftCard.code} - Montant: ${data.giftCard.amount}€`,
        });
      } else {
        throw new Error(data?.error || "Erreur lors de la création");
      }
    } catch (error: any) {
      console.error("Error creating gift card:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer la carte cadeau",
        variant: "destructive",
      });
    } finally {
      setGiftCardLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copié !",
      description: "Le code a été copié dans le presse-papier",
    });
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

  const generateRandomCode = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const prefix = 'PROMO';
    const length = 6;
    let code = prefix + '-';
    
    for (let i = 0; i < length; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    
    setPromoFormData(prev => ({ ...prev, code }));
  };

  const resetPromoForm = () => {
    setPromoFormData({
      code: "",
      discount_type: "percentage",
      discount_value: "",
      minimum_purchase_amount: "0",
      max_uses: "",
      is_single_use: false,
      start_date: "",
      expiration_date: "",
      description: "",
      is_active: true
    });
  };

  const handlePromoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const finalData = {
        code: promoFormData.code.toUpperCase(),
        discount_type: promoFormData.discount_type,
        discount_value: parseFloat(promoFormData.discount_value),
        minimum_purchase_amount: promoFormData.minimum_purchase_amount 
          ? parseFloat(promoFormData.minimum_purchase_amount) 
          : 0,
        max_uses: promoFormData.max_uses ? parseInt(promoFormData.max_uses) : null,
        is_single_use: promoFormData.is_single_use,
        start_date: promoFormData.start_date || null,
        expiration_date: promoFormData.expiration_date || null,
        description: promoFormData.description,
        is_active: promoFormData.is_active,
        created_by: user?.id
      };
      
      if (editingPromoCode) {
        const { error } = await supabase
          .from('promo_codes')
          .update(finalData)
          .eq('id', editingPromoCode.id);
        
        if (error) throw error;
        
        toast({
          title: "Code promo modifié",
          description: `Le code ${finalData.code} a été mis à jour`,
        });
      } else {
        const { error } = await supabase
          .from('promo_codes')
          .insert([finalData]);
        
        if (error) throw error;
        
        toast({
          title: "Code promo créé",
          description: `Le code ${finalData.code} a été créé avec succès`,
        });
      }
      
      fetchPromoCodes();
      resetPromoForm();
      setPromoDialogOpen(false);
      setEditingPromoCode(null);
    } catch (error: any) {
      console.error('Error saving promo code:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de sauvegarder le code promo",
        variant: "destructive",
      });
    }
  };

  const handleDeletePromoCode = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce code promo ?")) return;
    
    try {
      const { error } = await supabase
        .from('promo_codes')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      toast({
        title: "Code promo supprimé",
        description: "Le code a été supprimé avec succès",
      });
      
      fetchPromoCodes();
    } catch (error: any) {
      console.error('Error deleting promo code:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le code promo",
        variant: "destructive",
      });
    }
  };

  const togglePromoCodeActive = async (id: string, currentState: boolean | null) => {
    try {
      const { error } = await supabase
        .from('promo_codes')
        .update({ is_active: !currentState })
        .eq('id', id);
      
      if (error) throw error;
      
      fetchPromoCodes();
      toast({
        title: currentState ? "Code désactivé" : "Code activé",
      });
    } catch (error: any) {
      console.error('Error toggling promo code:', error);
      toast({
        title: "Erreur",
        description: "Impossible de modifier l'état du code",
        variant: "destructive",
      });
    }
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

  const renderProductList = (category?: string) => {
    let productsToShow = items;
    
    // Filter by category if provided
    if (category) {
      productsToShow = items.filter(item => 
        item.categories?.includes(category) || 
        (category === item.category)
      );
    }
    
    // Filter by search term
    if (bundleProductSearch.trim()) {
      productsToShow = productsToShow.filter(item =>
        item.name.toLowerCase().includes(bundleProductSearch.toLowerCase()) ||
        item.description.toLowerCase().includes(bundleProductSearch.toLowerCase()) ||
        item.tags?.some(tag => tag.toLowerCase().includes(bundleProductSearch.toLowerCase()))
      );
    }
    
    // Filter by tag if selected
    if (selectedTagFilter) {
      productsToShow = productsToShow.filter(item =>
        item.tags?.includes(selectedTagFilter)
      );
    }
    
    // Get unique tags for filter dropdown
    const availableTags = [...new Set(productsToShow.flatMap(item => item.tags || []))];
    
    return (
      <div className="space-y-3">
        {/* Tag filter for current category */}
        {availableTags.length > 0 && (
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <select
              value={selectedTagFilter}
              onChange={(e) => setSelectedTagFilter(e.target.value)}
              className="px-3 py-1 border rounded-md text-sm bg-background"
            >
              <option value="">Tous les tags</option>
              {availableTags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
            {selectedTagFilter && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedTagFilter("")}
                className="h-6 px-2 text-xs"
              >
                Effacer
              </Button>
            )}
          </div>
        )}
        
        {/* Products list */}
        <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
          {productsToShow.map((item) => (
            <div key={item.id} className="flex items-center space-x-2">
              <input
                type="checkbox"
                id={`bundle-product-${item.id}`}
                checked={bundleFormData.product_ids.includes(item.id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setBundleFormData(prev => ({
                      ...prev,
                      product_ids: [...prev.product_ids, item.id]
                    }));
                  } else {
                    setBundleFormData(prev => ({
                      ...prev,
                      product_ids: prev.product_ids.filter(id => id !== item.id)
                    }));
                  }
                }}
                className="rounded border-gray-300"
              />
              <Label htmlFor={`bundle-product-${item.id}`} className="text-sm">
                {item.name} - {item.price}€
                {item.tags && item.tags.length > 0 && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    [{item.tags.join(', ')}]
                  </span>
                )}
              </Label>
            </div>
          ))}
        </div>
        
        {productsToShow.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Aucun produit trouvé
          </p>
        )}
      </div>
    );
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
              onClick={async () => {
                if (confirm("Êtes-vous sûr de vouloir supprimer toutes les commandes et remettre les revenus à zéro ? Cette action est irréversible.")) {
                  try {
                    const { error } = await supabase.rpc('reset_revenue_and_orders');
                    if (error) throw error;
                    toast({
                      title: "Reset effectué",
                      description: "Les revenus et commandes ont été remis à zéro",
                    });
                    fetchStats();
                  } catch (error: any) {
                    toast({
                      title: "Erreur",
                      description: error.message || "Erreur lors du reset",
                      variant: "destructive",
                    });
                  }
                }
              }}
              variant="destructive"
              size="sm"
            >
              Reset Revenus
            </Button>
            
            <Button
              onClick={() => navigate('/admin/sales-export')}
              variant="outline"
              className="flex items-center gap-2"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Export des ventes
            </Button>
            
            <Button
              onClick={() => navigate('/admin/orders')}
              variant="outline"
              className="flex items-center gap-2"
            >
              <ShoppingCart className="h-4 w-4" />
              Gestion des commandes
            </Button>
            
            {/* Gift Card Dialog */}
            <Dialog open={giftCardDialogOpen} onOpenChange={(open) => {
              setGiftCardDialogOpen(open);
              if (!open) resetGiftCardForm();
            }}>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <Gift className="h-4 w-4" />
                  Cartes Cadeaux
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Gift className="h-5 w-5" />
                    Générer une carte cadeau
                  </DialogTitle>
                </DialogHeader>
                
                {createdGiftCard ? (
                  <div className="space-y-6">
                    {/* Success state */}
                    <div className="text-center space-y-4">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30">
                        <Check className="h-8 w-8 text-green-600" />
                      </div>
                      <h3 className="text-xl font-bold">Carte cadeau créée avec succès !</h3>
                    </div>
                    
                    {/* Gift card preview */}
                    <div className="relative bg-gradient-to-br from-primary to-accent p-6 rounded-xl text-primary-foreground overflow-hidden">
                      <div className="absolute inset-0 opacity-10">
                        <div className="absolute top-4 right-4">
                          <Gift className="h-24 w-24" />
                        </div>
                      </div>
                      
                      <div className="relative space-y-4">
                        <div className="flex items-center gap-2">
                          <Gift className="h-6 w-6" />
                          <span className="font-bold text-lg">CARTE CADEAU ORYSHOP</span>
                        </div>
                        
                        <div className="text-4xl font-bold">
                          {createdGiftCard.amount.toFixed(2)}€
                        </div>
                        
                        <div className="flex items-center gap-2 bg-primary-foreground/20 p-3 rounded-lg">
                          <span className="font-mono text-lg tracking-wider">{createdGiftCard.code}</span>
                          <Button 
                            size="sm" 
                            variant="secondary"
                            onClick={() => copyToClipboard(createdGiftCard.code)}
                            className="ml-auto"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        {createdGiftCard.recipientName && (
                          <div className="text-sm opacity-90">
                            Pour: {createdGiftCard.recipientName}
                          </div>
                        )}
                        
                        <div className="text-xs opacity-70 pt-2">
                          Expire le: {new Date(createdGiftCard.expiresAt).toLocaleDateString('fr-FR')}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-3">
                      <Button 
                        onClick={resetGiftCardForm} 
                        className="flex-1"
                      >
                        Créer une autre carte
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => setGiftCardDialogOpen(false)}
                      >
                        Fermer
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Amount Selection */}
                    <div className="space-y-6">
                      <div>
                        <Label className="text-base font-semibold flex items-center gap-2 mb-3">
                          <CreditCard className="h-4 w-4" />
                          Choisissez un montant
                        </Label>
                        
                        <div className="grid grid-cols-2 gap-3">
                          {PRESET_AMOUNTS.map((amount) => (
                            <Button
                              key={amount}
                              variant={giftCardSelectedAmount === amount ? "default" : "outline"}
                              className="h-14 text-lg font-semibold"
                              onClick={() => {
                                setGiftCardSelectedAmount(amount);
                                setGiftCardCustomAmount("");
                              }}
                            >
                              {giftCardSelectedAmount === amount && <Check className="h-4 w-4 mr-2" />}
                              {amount}€
                            </Button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="admin-custom-amount">Ou montant personnalisé</Label>
                        <div className="relative">
                          <Input
                            id="admin-custom-amount"
                            type="number"
                            min="5"
                            max="500"
                            placeholder="Montant (5€ - 500€)"
                            value={giftCardCustomAmount}
                            onChange={(e) => {
                              setGiftCardCustomAmount(e.target.value);
                              setGiftCardSelectedAmount(null);
                            }}
                            className="pr-8"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                            €
                          </span>
                        </div>
                      </div>

                      <div className="space-y-4 pt-4 border-t">
                        <h4 className="font-medium flex items-center gap-2">
                          <Send className="h-4 w-4" />
                          Pour qui ? (optionnel)
                        </h4>
                        
                        <div className="space-y-2">
                          <Label htmlFor="admin-recipient-name">Nom du destinataire</Label>
                          <Input
                            id="admin-recipient-name"
                            placeholder="Marie"
                            value={giftCardRecipientName}
                            onChange={(e) => setGiftCardRecipientName(e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="admin-recipient-email">Email du destinataire</Label>
                          <Input
                            id="admin-recipient-email"
                            type="email"
                            placeholder="marie@example.com"
                            value={giftCardRecipientEmail}
                            onChange={(e) => setGiftCardRecipientEmail(e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="admin-message">Message personnalisé</Label>
                          <Textarea
                            id="admin-message"
                            placeholder="Joyeux anniversaire ! 🎂"
                            value={giftCardPersonalMessage}
                            onChange={(e) => setGiftCardPersonalMessage(e.target.value)}
                            rows={3}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Preview & Send */}
                    <div className="space-y-6">
                      {/* Preview Card */}
                      <Card className="bg-gradient-to-br from-primary/10 via-background to-accent/10 border-primary/20">
                        <CardHeader>
                          <CardTitle className="text-base">Aperçu de la carte</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="relative bg-gradient-to-br from-primary to-accent p-5 rounded-xl text-primary-foreground overflow-hidden">
                            <div className="absolute inset-0 opacity-10">
                              <div className="absolute top-4 right-4">
                                <Gift className="h-20 w-20" />
                              </div>
                            </div>
                            
                            <div className="relative space-y-3">
                              <div className="flex items-center gap-2">
                                <Gift className="h-5 w-5" />
                                <span className="font-bold">CARTE CADEAU ORYSHOP</span>
                              </div>
                              
                              <div className="text-3xl font-bold">
                                {giftCardFinalAmount > 0 ? `${giftCardFinalAmount.toFixed(2)}€` : "0,00€"}
                              </div>
                              
                              {giftCardRecipientName && (
                                <div className="text-sm opacity-90">
                                  Pour: {giftCardRecipientName}
                                </div>
                              )}
                              
                              {giftCardPersonalMessage && (
                                <div className="text-sm italic opacity-80 border-l-2 border-primary-foreground/30 pl-3">
                                  "{giftCardPersonalMessage}"
                                </div>
                              )}
                              
                              <div className="text-xs opacity-70 pt-2">
                                Valable 1 an • Code unique
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Send Button */}
                      <Card>
                        <CardContent className="pt-6 space-y-4">
                          <div className="flex justify-between items-center text-lg">
                            <span>Montant</span>
                            <span className="font-bold text-2xl text-primary">
                              {giftCardFinalAmount > 0 ? `${giftCardFinalAmount.toFixed(2)}€` : "—"}
                            </span>
                          </div>

                          <Button
                            onClick={handleCreateGiftCard}
                            disabled={giftCardLoading || giftCardFinalAmount < 5}
                            className="w-full h-12 text-lg"
                            size="lg"
                          >
                            <Send className="h-5 w-5 mr-2" />
                            {giftCardLoading ? "Création..." : "Envoyer la carte cadeau"}
                          </Button>
                          
                          <p className="text-xs text-center text-muted-foreground">
                            La carte sera créée sans paiement (admin)
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
            
            <Dialog open={promoDialogOpen} onOpenChange={setPromoDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2" onClick={() => {
                  resetPromoForm();
                  setEditingPromoCode(null);
                }}>
                  <Tag className="h-4 w-4" />
                  Gestion des codes promo
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Gestion des codes promo</DialogTitle>
                </DialogHeader>
                <div className="space-y-6">
                  {/* Stats Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="border-border bg-muted/30">
                      <CardContent className="pt-6">
                        <div className="text-sm text-muted-foreground">Codes actifs</div>
                        <div className="text-2xl font-bold text-primary">
                          {promoCodes.filter(c => c.is_active).length}
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card className="border-border bg-muted/30">
                      <CardContent className="pt-6">
                        <div className="text-sm text-muted-foreground">Utilisations totales</div>
                        <div className="text-2xl font-bold text-primary">
                          {promoCodes.reduce((sum, c) => sum + (c.current_uses || 0), 0)}
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card className="border-border bg-muted/30">
                      <CardContent className="pt-6">
                        <div className="text-sm text-muted-foreground">Codes expirés</div>
                        <div className="text-2xl font-bold text-destructive">
                          {promoCodes.filter(c => 
                            c.expiration_date && new Date(c.expiration_date) < new Date()
                          ).length}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Form for creating/editing promo codes */}
                  <form onSubmit={handlePromoSubmit} className="space-y-4 p-4 border rounded-lg bg-muted/20">
                    <div className="space-y-2">
                      <Label htmlFor="promo_code">Code promo *</Label>
                      <div className="flex gap-2">
                        <Input
                          id="promo_code"
                          value={promoFormData.code}
                          onChange={(e) => setPromoFormData(prev => ({ 
                            ...prev, 
                            code: e.target.value.toUpperCase() 
                          }))}
                          placeholder="ex: SAVE20"
                          required
                          className="flex-1"
                        />
                        <Button 
                          type="button" 
                          variant="outline"
                          onClick={generateRandomCode}
                        >
                          Générer
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="discount_type">Type de réduction *</Label>
                        <select
                          id="discount_type"
                          value={promoFormData.discount_type}
                          onChange={(e) => setPromoFormData(prev => ({ 
                            ...prev, 
                            discount_type: e.target.value as "percentage" | "fixed" 
                          }))}
                          className="w-full rounded-md border border-input bg-background px-3 py-2"
                          required
                        >
                          <option value="percentage">Pourcentage (%)</option>
                          <option value="fixed">Montant fixe (€)</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="discount_value">
                          Valeur * {promoFormData.discount_type === 'percentage' ? '(%)' : '(€)'}
                        </Label>
                        <Input
                          id="discount_value"
                          type="number"
                          min="0"
                          step={promoFormData.discount_type === 'percentage' ? "1" : "0.01"}
                          max={promoFormData.discount_type === 'percentage' ? "100" : undefined}
                          value={promoFormData.discount_value}
                          onChange={(e) => setPromoFormData(prev => ({ 
                            ...prev, 
                            discount_value: e.target.value 
                          }))}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="minimum_purchase">Montant minimum d'achat (€)</Label>
                      <Input
                        id="minimum_purchase"
                        type="number"
                        min="0"
                        step="0.01"
                        value={promoFormData.minimum_purchase_amount}
                        onChange={(e) => setPromoFormData(prev => ({ 
                          ...prev, 
                          minimum_purchase_amount: e.target.value 
                        }))}
                        placeholder="0.00"
                      />
                    </div>

                    <div className="space-y-4 p-4 border rounded-lg bg-background">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="is_single_use"
                          checked={promoFormData.is_single_use}
                          onCheckedChange={(checked) => setPromoFormData(prev => ({ 
                            ...prev, 
                            is_single_use: checked,
                            max_uses: checked ? "" : prev.max_uses
                          }))}
                        />
                        <Label htmlFor="is_single_use">Usage unique par utilisateur</Label>
                      </div>

                      {!promoFormData.is_single_use && (
                        <div className="space-y-2">
                          <Label htmlFor="max_uses">Nombre max d'utilisations totales</Label>
                          <Input
                            id="max_uses"
                            type="number"
                            min="1"
                            value={promoFormData.max_uses}
                            onChange={(e) => setPromoFormData(prev => ({ 
                              ...prev, 
                              max_uses: e.target.value 
                            }))}
                            placeholder="Illimité"
                          />
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="start_date">Date de début</Label>
                        <Input
                          id="start_date"
                          type="datetime-local"
                          value={promoFormData.start_date}
                          onChange={(e) => setPromoFormData(prev => ({ 
                            ...prev, 
                            start_date: e.target.value 
                          }))}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="expiration_date">Date d'expiration</Label>
                        <Input
                          id="expiration_date"
                          type="datetime-local"
                          value={promoFormData.expiration_date}
                          onChange={(e) => setPromoFormData(prev => ({ 
                            ...prev, 
                            expiration_date: e.target.value 
                          }))}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="promo_description">Description (interne)</Label>
                      <Textarea
                        id="promo_description"
                        value={promoFormData.description}
                        onChange={(e) => setPromoFormData(prev => ({ 
                          ...prev, 
                          description: e.target.value 
                        }))}
                        placeholder="Note interne..."
                        rows={3}
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="is_active"
                        checked={promoFormData.is_active}
                        onCheckedChange={(checked) => setPromoFormData(prev => ({ 
                          ...prev, 
                          is_active: checked 
                        }))}
                      />
                      <Label htmlFor="is_active">Code actif</Label>
                    </div>

                    <Button type="submit" className="w-full">
                      {editingPromoCode ? "Mettre à jour" : "Créer le code promo"}
                    </Button>
                  </form>

                  {/* List of existing promo codes */}
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">Codes promo existants</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-4 font-medium">Code</th>
                            <th className="text-left p-4 font-medium">Type</th>
                            <th className="text-left p-4 font-medium">Valeur</th>
                            <th className="text-left p-4 font-medium">Usages</th>
                            <th className="text-left p-4 font-medium">Statut</th>
                            <th className="text-left p-4 font-medium">Expiration</th>
                            <th className="text-left p-4 font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {promoCodes.map((promo) => {
                            const isExpired = promo.expiration_date && new Date(promo.expiration_date) < new Date();
                            const isMaxedOut = promo.max_uses && (promo.current_uses || 0) >= promo.max_uses;
                            
                            return (
                              <tr key={promo.id} className="border-b hover:bg-muted/50">
                                <td className="p-4 font-mono font-semibold">
                                  {promo.code}
                                  {promo.description && (
                                    <p className="text-xs text-muted-foreground mt-1">{promo.description}</p>
                                  )}
                                </td>
                                <td className="p-4">
                                  <Badge variant="outline">
                                    {promo.discount_type === 'percentage' ? '%' : '€'}
                                  </Badge>
                                </td>
                                <td className="p-4 font-semibold">
                                  {promo.discount_type === 'percentage' 
                                    ? `${promo.discount_value}%` 
                                    : `${promo.discount_value}€`
                                  }
                                  {(promo.minimum_purchase_amount || 0) > 0 && (
                                    <p className="text-xs text-muted-foreground">
                                      Min: {promo.minimum_purchase_amount}€
                                    </p>
                                  )}
                                </td>
                                <td className="p-4">
                                  <span className={isMaxedOut ? "text-destructive font-semibold" : ""}>
                                    {promo.current_uses || 0}
                                    {promo.max_uses && ` / ${promo.max_uses}`}
                                    {!promo.max_uses && promo.is_single_use && " (unique)"}
                                    {!promo.max_uses && !promo.is_single_use && " / ∞"}
                                  </span>
                                </td>
                                <td className="p-4">
                                  <Badge 
                                    variant={
                                      !promo.is_active ? "secondary" : 
                                      isExpired ? "destructive" : 
                                      isMaxedOut ? "outline" : 
                                      "default"
                                    }
                                  >
                                    {!promo.is_active ? "Inactif" :
                                     isExpired ? "Expiré" :
                                     isMaxedOut ? "Épuisé" :
                                     "Actif"}
                                  </Badge>
                                </td>
                                <td className="p-4 text-sm">
                                  {promo.expiration_date ? (
                                    <span className={isExpired ? "text-destructive" : ""}>
                                      {new Date(promo.expiration_date).toLocaleDateString('fr-FR')}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </td>
                                <td className="p-4">
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => togglePromoCodeActive(promo.id, promo.is_active)}
                                    >
                                      {promo.is_active ? "Désactiver" : "Activer"}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        setEditingPromoCode(promo);
                                        setPromoFormData({
                                          code: promo.code,
                                          discount_type: promo.discount_type,
                                          discount_value: promo.discount_value.toString(),
                                          minimum_purchase_amount: (promo.minimum_purchase_amount || 0).toString(),
                                          max_uses: promo.max_uses?.toString() || "",
                                          is_single_use: promo.is_single_use || false,
                                          start_date: promo.start_date || "",
                                          expiration_date: promo.expiration_date || "",
                                          description: promo.description || "",
                                          is_active: promo.is_active || true
                                        });
                                      }}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleDeletePromoCode(promo.id)}
                                    >
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>

                      {promoCodes.length === 0 && (
                        <div className="text-center py-12 text-muted-foreground">
                          <Tag className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>Aucun code promo créé</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            
            <Dialog open={bundleDialogOpen} onOpenChange={setBundleDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Gestion des lots
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Gestion des lots avec remises</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {/* Form for creating/editing bundles */}
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    try {
                      const bundleData = {
                        name: bundleFormData.name,
                        description: bundleFormData.description,
                        product_ids: bundleFormData.product_ids,
                        discount_percentage: parseFloat(bundleFormData.discount_percentage),
                        is_active: bundleFormData.is_active
                      };

                      if (editingBundle) {
                        const { error } = await supabase
                          .from('bundle_deals')
                          .update(bundleData)
                          .eq('id', editingBundle.id);
                        if (error) throw error;
                        toast({
                          title: "Lot mis à jour",
                          description: "Le lot a été modifié avec succès",
                        });
                      } else {
                        const { error } = await supabase
                          .from('bundle_deals')
                          .insert([bundleData]);
                        if (error) throw error;
                        toast({
                          title: "Lot créé",
                          description: "Le nouveau lot a été créé avec succès",
                        });
                      }

                      setBundleFormData({
                        name: "",
                        description: "",
                        product_ids: [],
                        discount_percentage: "",
                        is_active: true
                      });
                      setEditingBundle(null);
                      fetchBundles();
                    } catch (error: any) {
                      toast({
                        title: "Erreur",
                        description: error.message || "Erreur lors de la sauvegarde",
                        variant: "destructive",
                      });
                    }
                  }} className="space-y-4 p-4 border rounded-lg">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="bundle_name">Nom du lot</Label>
                        <Input
                          id="bundle_name"
                          value={bundleFormData.name}
                          onChange={(e) => setBundleFormData(prev => ({ ...prev, name: e.target.value }))}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="bundle_discount">Remise (%)</Label>
                        <Input
                          id="bundle_discount"
                          type="number"
                          min="1"
                          max="100"
                          step="0.01"
                          value={bundleFormData.discount_percentage}
                          onChange={(e) => setBundleFormData(prev => ({ ...prev, discount_percentage: e.target.value }))}
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="bundle_description">Description (optionnel)</Label>
                      <Textarea
                        id="bundle_description"
                        value={bundleFormData.description}
                        onChange={(e) => setBundleFormData(prev => ({ ...prev, description: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Produits inclus dans le lot</Label>
                      
                      {/* Search bar for products */}
                      <div className="relative mb-4">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Rechercher des produits..."
                          value={bundleProductSearch}
                          onChange={(e) => setBundleProductSearch(e.target.value)}
                          className="pl-8"
                        />
                      </div>

                      {/* Category tabs */}
                      <Tabs value={activeCategory} onValueChange={setActiveCategory} className="mb-4">
                        <TabsList className="grid w-full grid-cols-6">
                          <TabsTrigger value="tous">Tous</TabsTrigger>
                          {AVAILABLE_CATEGORIES.map((category) => (
                            <TabsTrigger key={category} value={category}>
                              {category.charAt(0).toUpperCase() + category.slice(1)}
                            </TabsTrigger>
                          ))}
                        </TabsList>
                        
                        <TabsContent value="tous" className="mt-4">
                          {renderProductList()}
                        </TabsContent>
                        
                        {AVAILABLE_CATEGORIES.map((category) => (
                          <TabsContent key={category} value={category} className="mt-4">
                            {renderProductList(category)}
                          </TabsContent>
                        ))}
                      </Tabs>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="bundle_active"
                        checked={bundleFormData.is_active}
                        onChange={(e) => setBundleFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                        className="rounded border-gray-300"
                      />
                      <Label htmlFor="bundle_active">Lot actif</Label>
                    </div>
                    <Button type="submit" className="w-full">
                      {editingBundle ? "Mettre à jour le lot" : "Créer le lot"}
                    </Button>
                  </form>

                  {/* List of existing bundles */}
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">Lots existants</h3>
                    
                    {/* Search bar for bundles */}
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Rechercher des lots..."
                        value={bundleSearch}
                        onChange={(e) => setBundleSearch(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                    
                    {filteredBundles.map((bundle) => (
                      <div key={bundle.id} className="p-3 border rounded-lg flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">{bundle.name}</h4>
                          <p className="text-sm text-muted-foreground">{bundle.description}</p>
                          <p className="text-sm">Remise: {bundle.discount_percentage}%</p>
                          <p className="text-sm">Produits: {bundle.product_ids.length}</p>
                          <p className="text-sm">Status: {bundle.is_active ? "Actif" : "Inactif"}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingBundle(bundle);
                              setBundleFormData({
                                name: bundle.name,
                                description: bundle.description || "",
                                product_ids: bundle.product_ids,
                                discount_percentage: bundle.discount_percentage.toString(),
                                is_active: bundle.is_active
                              });
                            }}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={async () => {
                              if (confirm("Supprimer ce lot ?")) {
                                try {
                                  const { error } = await supabase
                                    .from('bundle_deals')
                                    .delete()
                                    .eq('id', bundle.id);
                                  if (error) throw error;
                                  toast({
                                    title: "Lot supprimé",
                                    description: "Le lot a été supprimé avec succès",
                                  });
                                  fetchBundles();
                                } catch (error: any) {
                                  toast({
                                    title: "Erreur",
                                    description: error.message || "Erreur lors de la suppression",
                                    variant: "destructive",
                                  });
                                }
                              }
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            
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

                {/* Categories Section */}
                <div className="space-y-2">
                  <Label>Catégories</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {AVAILABLE_CATEGORIES.map((category) => (
                      <div key={category} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`category-${category}`}
                          checked={formData.categories.includes(category)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData(prev => ({
                                ...prev,
                                categories: [...prev.categories, category]
                              }));
                            } else {
                              setFormData(prev => ({
                                ...prev,
                                categories: prev.categories.filter(c => c !== category)
                              }));
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                        <Label htmlFor={`category-${category}`} className="text-sm capitalize">
                          {category}
                        </Label>
                      </div>
                    ))}
                  </div>
                  {formData.categories.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.categories.map((category, index) => (
                        <Badge key={index} variant="secondary">
                          {category}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Tags Section */}
                <div className="space-y-2">
                  <Label>Tags (optionnel)</Label>
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

                {/* Slug Field */}
                <div className="space-y-2">
                  <Label htmlFor="slug">
                    URL du produit (slug) *
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="slug"
                      value={formData.slug}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        slug: slugify(e.target.value)
                      }))}
                      placeholder="t-shirt-orydia-noir"
                      required
                      pattern="[a-z0-9-]+"
                      className="flex-1 font-mono text-sm"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const newSlug = slugify(formData.name);
                        setFormData(prev => ({ ...prev, slug: newSlug }));
                      }}
                      disabled={!formData.name}
                    >
                      Générer
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    URL : {window.location.origin}/product/{formData.slug || 'slug-du-produit'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Lettres minuscules, chiffres et tirets uniquement
                  </p>
                </div>

                {/* Related Books Section */}
                <div className="space-y-2">
                  <Label htmlFor="related_books">
                    Livres associés (pour recommandations)
                  </Label>
                  <div className="border rounded-lg p-4 bg-muted/20 max-h-64 overflow-y-auto">
                    <div className="space-y-2">
                      {books.map((book) => (
                        <div key={book.id} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`book-${book.id}`}
                            checked={formData.related_book_ids.includes(book.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData(prev => ({
                                  ...prev,
                                  related_book_ids: [...prev.related_book_ids, book.id]
                                }));
                              } else {
                                setFormData(prev => ({
                                  ...prev,
                                  related_book_ids: prev.related_book_ids.filter(id => id !== book.id)
                                }));
                              }
                            }}
                            className="rounded border-gray-300"
                          />
                          <Label 
                            htmlFor={`book-${book.id}`} 
                            className="text-sm cursor-pointer flex-1"
                          >
                            <span className="font-medium">{book.title}</span>
                            <span className="text-muted-foreground ml-2">— {book.author}</span>
                          </Label>
                        </div>
                      ))}
                    </div>
                    
                    {books.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Aucun livre disponible
                      </p>
                    )}
                  </div>
                  
                  {formData.related_book_ids.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.related_book_ids.map((bookId) => {
                        const book = books.find(b => b.id === bookId);
                        return book ? (
                          <Badge 
                            key={bookId} 
                            variant="secondary" 
                            className="cursor-pointer"
                            onClick={() => setFormData(prev => ({
                              ...prev,
                              related_book_ids: prev.related_book_ids.filter(id => id !== bookId)
                            }))}
                          >
                            {book.title} ×
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  )}
                  
                  <p className="text-xs text-muted-foreground">
                    Sélectionnez les livres dont l'univers est lié à ce produit. 
                    Les produits d'un même livre seront recommandés ensemble.
                  </p>
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
                        min="0"
                        step="0.01"
                        value={formData.sale_price}
                        onChange={(e) => setFormData({ ...formData, sale_price: e.target.value })}
                        placeholder="ex: 15.99"
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

                {/* Shop Type Section */}
                <div className="space-y-4 p-4 border border-border rounded-lg bg-muted/20">
                  <div className="space-y-2">
                    <Label htmlFor="shop_type" className="flex items-center gap-1">
                      Type de boutique <span className="text-destructive">*</span>
                    </Label>
                    <select
                      id="shop_type"
                      value={formData.shop_type}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        shop_type: e.target.value as 'internal' | 'external' 
                      }))}
                      className={`w-full rounded-md border px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        !formData.shop_type ? 'border-destructive' : 'border-input'
                      } bg-background`}
                      required
                    >
                      <option value="">-- Choisir une boutique --</option>
                      <option value="external">Oryshop (Boutique publique)</option>
                      <option value="internal">Orydia (Boutique interne)</option>
                    </select>
                    <p className="text-xs text-muted-foreground">
                      <span className="text-destructive font-semibold">Requis :</span> Oryshop = visible par tous • Orydia = boutique interne uniquement
                    </p>
                  </div>
                </div>

                {/* Availability Section */}
                <div className="space-y-4 p-4 border border-border rounded-lg bg-muted/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="is_available"
                        checked={formData.is_available}
                        onCheckedChange={(checked) => setFormData({ ...formData, is_available: checked })}
                      />
                      <Label htmlFor="is_available" className="flex items-center gap-2">
                        {formData.is_available ? (
                          <Eye className="h-4 w-4 text-green-600" />
                        ) : (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        )}
                        En vente dans la boutique
                      </Label>
                    </div>
                    {!formData.is_available && (
                      <Badge variant="secondary" className="bg-muted text-muted-foreground">
                        Masqué
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Désactivez pour masquer ce produit de la boutique sans le supprimer
                  </p>
                </div>

                <Button type="submit" className="w-full" disabled={uploadingImages}>
                  {uploadingImages ? "Upload en cours..." : (editingItem ? "Mettre à jour" : "Créer l'article")}
                </Button>
              </form>
            </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Main Tabs Navigation */}
        <Tabs defaultValue="produits" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="produits" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Produits
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="produits" className="space-y-6">
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
          </TabsContent>

          <TabsContent value="analytics">
            <MarketingAnalytics />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}