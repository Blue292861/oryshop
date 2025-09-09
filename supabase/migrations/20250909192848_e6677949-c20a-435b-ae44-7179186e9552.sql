-- Fix the reset function to avoid DELETE without WHERE clause error
CREATE OR REPLACE FUNCTION public.reset_revenue_and_orders()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Vérifier que l'utilisateur est admin
  IF NOT user_has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Seuls les administrateurs peuvent reset les données';
  END IF;
  
  -- Supprimer toutes les commandes avec WHERE true pour éviter l'erreur
  DELETE FROM public.orders WHERE true;
  
  -- Supprimer tous les discounts appliqués avec WHERE true pour éviter l'erreur
  DELETE FROM public.applied_discounts WHERE true;
  
  -- Logger l'action
  PERFORM log_admin_action(
    'revenue_and_orders_reset',
    auth.uid(),
    jsonb_build_object(
      'timestamp', now(),
      'admin_id', auth.uid()
    )
  );
END;
$function$