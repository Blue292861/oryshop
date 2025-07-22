-- Add clothing fields to shop_items table
ALTER TABLE public.shop_items 
ADD COLUMN is_clothing boolean NOT NULL DEFAULT false,
ADD COLUMN available_sizes text[] DEFAULT ARRAY[]::text[];