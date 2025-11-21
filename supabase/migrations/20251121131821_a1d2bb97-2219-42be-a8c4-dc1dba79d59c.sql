-- Ajouter la colonne slug pour URLs uniques des produits
ALTER TABLE public.shop_items 
ADD COLUMN slug TEXT;

-- Créer un index pour optimiser les recherches par slug
CREATE INDEX idx_shop_items_slug ON public.shop_items(slug);

-- Générer des slugs pour les produits existants
UPDATE public.shop_items 
SET slug = LOWER(
  REGEXP_REPLACE(
    REGEXP_REPLACE(
      TRANSLATE(
        name,
        'àáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞŸ',
        'aaaaaaaceeeeiiiidnoooooouuuuybyyAAAAAAAACEEEEIIIIDNOOOOOOUUUUYBY'
      ),
      '[^a-z0-9\s-]', '', 'gi'
    ),
    '\s+', '-', 'g'
  ) || '-' || SUBSTRING(id::TEXT, 1, 8)
)
WHERE slug IS NULL;

-- Ajouter la contrainte UNIQUE après génération des slugs
ALTER TABLE public.shop_items 
ADD CONSTRAINT shop_items_slug_unique UNIQUE (slug);

-- Rendre slug NOT NULL après génération
ALTER TABLE public.shop_items 
ALTER COLUMN slug SET NOT NULL;

-- Ajouter un commentaire pour documentation
COMMENT ON COLUMN public.shop_items.slug IS 
'URL-friendly unique identifier for the product (e.g., "t-shirt-orydia-12abc34d"). Used for SEO and shareable product links.';