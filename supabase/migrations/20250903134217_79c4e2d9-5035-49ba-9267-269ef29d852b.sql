-- Fix security issues in RLS policies for subscribers, orders, and api_keys tables

-- =====================================================
-- 1. SUBSCRIBERS TABLE - Enhanced Security Policies
-- =====================================================

-- Drop existing policies to recreate them with stronger restrictions
DROP POLICY IF EXISTS "select_own_subscription" ON public.subscribers;
DROP POLICY IF EXISTS "Users can insert their own subscription" ON public.subscribers; 
DROP POLICY IF EXISTS "Users can update their own subscription" ON public.subscribers;
DROP POLICY IF EXISTS "Admins can manage all subscriptions" ON public.subscribers;

-- Create new, more secure policies that require authentication
CREATE POLICY "Users can view their own subscription only"
ON public.subscribers
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscription only"
ON public.subscribers  
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription only"
ON public.subscribers
FOR UPDATE  
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add explicit DELETE policy (restricted to admins only for data protection)
CREATE POLICY "Only admins can delete subscriptions"
ON public.subscribers
FOR DELETE
TO authenticated
USING (user_has_role(auth.uid(), 'admin'::app_role));

-- Admin policy with authentication requirement
CREATE POLICY "Admins can manage all subscriptions"
ON public.subscribers
FOR ALL
TO authenticated  
USING (user_has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (user_has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- 2. ORDERS TABLE - Enhanced Security Policies  
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can create their own orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can manage all orders" ON public.orders;

-- Create new, more secure policies
CREATE POLICY "Users can view their own orders only"
ON public.orders
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own orders only"
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Add UPDATE policy for order status changes
CREATE POLICY "Users can update their own orders only"
ON public.orders
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add explicit DELETE policy (restricted to admins only)
CREATE POLICY "Only admins can delete orders"
ON public.orders
FOR DELETE
TO authenticated
USING (user_has_role(auth.uid(), 'admin'::app_role));

-- Admin policy with authentication requirement
CREATE POLICY "Admins can manage all orders"
ON public.orders
FOR ALL
TO authenticated
USING (user_has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (user_has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- 3. API_KEYS TABLE - Enhanced Security Policies
-- =====================================================

-- Drop existing policy
DROP POLICY IF EXISTS "Admins can manage API keys" ON public.api_keys;

-- Create new, more restrictive policy (API keys should be admin-only)
CREATE POLICY "Only admins can manage API keys"
ON public.api_keys
FOR ALL
TO authenticated
USING (user_has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (user_has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- 4. Additional Security Measures
-- =====================================================

-- Add row-level security enforcement comments for documentation
COMMENT ON TABLE public.subscribers IS 'Contains sensitive user email and Stripe data. Access restricted to authenticated users only.';
COMMENT ON TABLE public.orders IS 'Contains sensitive payment and purchase data. Access restricted to authenticated users only.';  
COMMENT ON TABLE public.api_keys IS 'Contains sensitive API credentials. Access restricted to admin users only.';

-- Ensure RLS is enabled (should already be enabled but double-check)
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;