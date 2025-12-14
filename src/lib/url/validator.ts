import { z } from 'zod';

// Maximum URL length (2048 is standard browser limit)
export const MAX_URL_LENGTH = 2048;

export const urlSchema = z
  .string()
  .url('Invalid URL format')
  .min(1, 'URL is required')
  .max(MAX_URL_LENGTH, `URL must be less than ${MAX_URL_LENGTH} characters`);

export const aliasSchema = z
  .string()
  .min(3, 'Alias must be at least 3 characters')
  .max(50, 'Alias must be less than 50 characters')
  .regex(/^[a-zA-Z0-9-]+$/, 'Alias can only contain letters, numbers, and hyphens')
  .optional();

export const createLinkSchema = z.object({
  url: urlSchema,
  customAlias: aliasSchema,
  password: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
  title: z.string().max(200).optional(),
  description: z.string().max(500).optional(),
});

export const updateLinkSchema = z.object({
  originalUrl: urlSchema.optional(),
  customAlias: aliasSchema,
  password: z.string().optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
  title: z.string().max(200).optional(),
  description: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
  isFavorite: z.boolean().optional(),
});

export const bulkUrlsSchema = z.object({
  urls: z.array(urlSchema).min(1, 'At least one URL is required').max(100, 'Maximum 100 URLs allowed'),
});

export function isValidUrl(url: string): boolean {
  try {
    urlSchema.parse(url);
    return true;
  } catch {
    return false;
  }
}

export function isValidAlias(alias: string): boolean {
  try {
    aliasSchema.parse(alias);
    return true;
  } catch {
    return false;
  }
}

export function normalizeUrl(url: string): string {
  let normalized = url.trim();

  // Add protocol if missing
  if (!/^https?:\/\//i.test(normalized)) {
    normalized = 'https://' + normalized;
  }

  return normalized;
}

export interface UrlValidationResult {
  isValid: boolean;
  error?: string;
}

export function validateUrl(url: string): UrlValidationResult {
  try {
    urlSchema.parse(url);
    return { isValid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { isValid: false, error: error.errors[0].message };
    }
    return { isValid: false, error: 'Invalid URL' };
  }
}

export interface AliasValidationResult {
  isValid: boolean;
  error?: string;
}

export function validateAlias(alias: string): AliasValidationResult {
  try {
    aliasSchema.parse(alias);
    return { isValid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { isValid: false, error: error.errors[0].message };
    }
    return { isValid: false, error: 'Invalid alias' };
  }
}
