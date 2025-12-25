-- ===================================
-- SYSTÈME DE CARTES CADEAUX
-- ===================================

-- Table des cartes cadeaux
CREATE TABLE public.gift_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  initial_amount NUMERIC NOT NULL CHECK (initial_amount > 0),
  current_balance NUMERIC NOT NULL CHECK (current_balance >= 0),
  purchaser_id UUID REFERENCES auth.users(id),
  purchaser_email TEXT,
  recipient_email TEXT,
  recipient_name TEXT,
  personal_message TEXT,
  is_active BOOLEAN DEFAULT true NOT NULL,
  stripe_payment_id TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Table des transactions de cartes cadeaux
CREATE TABLE public.gift_card_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gift_card_id UUID REFERENCES public.gift_cards(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  order_id TEXT,
  amount_used NUMERIC NOT NULL,
  balance_before NUMERIC NOT NULL,
  balance_after NUMERIC NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('purchase', 'redemption', 'refund')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Index pour recherche rapide
CREATE INDEX idx_gift_cards_code ON public.gift_cards(code);
CREATE INDEX idx_gift_cards_purchaser ON public.gift_cards(purchaser_id);
CREATE INDEX idx_gift_cards_active ON public.gift_cards(is_active);
CREATE INDEX idx_gift_card_transactions_card ON public.gift_card_transactions(gift_card_id);
CREATE INDEX idx_gift_card_transactions_user ON public.gift_card_transactions(user_id);

-- Fonction pour générer un code unique
CREATE OR REPLACE FUNCTION generate_gift_card_code()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code TEXT;
  i INTEGER;
  code_exists BOOLEAN := true;
BEGIN
  WHILE code_exists LOOP
    code := 'GIFT-';
    FOR i IN 1..4 LOOP
      code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    code := code || '-';
    FOR i IN 1..4 LOOP
      code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    
    SELECT EXISTS(SELECT 1 FROM public.gift_cards WHERE gift_cards.code = code) INTO code_exists;
  END LOOP;
  
  RETURN code;
END;
$$;

-- Fonction pour créer une carte cadeau (appelée par edge function)
CREATE OR REPLACE FUNCTION create_gift_card(
  p_amount NUMERIC,
  p_purchaser_id UUID,
  p_purchaser_email TEXT,
  p_recipient_email TEXT DEFAULT NULL,
  p_recipient_name TEXT DEFAULT NULL,
  p_personal_message TEXT DEFAULT NULL,
  p_stripe_payment_id TEXT DEFAULT NULL
)
RETURNS TABLE(id UUID, code TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT;
  v_id UUID;
  v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Générer le code unique
  v_code := generate_gift_card_code();
  
  -- Expiration dans 1 an
  v_expires_at := now() + INTERVAL '1 year';
  
  -- Créer la carte cadeau
  INSERT INTO public.gift_cards (
    code,
    initial_amount,
    current_balance,
    purchaser_id,
    purchaser_email,
    recipient_email,
    recipient_name,
    personal_message,
    stripe_payment_id,
    expires_at
  ) VALUES (
    v_code,
    p_amount,
    p_amount,
    p_purchaser_id,
    p_purchaser_email,
    p_recipient_email,
    p_recipient_name,
    p_personal_message,
    p_stripe_payment_id,
    v_expires_at
  )
  RETURNING gift_cards.id INTO v_id;
  
  -- Enregistrer la transaction d'achat
  INSERT INTO public.gift_card_transactions (
    gift_card_id,
    user_id,
    amount_used,
    balance_before,
    balance_after,
    transaction_type
  ) VALUES (
    v_id,
    p_purchaser_id,
    p_amount,
    0,
    p_amount,
    'purchase'
  );
  
  RETURN QUERY SELECT v_id, v_code;
END;
$$;

-- Fonction pour utiliser une carte cadeau
CREATE OR REPLACE FUNCTION use_gift_card(
  p_code TEXT,
  p_user_id UUID,
  p_amount NUMERIC,
  p_order_id TEXT
)
RETURNS TABLE(success BOOLEAN, message TEXT, amount_used NUMERIC, remaining_balance NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gift_card RECORD;
  v_actual_amount NUMERIC;
BEGIN
  -- Récupérer la carte cadeau
  SELECT * INTO v_gift_card
  FROM public.gift_cards gc
  WHERE gc.code = upper(p_code)
  FOR UPDATE;
  
  -- Vérifications
  IF v_gift_card IS NULL THEN
    RETURN QUERY SELECT false, 'Code carte cadeau invalide'::TEXT, 0::NUMERIC, 0::NUMERIC;
    RETURN;
  END IF;
  
  IF NOT v_gift_card.is_active THEN
    RETURN QUERY SELECT false, 'Cette carte cadeau est désactivée'::TEXT, 0::NUMERIC, 0::NUMERIC;
    RETURN;
  END IF;
  
  IF v_gift_card.expires_at IS NOT NULL AND v_gift_card.expires_at < now() THEN
    RETURN QUERY SELECT false, 'Cette carte cadeau a expiré'::TEXT, 0::NUMERIC, 0::NUMERIC;
    RETURN;
  END IF;
  
  IF v_gift_card.current_balance <= 0 THEN
    RETURN QUERY SELECT false, 'Cette carte cadeau est épuisée'::TEXT, 0::NUMERIC, 0::NUMERIC;
    RETURN;
  END IF;
  
  -- Calculer le montant à utiliser (minimum entre solde et montant demandé)
  v_actual_amount := LEAST(v_gift_card.current_balance, p_amount);
  
  -- Mettre à jour le solde
  UPDATE public.gift_cards
  SET 
    current_balance = current_balance - v_actual_amount,
    updated_at = now()
  WHERE id = v_gift_card.id;
  
  -- Enregistrer la transaction
  INSERT INTO public.gift_card_transactions (
    gift_card_id,
    user_id,
    order_id,
    amount_used,
    balance_before,
    balance_after,
    transaction_type
  ) VALUES (
    v_gift_card.id,
    p_user_id,
    p_order_id,
    v_actual_amount,
    v_gift_card.current_balance,
    v_gift_card.current_balance - v_actual_amount,
    'redemption'
  );
  
  RETURN QUERY SELECT 
    true, 
    'Carte cadeau appliquée avec succès'::TEXT, 
    v_actual_amount,
    v_gift_card.current_balance - v_actual_amount;
END;
$$;

-- Fonction pour valider une carte cadeau (sans la débiter)
CREATE OR REPLACE FUNCTION validate_gift_card(p_code TEXT)
RETURNS TABLE(
  is_valid BOOLEAN,
  message TEXT,
  gift_card_id UUID,
  current_balance NUMERIC,
  expires_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gift_card RECORD;
BEGIN
  SELECT * INTO v_gift_card
  FROM public.gift_cards gc
  WHERE gc.code = upper(p_code);
  
  IF v_gift_card IS NULL THEN
    RETURN QUERY SELECT false, 'Code carte cadeau invalide'::TEXT, NULL::UUID, 0::NUMERIC, NULL::TIMESTAMP WITH TIME ZONE;
    RETURN;
  END IF;
  
  IF NOT v_gift_card.is_active THEN
    RETURN QUERY SELECT false, 'Cette carte cadeau est désactivée'::TEXT, NULL::UUID, 0::NUMERIC, NULL::TIMESTAMP WITH TIME ZONE;
    RETURN;
  END IF;
  
  IF v_gift_card.expires_at IS NOT NULL AND v_gift_card.expires_at < now() THEN
    RETURN QUERY SELECT false, 'Cette carte cadeau a expiré'::TEXT, NULL::UUID, 0::NUMERIC, NULL::TIMESTAMP WITH TIME ZONE;
    RETURN;
  END IF;
  
  IF v_gift_card.current_balance <= 0 THEN
    RETURN QUERY SELECT false, 'Cette carte cadeau est épuisée'::TEXT, NULL::UUID, 0::NUMERIC, NULL::TIMESTAMP WITH TIME ZONE;
    RETURN;
  END IF;
  
  RETURN QUERY SELECT 
    true, 
    'Carte cadeau valide'::TEXT,
    v_gift_card.id,
    v_gift_card.current_balance,
    v_gift_card.expires_at;
END;
$$;

-- Enable RLS
ALTER TABLE public.gift_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_card_transactions ENABLE ROW LEVEL SECURITY;

-- Policies pour gift_cards
CREATE POLICY "Users can view their purchased gift cards"
  ON public.gift_cards
  FOR SELECT
  USING (auth.uid() = purchaser_id);

CREATE POLICY "System can manage gift cards"
  ON public.gift_cards
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can manage all gift cards"
  ON public.gift_cards
  FOR ALL
  USING (user_has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (user_has_role(auth.uid(), 'admin'::app_role));

-- Policies pour gift_card_transactions
CREATE POLICY "Users can view their gift card transactions"
  ON public.gift_card_transactions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert gift card transactions"
  ON public.gift_card_transactions
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view all gift card transactions"
  ON public.gift_card_transactions
  FOR SELECT
  USING (user_has_role(auth.uid(), 'admin'::app_role));

-- Trigger pour updated_at
CREATE TRIGGER update_gift_cards_updated_at
  BEFORE UPDATE ON public.gift_cards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();