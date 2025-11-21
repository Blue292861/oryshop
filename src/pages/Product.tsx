import { useParams, useNavigate, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Helmet } from 'react-helmet-async';
import { Heart, ShoppingCart, ChevronLeft, ChevronRight, Home } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ShareButton } from '@/components/ShareButton';
import { useCart } from '@/contexts/CartContext';
import { useFavorites } from '@/contexts/FavoritesContext';
import { useToast } from '@/hooks/use-toast';

interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  additional_images?: string[];
  category: string;
  seller: string;
  tags?: string[];
  is_on_sale: boolean;
  sale_price?: number;
  is_clothing: boolean;
  available_sizes?: string[];
  slug: string;
  related_book_ids?: string[];
}

export default function Product() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<ShopItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [recommendations, setRecommendations] = useState<ShopItem[]>([]);
  
  const { addToCart } = useCart();
  const { isFavorite, addToFavorites, removeFromFavorites } = useFavorites();
  const { toast } = useToast();
  
  useEffect(() => {
    if (slug) {
      fetchProduct();
    }
  }, [slug]);
  
  const fetchProduct = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('shop_items')
        .select('*')
        .eq('slug', slug)
        .single();
      
      if (error) throw error;
      
      if (!data) {
        navigate('/shop');
        return;
      }
      
      setProduct(data);
      
      // Fetch recommendations
      if (data.tags && data.tags.length > 0) {
        const { data: recs } = await supabase
          .from('shop_items')
          .select('*')
          .neq('id', data.id)
          .contains('tags', data.tags)
          .limit(4);
        
        if (recs) setRecommendations(recs);
      }
    } catch (error: any) {
      console.error('Error fetching product:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger le produit",
        variant: "destructive",
      });
      navigate('/shop');
    } finally {
      setLoading(false);
    }
  };
  
  const handleAddToCart = () => {
    if (!product) return;
    
    if (product.is_clothing && !selectedSize) {
      toast({
        title: "Taille requise",
        description: "Veuillez sélectionner une taille",
        variant: "destructive",
      });
      return;
    }
    
    addToCart({
      ...product,
      selectedSize: product.is_clothing ? selectedSize : undefined
    });
    
    toast({
      title: "✓ Ajouté au panier",
      description: `${product.name} a été ajouté à votre panier`,
    });
  };
  
  const toggleFavorite = () => {
    if (!product) return;
    
    if (isFavorite(product.id)) {
      removeFromFavorites(product.id);
      toast({
        title: "Retiré des favoris",
        description: `${product.name} a été retiré de vos favoris`,
      });
    } else {
      addToFavorites(product.id);
      toast({
        title: "✓ Ajouté aux favoris",
        description: `${product.name} a été ajouté à vos favoris`,
      });
    }
  };
  
  const allImages = product ? [product.image_url, ...(product.additional_images || [])] : [];
  
  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % allImages.length);
  };
  
  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
  };
  
  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }
  
  if (!product) {
    return null;
  }
  
  const currentPrice = product.is_on_sale && product.sale_price ? product.sale_price : product.price;
  
  return (
    <Layout>
      <Helmet>
        <title>{product.name} - Oryshop</title>
        <meta name="description" content={product.description} />
        <meta property="og:title" content={product.name} />
        <meta property="og:description" content={product.description} />
        <meta property="og:image" content={product.image_url} />
        <meta property="og:url" content={window.location.href} />
        <meta property="og:type" content="product" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={product.name} />
        <meta name="twitter:description" content={product.description} />
        <meta name="twitter:image" content={product.image_url} />
      </Helmet>
      
      {/* Breadcrumb */}
      <nav className="text-sm text-muted-foreground mb-6 flex items-center gap-2">
        <Link to="/" className="hover:text-foreground transition-colors flex items-center gap-1">
          <Home className="h-3 w-3" />
          Accueil
        </Link>
        <span>/</span>
        <Link to="/shop" className="hover:text-foreground transition-colors">Boutique</Link>
        <span>/</span>
        <span className="text-foreground font-medium">{product.name}</span>
      </nav>
      
      {/* Product Layout */}
      <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 mb-12">
        {/* Left: Images */}
        <div className="space-y-4">
          {/* Main image */}
          <div className="relative aspect-square rounded-lg overflow-hidden bg-muted group">
            <img
              src={allImages[currentImageIndex]}
              alt={product.name}
              className="w-full h-full object-cover"
            />
            
            {allImages.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}
            
            {product.is_on_sale && (
              <Badge className="absolute top-4 left-4 bg-destructive text-destructive-foreground">
                Promo
              </Badge>
            )}
          </div>
          
          {/* Thumbnails */}
          {allImages.length > 1 && (
            <div className="grid grid-cols-5 gap-2">
              {allImages.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentImageIndex(idx)}
                  className={`aspect-square rounded-md overflow-hidden border-2 transition-all ${
                    idx === currentImageIndex 
                      ? 'border-primary ring-2 ring-primary/20' 
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <img src={img} alt={`${product.name} ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
        
        {/* Right: Product info */}
        <div className="space-y-6">
          <div>
            <div className="flex items-start justify-between gap-4 mb-2">
              <h1 className="text-3xl lg:text-4xl font-bold">{product.name}</h1>
              <ShareButton 
                url={window.location.href}
                title={product.name}
                description={product.description}
              />
            </div>
            
            <p className="text-muted-foreground text-sm mb-4">
              Vendu par <span className="font-medium text-foreground">{product.seller}</span>
            </p>
          </div>
          
          {/* Price */}
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-bold text-primary">
              {currentPrice.toFixed(2)}€
            </span>
            {product.is_on_sale && product.sale_price && (
              <span className="text-2xl text-muted-foreground line-through">
                {product.price.toFixed(2)}€
              </span>
            )}
          </div>
          
          {/* Description */}
          <div className="prose prose-sm max-w-none">
            <p className="text-foreground/80">{product.description}</p>
          </div>
          
          {/* Tags */}
          {product.tags && product.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {product.tags.map((tag, idx) => (
                <Badge key={idx} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
          
          {/* Size selector */}
          {product.is_clothing && product.available_sizes && product.available_sizes.length > 0 && (
            <div className="space-y-3">
              <label className="text-sm font-medium">Taille</label>
              <div className="flex flex-wrap gap-2">
                {product.available_sizes.map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`px-4 py-2 border rounded-md transition-all ${
                      selectedSize === size
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border hover:border-primary'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={handleAddToCart}
              size="lg"
              className="flex-1"
            >
              <ShoppingCart className="h-5 w-5 mr-2" />
              Ajouter au panier
            </Button>
            
            <Button
              onClick={toggleFavorite}
              size="lg"
              variant="outline"
              className="px-4"
            >
              <Heart
                className={`h-5 w-5 ${
                  isFavorite(product.id) ? 'fill-current text-destructive' : ''
                }`}
              />
            </Button>
          </div>
          
          {/* Product details */}
          <Card className="border-border bg-muted/30">
            <CardContent className="pt-6 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Catégorie</span>
                <span className="font-medium">{product.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Vendeur</span>
                <span className="font-medium">{product.seller}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Recommendations */}
      {recommendations.length > 0 && (
        <section className="mt-16">
          <h2 className="text-2xl font-bold mb-6">Produits similaires</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {recommendations.map((rec) => (
              <Card
                key={rec.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => navigate(`/product/${rec.slug}`)}
              >
                <CardContent className="p-4">
                  <div className="aspect-square rounded-md overflow-hidden mb-3 bg-muted">
                    <img
                      src={rec.image_url}
                      alt={rec.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h3 className="font-medium line-clamp-2 mb-2">{rec.name}</h3>
                  <p className="text-lg font-bold text-primary">
                    {(rec.is_on_sale && rec.sale_price ? rec.sale_price : rec.price).toFixed(2)}€
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </Layout>
  );
}
