-- Create function for instant purchases (temporary items)
CREATE OR REPLACE FUNCTION public.create_instant_order(
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
  v_user_id uuid;
  v_order_id uuid;
BEGIN
  -- Get the authenticated user ID
  v_user_id := auth.uid();
  
  -- Verify user is authenticated
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;
  
  -- Validate inputs
  IF p_item_id IS NULL OR p_item_name IS NULL OR p_price IS NULL THEN
    RAISE EXCEPTION 'All parameters are required';
  END IF;
  
  IF p_price < 0 THEN
    RAISE EXCEPTION 'Price must be positive';
  END IF;
  
  -- Create the order with completed status
  INSERT INTO public.orders (user_id, item_id, item_name, price, status)
  VALUES (v_user_id, p_item_id, p_item_name, p_price, 'completed')
  RETURNING id INTO v_order_id;
  
  -- Log the order creation
  PERFORM log_security_event(
    'instant_order_created',
    v_user_id,
    jsonb_build_object(
      'order_id', v_order_id,
      'item_id', p_item_id,
      'price', p_price
    )
  );
  
  RETURN v_order_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_instant_order TO authenticated;