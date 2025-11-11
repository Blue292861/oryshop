-- Create promo_codes table
CREATE TABLE public.promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC NOT NULL CHECK (discount_value > 0),
  
  -- Usage conditions
  minimum_purchase_amount NUMERIC DEFAULT 0,
  max_uses INTEGER, -- NULL = unlimited
  current_uses INTEGER DEFAULT 0,
  is_single_use BOOLEAN DEFAULT false,
  
  -- Dates
  start_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expiration_date TIMESTAMP WITH TIME ZONE,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  description TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create promo_code_redemptions table
CREATE TABLE public.promo_code_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id UUID REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  order_id TEXT,
  discount_applied NUMERIC NOT NULL,
  redeemed_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add related_book_ids column to shop_items
ALTER TABLE public.shop_items 
ADD COLUMN related_book_ids UUID[] DEFAULT ARRAY[]::UUID[];

COMMENT ON COLUMN public.shop_items.related_book_ids IS 
'IDs des livres associés à ce produit dérivé (pour recommandations)';

-- RLS Policies for promo_codes
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage promo codes"
ON public.promo_codes
FOR ALL
TO authenticated
USING (user_has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (user_has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view active valid promo codes"
ON public.promo_codes
FOR SELECT
TO authenticated
USING (
  is_active = true 
  AND (start_date IS NULL OR start_date <= now())
  AND (expiration_date IS NULL OR expiration_date > now())
);

-- RLS Policies for promo_code_redemptions
ALTER TABLE public.promo_code_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all redemptions"
ON public.promo_code_redemptions
FOR SELECT
TO authenticated
USING (user_has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own redemptions"
ON public.promo_code_redemptions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "System can insert redemptions"
ON public.promo_code_redemptions
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create index for faster code lookups
CREATE INDEX idx_promo_codes_code ON public.promo_codes(code);
CREATE INDEX idx_promo_codes_active ON public.promo_codes(is_active) WHERE is_active = true;