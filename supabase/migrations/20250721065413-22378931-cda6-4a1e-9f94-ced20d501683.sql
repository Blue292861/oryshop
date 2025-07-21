-- Add product_id field to shop_items table
ALTER TABLE public.shop_items 
ADD COLUMN product_id TEXT;