-- Add tags and is_temporary columns to shop_items table
ALTER TABLE public.shop_items 
ADD COLUMN tags text[] DEFAULT '{}',
ADD COLUMN is_temporary boolean DEFAULT false;