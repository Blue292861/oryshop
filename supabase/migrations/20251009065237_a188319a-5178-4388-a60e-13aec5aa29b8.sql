-- Add RLS policy to allow users to create their own pending orders
CREATE POLICY "Users can create their own pending orders"
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id 
  AND status = 'pending'
);