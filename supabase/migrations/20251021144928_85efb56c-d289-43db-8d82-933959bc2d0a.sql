-- Create user_favorites table
CREATE TABLE public.user_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id uuid NOT NULL,
  added_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, item_id)
);

-- Create indexes for performance
CREATE INDEX idx_user_favorites_user_id ON public.user_favorites(user_id);
CREATE INDEX idx_user_favorites_added_at ON public.user_favorites(user_id, added_at DESC);

-- Enable RLS
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own favorites"
  ON public.user_favorites FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add their own favorites"
  ON public.user_favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorites"
  ON public.user_favorites FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all favorites"
  ON public.user_favorites FOR ALL
  USING (user_has_role(auth.uid(), 'admin'::app_role));

-- Trigger function to cleanup favorites when shop item is deleted
CREATE OR REPLACE FUNCTION public.cleanup_favorites_on_item_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.user_favorites WHERE item_id = OLD.id;
  RETURN OLD;
END;
$$;

-- Trigger to automatically remove favorites when shop item is deleted
CREATE TRIGGER cleanup_favorites_trigger
AFTER DELETE ON public.shop_items
FOR EACH ROW
EXECUTE FUNCTION public.cleanup_favorites_on_item_delete();