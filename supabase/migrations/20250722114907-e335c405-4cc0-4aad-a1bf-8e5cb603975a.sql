-- Create storage bucket for product images
INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true);

-- Add additional_images column to shop_items table
ALTER TABLE public.shop_items 
ADD COLUMN additional_images text[] DEFAULT ARRAY[]::text[];

-- Create storage policies for product images
CREATE POLICY "Product images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'product-images');

CREATE POLICY "Admins can upload product images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'product-images' AND user_has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update product images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'product-images' AND user_has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete product images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'product-images' AND user_has_role(auth.uid(), 'admin'::app_role));