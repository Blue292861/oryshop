-- Add is_available column to shop_items
ALTER TABLE public.shop_items 
ADD COLUMN is_available BOOLEAN DEFAULT true NOT NULL;

-- Add comment
COMMENT ON COLUMN public.shop_items.is_available IS 
'Contrôle si le produit est visible dans la boutique. TRUE = en vente, FALSE = masqué';

-- Create index for fast filtering
CREATE INDEX idx_shop_items_is_available ON public.shop_items(is_available);

-- Add order_number column to orders
ALTER TABLE public.orders 
ADD COLUMN order_number TEXT;

-- Create sequence for order numbers
CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1000;

-- Generate order numbers for existing orders
UPDATE public.orders 
SET order_number = 'ORY-' || LPAD(nextval('order_number_seq')::TEXT, 6, '0')
WHERE order_number IS NULL;

-- Make order_number NOT NULL and UNIQUE
ALTER TABLE public.orders 
ALTER COLUMN order_number SET NOT NULL;

ALTER TABLE public.orders 
ADD CONSTRAINT orders_order_number_unique UNIQUE (order_number);

-- Create index for search
CREATE INDEX idx_orders_order_number ON public.orders(order_number);

-- Create trigger function to auto-generate order number on INSERT
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_number IS NULL THEN
    NEW.order_number := 'ORY-' || LPAD(nextval('order_number_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger
CREATE TRIGGER trigger_generate_order_number
BEFORE INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION generate_order_number();