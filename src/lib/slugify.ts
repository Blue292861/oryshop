import { supabase } from '@/integrations/supabase/client';

/**
 * Génère un slug URL-friendly à partir d'un texte
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD') // Décomposer les caractères accentués
    .replace(/[\u0300-\u036f]/g, '') // Supprimer les accents
    .replace(/[^a-z0-9\s-]/g, '') // Garder uniquement alphanumériques, espaces, tirets
    .trim()
    .replace(/\s+/g, '-') // Remplacer espaces par tirets
    .replace(/-+/g, '-'); // Supprimer tirets multiples
}

/**
 * Génère un slug unique en ajoutant un identifiant court
 */
export function generateUniqueSlug(name: string, id: string): string {
  const baseSlug = slugify(name);
  const shortId = id.substring(0, 8);
  return `${baseSlug}-${shortId}`;
}

/**
 * Vérifie si un slug existe déjà (en excluant optionnellement un ID)
 */
export async function isSlugAvailable(slug: string, excludeId?: string): Promise<boolean> {
  let query = supabase
    .from('shop_items')
    .select('id')
    .eq('slug', slug);
  
  if (excludeId) {
    query = query.neq('id', excludeId);
  }
  
  const { data } = await query.maybeSingle();
  
  return !data;
}

/**
 * Génère un slug garanti unique
 */
export async function generateAvailableSlug(name: string, id: string, excludeId?: string): Promise<string> {
  let slug = generateUniqueSlug(name, id);
  let counter = 1;
  
  while (!(await isSlugAvailable(slug, excludeId))) {
    slug = `${generateUniqueSlug(name, id)}-${counter}`;
    counter++;
  }
  
  return slug;
}
