/**
 * UTM (Urchin Tracking Module) Builder
 * Helps create URLs with UTM parameters for campaign tracking
 */

export interface UtmParams {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
}

export interface UtmTemplate {
  id: string;
  name: string;
  source: string;
  medium: string;
  campaign?: string;
}

/**
 * Common UTM sources
 */
export const UTM_SOURCES = [
  'google',
  'facebook',
  'instagram',
  'twitter',
  'linkedin',
  'email',
  'newsletter',
  'youtube',
  'tiktok',
  'reddit',
  'pinterest',
  'bing',
  'referral',
  'direct',
] as const;

/**
 * Common UTM mediums
 */
export const UTM_MEDIUMS = [
  'cpc',         // Cost per click
  'cpm',         // Cost per mille (thousand impressions)
  'social',      // Social media
  'email',       // Email marketing
  'organic',     // Organic search
  'display',     // Display ads
  'affiliate',   // Affiliate marketing
  'referral',    // Referral traffic
  'video',       // Video ads
  'banner',      // Banner ads
  'retargeting', // Retargeting campaigns
  'paid_social', // Paid social
] as const;

/**
 * Pre-built UTM templates for common platforms
 */
export const UTM_TEMPLATES: UtmTemplate[] = [
  {
    id: 'google-ads',
    name: 'Google Ads',
    source: 'google',
    medium: 'cpc',
  },
  {
    id: 'facebook-ads',
    name: 'Facebook Ads',
    source: 'facebook',
    medium: 'paid_social',
  },
  {
    id: 'instagram-ads',
    name: 'Instagram Ads',
    source: 'instagram',
    medium: 'paid_social',
  },
  {
    id: 'twitter-ads',
    name: 'Twitter Ads',
    source: 'twitter',
    medium: 'paid_social',
  },
  {
    id: 'linkedin-ads',
    name: 'LinkedIn Ads',
    source: 'linkedin',
    medium: 'paid_social',
  },
  {
    id: 'email-newsletter',
    name: 'Email Newsletter',
    source: 'newsletter',
    medium: 'email',
  },
  {
    id: 'youtube-video',
    name: 'YouTube Video',
    source: 'youtube',
    medium: 'video',
  },
  {
    id: 'tiktok-organic',
    name: 'TikTok Organic',
    source: 'tiktok',
    medium: 'social',
  },
];

/**
 * Build a URL with UTM parameters
 */
export function buildUtmUrl(baseUrl: string, utm: UtmParams): string {
  try {
    const url = new URL(baseUrl);

    if (utm.utmSource) {
      url.searchParams.set('utm_source', utm.utmSource);
    }
    if (utm.utmMedium) {
      url.searchParams.set('utm_medium', utm.utmMedium);
    }
    if (utm.utmCampaign) {
      url.searchParams.set('utm_campaign', utm.utmCampaign);
    }
    if (utm.utmTerm) {
      url.searchParams.set('utm_term', utm.utmTerm);
    }
    if (utm.utmContent) {
      url.searchParams.set('utm_content', utm.utmContent);
    }

    return url.toString();
  } catch {
    // If URL parsing fails, append parameters manually
    const params = new URLSearchParams();

    if (utm.utmSource) params.set('utm_source', utm.utmSource);
    if (utm.utmMedium) params.set('utm_medium', utm.utmMedium);
    if (utm.utmCampaign) params.set('utm_campaign', utm.utmCampaign);
    if (utm.utmTerm) params.set('utm_term', utm.utmTerm);
    if (utm.utmContent) params.set('utm_content', utm.utmContent);

    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}${params.toString()}`;
  }
}

/**
 * Parse UTM parameters from a URL
 */
export function parseUtmParams(url: string): UtmParams {
  try {
    const parsedUrl = new URL(url);
    return {
      utmSource: parsedUrl.searchParams.get('utm_source') || undefined,
      utmMedium: parsedUrl.searchParams.get('utm_medium') || undefined,
      utmCampaign: parsedUrl.searchParams.get('utm_campaign') || undefined,
      utmTerm: parsedUrl.searchParams.get('utm_term') || undefined,
      utmContent: parsedUrl.searchParams.get('utm_content') || undefined,
    };
  } catch {
    return {};
  }
}

/**
 * Check if URL has any UTM parameters
 */
export function hasUtmParams(url: string): boolean {
  const params = parseUtmParams(url);
  return !!(
    params.utmSource ||
    params.utmMedium ||
    params.utmCampaign ||
    params.utmTerm ||
    params.utmContent
  );
}

/**
 * Remove UTM parameters from a URL
 */
export function stripUtmParams(url: string): string {
  try {
    const parsedUrl = new URL(url);
    parsedUrl.searchParams.delete('utm_source');
    parsedUrl.searchParams.delete('utm_medium');
    parsedUrl.searchParams.delete('utm_campaign');
    parsedUrl.searchParams.delete('utm_term');
    parsedUrl.searchParams.delete('utm_content');
    return parsedUrl.toString();
  } catch {
    return url;
  }
}

/**
 * Validate UTM parameter value (alphanumeric, hyphens, underscores)
 */
export function isValidUtmValue(value: string): boolean {
  if (!value) return true;
  return /^[a-zA-Z0-9_-]+$/.test(value);
}

/**
 * Sanitize UTM value for URL safety
 */
export function sanitizeUtmValue(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_-]/g, '');
}
