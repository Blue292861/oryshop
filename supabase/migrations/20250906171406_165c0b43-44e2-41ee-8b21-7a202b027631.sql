-- Modifier le type de prix dans shop_items pour supporter les décimales
ALTER TABLE public.shop_items 
ALTER COLUMN price TYPE NUMERIC(10,2),
ALTER COLUMN sale_price TYPE NUMERIC(10,2);

-- Modifier le type de prix dans orders pour supporter les décimales
ALTER TABLE public.orders 
ALTER COLUMN price TYPE NUMERIC(10,2);

-- Mettre à jour le trigger de validation des prix soldés pour les nouveaux types
CREATE OR REPLACE FUNCTION public.validate_sale_price()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.is_on_sale = true AND (NEW.sale_price IS NULL OR NEW.sale_price >= NEW.price) THEN
    RAISE EXCEPTION 'Le prix soldé doit être inférieur au prix original';
  END IF;
  
  IF NEW.is_on_sale = false THEN
    NEW.sale_price = NULL;
  END IF;
  
  RETURN NEW;
END;
$function$;