-- Modifier la table shop_items pour utiliser des catégories multiples
ALTER TABLE public.shop_items ADD COLUMN categories TEXT[] DEFAULT '{}';

-- Créer la table pour les lots/packs avec remises
CREATE TABLE public.bundle_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  product_ids TEXT[] NOT NULL, -- IDs des produits inclus dans le lot
  discount_percentage DECIMAL(5,2) NOT NULL CHECK (discount_percentage > 0 AND discount_percentage <= 100),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on bundle_deals
ALTER TABLE public.bundle_deals ENABLE ROW LEVEL SECURITY;

-- Créer les politiques RLS pour bundle_deals
CREATE POLICY "Admins can manage bundle deals" 
ON public.bundle_deals 
FOR ALL 
USING (user_has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view active bundle deals" 
ON public.bundle_deals 
FOR SELECT 
USING (is_active = true);

-- Créer la table pour tracker les remises appliquées
CREATE TABLE public.applied_discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT NOT NULL,
  bundle_deal_id UUID REFERENCES public.bundle_deals(id) ON DELETE CASCADE,
  discount_amount DECIMAL(10,2) NOT NULL,
  applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on applied_discounts
ALTER TABLE public.applied_discounts ENABLE ROW LEVEL SECURITY;

-- Créer les politiques RLS pour applied_discounts
CREATE POLICY "Admins can manage applied discounts" 
ON public.applied_discounts 
FOR ALL 
USING (user_has_role(auth.uid(), 'admin'::app_role));

-- Créer un trigger pour mettre à jour updated_at
CREATE TRIGGER update_bundle_deals_updated_at
  BEFORE UPDATE ON public.bundle_deals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Créer des fonctions pour reset les données
CREATE OR REPLACE FUNCTION public.reset_revenue_and_orders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Vérifier que l'utilisateur est admin
  IF NOT user_has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Seuls les administrateurs peuvent reset les données';
  END IF;
  
  -- Supprimer toutes les commandes
  DELETE FROM public.orders;
  
  -- Supprimer tous les discounts appliqués
  DELETE FROM public.applied_discounts;
  
  -- Logger l'action
  PERFORM log_admin_action(
    'revenue_and_orders_reset',
    auth.uid(),
    jsonb_build_object(
      'timestamp', now(),
      'admin_id', auth.uid()
    )
  );
END;
$$;