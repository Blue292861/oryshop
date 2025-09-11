-- Allow public read access to shop items for unauthenticated users
CREATE POLICY "Public users can view shop items" 
ON public.shop_items 
FOR SELECT 
TO anon
USING (true);

-- Also allow public access to bundle deals for cart calculations
CREATE POLICY "Public users can view bundle deals" 
ON public.bundle_deals 
FOR SELECT 
TO anon
USING (is_active = true);