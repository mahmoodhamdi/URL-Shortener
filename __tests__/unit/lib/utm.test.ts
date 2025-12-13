import { describe, it, expect } from 'vitest';
import {
  buildUtmUrl,
  parseUtmParams,
  hasUtmParams,
  stripUtmParams,
  isValidUtmValue,
  sanitizeUtmValue,
  UTM_SOURCES,
  UTM_MEDIUMS,
  UTM_TEMPLATES,
} from '@/lib/url/utm';

describe('UTM Builder', () => {
  describe('buildUtmUrl', () => {
    it('should add UTM parameters to a URL', () => {
      const result = buildUtmUrl('https://example.com', {
        utmSource: 'google',
        utmMedium: 'cpc',
        utmCampaign: 'summer_sale',
      });

      expect(result).toContain('utm_source=google');
      expect(result).toContain('utm_medium=cpc');
      expect(result).toContain('utm_campaign=summer_sale');
    });

    it('should preserve existing query parameters', () => {
      const result = buildUtmUrl('https://example.com?page=1', {
        utmSource: 'google',
      });

      expect(result).toContain('page=1');
      expect(result).toContain('utm_source=google');
    });

    it('should handle all UTM parameters', () => {
      const result = buildUtmUrl('https://example.com', {
        utmSource: 'facebook',
        utmMedium: 'social',
        utmCampaign: 'winter_promo',
        utmTerm: 'shoes',
        utmContent: 'banner_1',
      });

      expect(result).toContain('utm_source=facebook');
      expect(result).toContain('utm_medium=social');
      expect(result).toContain('utm_campaign=winter_promo');
      expect(result).toContain('utm_term=shoes');
      expect(result).toContain('utm_content=banner_1');
    });

    it('should skip undefined parameters', () => {
      const result = buildUtmUrl('https://example.com', {
        utmSource: 'google',
        utmMedium: undefined,
        utmCampaign: 'test',
      });

      expect(result).toContain('utm_source=google');
      expect(result).toContain('utm_campaign=test');
      expect(result).not.toContain('utm_medium');
    });

    it('should handle URLs with fragments', () => {
      const result = buildUtmUrl('https://example.com#section', {
        utmSource: 'email',
      });

      expect(result).toContain('utm_source=email');
    });
  });

  describe('parseUtmParams', () => {
    it('should parse UTM parameters from a URL', () => {
      const url = 'https://example.com?utm_source=google&utm_medium=cpc&utm_campaign=test';
      const params = parseUtmParams(url);

      expect(params.utmSource).toBe('google');
      expect(params.utmMedium).toBe('cpc');
      expect(params.utmCampaign).toBe('test');
    });

    it('should return empty object for URL without UTM params', () => {
      const params = parseUtmParams('https://example.com?page=1');

      expect(params.utmSource).toBeUndefined();
      expect(params.utmMedium).toBeUndefined();
    });

    it('should handle invalid URLs gracefully', () => {
      const params = parseUtmParams('not-a-valid-url');

      expect(params).toEqual({});
    });
  });

  describe('hasUtmParams', () => {
    it('should return true if URL has UTM parameters', () => {
      expect(hasUtmParams('https://example.com?utm_source=google')).toBe(true);
      expect(hasUtmParams('https://example.com?utm_campaign=test')).toBe(true);
    });

    it('should return false if URL has no UTM parameters', () => {
      expect(hasUtmParams('https://example.com')).toBe(false);
      expect(hasUtmParams('https://example.com?page=1')).toBe(false);
    });
  });

  describe('stripUtmParams', () => {
    it('should remove all UTM parameters from a URL', () => {
      const url = 'https://example.com?utm_source=google&utm_medium=cpc&page=1';
      const result = stripUtmParams(url);

      expect(result).not.toContain('utm_source');
      expect(result).not.toContain('utm_medium');
      expect(result).toContain('page=1');
    });

    it('should return clean URL when all params are UTM', () => {
      const url = 'https://example.com?utm_source=google';
      const result = stripUtmParams(url);

      expect(result).toBe('https://example.com/');
    });

    it('should handle invalid URLs', () => {
      expect(stripUtmParams('invalid')).toBe('invalid');
    });
  });

  describe('isValidUtmValue', () => {
    it('should return true for valid UTM values', () => {
      expect(isValidUtmValue('google')).toBe(true);
      expect(isValidUtmValue('facebook_ads')).toBe(true);
      expect(isValidUtmValue('email-campaign')).toBe(true);
      expect(isValidUtmValue('Campaign123')).toBe(true);
    });

    it('should return false for invalid UTM values', () => {
      expect(isValidUtmValue('has spaces')).toBe(false);
      expect(isValidUtmValue('special@char')).toBe(false);
      expect(isValidUtmValue('unicode✓')).toBe(false);
    });

    it('should return true for empty values', () => {
      expect(isValidUtmValue('')).toBe(true);
    });
  });

  describe('sanitizeUtmValue', () => {
    it('should convert to lowercase', () => {
      expect(sanitizeUtmValue('Google')).toBe('google');
      expect(sanitizeUtmValue('FACEBOOK')).toBe('facebook');
    });

    it('should replace spaces with underscores', () => {
      expect(sanitizeUtmValue('summer sale')).toBe('summer_sale');
      expect(sanitizeUtmValue('my campaign name')).toBe('my_campaign_name');
    });

    it('should remove invalid characters', () => {
      expect(sanitizeUtmValue('test@email')).toBe('testemail');
      expect(sanitizeUtmValue('campaign!#')).toBe('campaign');
    });

    it('should preserve hyphens and underscores', () => {
      expect(sanitizeUtmValue('my-campaign_2024')).toBe('my-campaign_2024');
    });
  });

  describe('UTM Constants', () => {
    it('should have common UTM sources', () => {
      expect(UTM_SOURCES).toContain('google');
      expect(UTM_SOURCES).toContain('facebook');
      expect(UTM_SOURCES).toContain('email');
      expect(UTM_SOURCES).toContain('twitter');
    });

    it('should have common UTM mediums', () => {
      expect(UTM_MEDIUMS).toContain('cpc');
      expect(UTM_MEDIUMS).toContain('email');
      expect(UTM_MEDIUMS).toContain('social');
      expect(UTM_MEDIUMS).toContain('organic');
    });

    it('should have pre-built templates', () => {
      expect(UTM_TEMPLATES.length).toBeGreaterThan(0);

      const googleAds = UTM_TEMPLATES.find((t) => t.id === 'google-ads');
      expect(googleAds).toBeDefined();
      expect(googleAds?.source).toBe('google');
      expect(googleAds?.medium).toBe('cpc');
    });
  });
});
