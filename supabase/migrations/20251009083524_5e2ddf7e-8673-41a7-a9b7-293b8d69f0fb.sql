-- Create a SECURITY DEFINER function to insert orders
-- This bypasses RLS policies and ensures orders can always be created from the edge function
CREATE OR REPLACE FUNCTION public.create_pending_order(
  p_user_id uuid,
  p_item_id text,
  p_item_name text,
  p_price numeric
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id uuid;
BEGIN
  -- Validate inputs
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'user_id cannot be null';
  END IF;
  
  IF p_item_id IS NULL OR p_item_name IS NULL THEN
    RAISE EXCEPTION 'item_id and item_name are required';
  END IF;
  
  IF p_price IS NULL OR p_price <= 0 THEN
    RAISE EXCEPTION 'price must be greater than 0';
  END IF;
  
  -- Insert the order
  INSERT INTO public.orders (
    user_id,
    item_id,
    item_name,
    price,
    status,
    created_at
  ) VALUES (
    p_user_id,
    p_item_id,
    p_item_name,
    p_price,
    'pending',
    now()
  )
  RETURNING id INTO v_order_id;
  
  -- Log the order creation for audit
  PERFORM log_security_event(
    'order_created',
    p_user_id,
    jsonb_build_object(
      'order_id', v_order_id,
      'item_id', p_item_id,
      'price', p_price,
      'source', 'create_pending_order_function'
    )
  );
  
  RETURN v_order_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_pending_order TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_pending_order TO service_role;