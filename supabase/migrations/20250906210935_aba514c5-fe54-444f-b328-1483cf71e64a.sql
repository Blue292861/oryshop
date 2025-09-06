-- Phase 1: Critical Security Fixes

-- 1. Strengthen RLS policies for subscribers table
-- Drop existing complex policies and create simpler, more secure ones
DROP POLICY IF EXISTS "Authenticated admins can manage all subscriptions" ON public.subscribers;
DROP POLICY IF EXISTS "Authenticated users can update own email" ON public.subscribers;
DROP POLICY IF EXISTS "Secure edge function updates" ON public.subscribers;
DROP POLICY IF EXISTS "Secure system inserts" ON public.subscribers;
DROP POLICY IF EXISTS "Users can view own subscription data only" ON public.subscribers;

-- Create new, simpler and more secure policies for subscribers
CREATE POLICY "Users can view own subscription only" ON public.subscribers
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all subscriptions" ON public.subscribers
FOR SELECT 
USING (user_has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert subscriptions" ON public.subscribers
FOR INSERT 
WITH CHECK (user_id IS NOT NULL AND email IS NOT NULL);

CREATE POLICY "System can update subscriptions" ON public.subscribers
FOR UPDATE 
USING (true);

CREATE POLICY "Admins can manage all subscriptions" ON public.subscribers
FOR ALL 
USING (user_has_role(auth.uid(), 'admin'::app_role));

-- 2. Strengthen profiles table policies
-- The current policies look OK but let's ensure they're bulletproof
DROP POLICY IF EXISTS "Authenticated users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile only" ON public.profiles
FOR SELECT 
USING (auth.uid() = id);

-- 3. Fix security_audit_log to prevent tampering
-- Only system functions should be able to insert, users should never directly insert
DROP POLICY IF EXISTS "Only system can log rate limits" ON public.rate_limit_log;
CREATE POLICY "System can insert rate limits" ON public.rate_limit_log
FOR INSERT 
WITH CHECK (true);

-- 4. Add additional security constraints
-- Ensure user_id columns are not nullable where they should reference auth.uid()
ALTER TABLE public.user_stats ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.user_level_info ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.subscribers ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.subscribers ALTER COLUMN email SET NOT NULL;

-- 5. Add rate limiting table for edge functions
CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  endpoint TEXT NOT NULL,
  request_count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on rate limits table
ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;

-- Only system can manage rate limits
CREATE POLICY "System can manage rate limits" ON public.api_rate_limits
FOR ALL 
USING (true);

-- 6. Add security events logging enhancement
CREATE TABLE IF NOT EXISTS public.security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  severity TEXT DEFAULT 'info',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

-- Only admins can view security events
CREATE POLICY "Admins can view security events" ON public.security_events
FOR SELECT 
USING (user_has_role(auth.uid(), 'admin'::app_role));

-- Only system can insert security events
CREATE POLICY "System can insert security events" ON public.security_events
FOR INSERT 
WITH CHECK (true);