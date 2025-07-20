-- Add sale functionality to shop_items table
ALTER TABLE public.shop_items 
ADD COLUMN is_on_sale boolean NOT NULL DEFAULT false,
ADD COLUMN sale_price integer NULL;

-- Add validation to ensure sale_price is less than original price when on sale
CREATE OR REPLACE FUNCTION validate_sale_price()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_on_sale = true AND (NEW.sale_price IS NULL OR NEW.sale_price >= NEW.price) THEN
    RAISE EXCEPTION 'Le prix soldé doit être inférieur au prix original';
  END IF;
  
  IF NEW.is_on_sale = false THEN
    NEW.sale_price = NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_sale_price_trigger
  BEFORE INSERT OR UPDATE ON public.shop_items
  FOR EACH ROW
  EXECUTE FUNCTION validate_sale_price();