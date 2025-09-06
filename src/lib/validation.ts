import { z } from 'zod';

// Auth validation schemas
export const signUpSchema = z.object({
  email: z.string().email('Adresse email invalide').min(1, 'Email requis'),
  password: z.string()
    .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
    .regex(/[A-Z]/, 'Le mot de passe doit contenir au moins une majuscule')
    .regex(/[a-z]/, 'Le mot de passe doit contenir au moins une minuscule')
    .regex(/[0-9]/, 'Le mot de passe doit contenir au moins un chiffre'),
  username: z.string()
    .min(3, 'Le nom d\'utilisateur doit contenir au moins 3 caractères')
    .max(50, 'Le nom d\'utilisateur ne peut pas dépasser 50 caractères')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Le nom d\'utilisateur ne peut contenir que des lettres, chiffres, tirets et underscores'),
  firstName: z.string()
    .min(1, 'Prénom requis')
    .max(100, 'Le prénom ne peut pas dépasser 100 caractères')
    .regex(/^[a-zA-ZÀ-ÿ\s-']+$/, 'Le prénom ne peut contenir que des lettres, espaces, tirets et apostrophes'),
  lastName: z.string()
    .min(1, 'Nom requis')
    .max(100, 'Le nom ne peut pas dépasser 100 caractères')
    .regex(/^[a-zA-ZÀ-ÿ\s-']+$/, 'Le nom ne peut contenir que des lettres, espaces, tirets et apostrophes'),
  streetAddress: z.string()
    .min(1, 'Adresse requise')
    .max(200, 'L\'adresse ne peut pas dépasser 200 caractères'),
  city: z.string()
    .min(1, 'Ville requise')
    .max(100, 'La ville ne peut pas dépasser 100 caractères')
    .regex(/^[a-zA-ZÀ-ÿ\s-']+$/, 'La ville ne peut contenir que des lettres, espaces, tirets et apostrophes'),
  postalCode: z.string()
    .min(1, 'Code postal requis')
    .max(20, 'Le code postal ne peut pas dépasser 20 caractères')
    .regex(/^[0-9A-Za-z\s-]+$/, 'Code postal invalide'),
  country: z.string()
    .min(1, 'Pays requis')
    .max(100, 'Le pays ne peut pas dépasser 100 caractères')
    .regex(/^[a-zA-ZÀ-ÿ\s-']+$/, 'Le pays ne peut contenir que des lettres, espaces, tirets et apostrophes'),
});

export const signInSchema = z.object({
  email: z.string().email('Adresse email invalide').min(1, 'Email requis'),
  password: z.string().min(1, 'Mot de passe requis'),
});

// Profile validation schemas
export const profileUpdateSchema = z.object({
  username: z.string()
    .min(3, 'Le nom d\'utilisateur doit contenir au moins 3 caractères')
    .max(50, 'Le nom d\'utilisateur ne peut pas dépasser 50 caractères')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Le nom d\'utilisateur ne peut contenir que des lettres, chiffres, tirets et underscores')
    .optional(),
  firstName: z.string()
    .min(1, 'Prénom requis')
    .max(100, 'Le prénom ne peut pas dépasser 100 caractères')
    .regex(/^[a-zA-ZÀ-ÿ\s-']+$/, 'Le prénom ne peut contenir que des lettres, espaces, tirets et apostrophes')
    .optional(),
  lastName: z.string()
    .min(1, 'Nom requis')
    .max(100, 'Le nom ne peut pas dépasser 100 caractères')
    .regex(/^[a-zA-ZÀ-ÿ\s-']+$/, 'Le nom ne peut contenir que des lettres, espaces, tirets et apostrophes')
    .optional(),
  address: z.string()
    .min(1, 'Adresse requise')
    .max(200, 'L\'adresse ne peut pas dépasser 200 caractères')
    .optional(),
  city: z.string()
    .min(1, 'Ville requise')
    .max(100, 'La ville ne peut pas dépasser 100 caractères')
    .regex(/^[a-zA-ZÀ-ÿ\s-']+$/, 'La ville ne peut contenir que des lettres, espaces, tirets et apostrophes')
    .optional(),
  country: z.string()
    .min(1, 'Pays requis')
    .max(100, 'Le pays ne peut pas dépasser 100 caractères')
    .regex(/^[a-zA-ZÀ-ÿ\s-']+$/, 'Le pays ne peut contenir que des lettres, espaces, tirets et apostrophes')
    .optional(),
});

// Admin validation schemas
export const adminUserActionSchema = z.object({
  userId: z.string().uuid('ID utilisateur invalide'),
  action: z.enum(['grant_premium', 'revoke_premium', 'ban_user', 'unban_user']),
  duration: z.number().min(1).max(60).optional(), // For premium months
});

// Input sanitization utilities
export const sanitizeString = (input: string): string => {
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
};

export const sanitizeObject = (obj: Record<string, any>): Record<string, any> => {
  const sanitized: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
};

// CSRF token utilities
export const generateCSRFToken = (): string => {
  return crypto.randomUUID();
};

export const validateCSRFToken = (token: string, storedToken: string): boolean => {
  return token === storedToken && token.length > 0;
};