import { describe, it, expect } from 'vitest';
import {
  generateFacebookPixel,
  generateGoogleAnalytics,
  generateGoogleAds,
  generateTwitterPixel,
  generateLinkedInPixel,
  generateTikTokPixel,
  escapePixelId,
  validatePixelId,
  generatePixelScript,
  generateAllPixelScripts,
  getPixelTypeName,
  getPixelTypeIcon,
  PixelType,
} from '@/lib/retargeting/pixels';

describe('Retargeting Pixels', () => {
  describe('escapePixelId', () => {
    it('should escape HTML special characters', () => {
      expect(escapePixelId('<script>')).toBe('&lt;script&gt;');
      expect(escapePixelId('"test"')).toBe('&quot;test&quot;');
      expect(escapePixelId("'test'")).toBe('&#x27;test&#x27;');
      expect(escapePixelId('test&value')).toBe('test&amp;value');
      expect(escapePixelId('test/path')).toBe('test&#x2F;path');
    });

    it('should not escape normal characters', () => {
      expect(escapePixelId('1234567890123456')).toBe('1234567890123456');
      expect(escapePixelId('G-ABC1234567')).toBe('G-ABC1234567');
    });
  });

  describe('validatePixelId', () => {
    describe('FACEBOOK', () => {
      it('should accept valid 15-digit Facebook pixel ID', () => {
        const result = validatePixelId('FACEBOOK', '123456789012345');
        expect(result.valid).toBe(true);
      });

      it('should accept valid 16-digit Facebook pixel ID', () => {
        const result = validatePixelId('FACEBOOK', '1234567890123456');
        expect(result.valid).toBe(true);
      });

      it('should reject invalid Facebook pixel ID', () => {
        expect(validatePixelId('FACEBOOK', '12345').valid).toBe(false);
        expect(validatePixelId('FACEBOOK', 'abc123').valid).toBe(false);
        expect(validatePixelId('FACEBOOK', '').valid).toBe(false);
      });
    });

    describe('GOOGLE_ANALYTICS', () => {
      it('should accept valid GA4 measurement ID', () => {
        expect(validatePixelId('GOOGLE_ANALYTICS', 'G-ABC1234567').valid).toBe(true);
        expect(validatePixelId('GOOGLE_ANALYTICS', 'G-1234567890').valid).toBe(true);
      });

      it('should reject invalid GA4 ID', () => {
        expect(validatePixelId('GOOGLE_ANALYTICS', 'UA-12345').valid).toBe(false);
        expect(validatePixelId('GOOGLE_ANALYTICS', 'ABC1234567').valid).toBe(false);
        expect(validatePixelId('GOOGLE_ANALYTICS', 'G-ABC').valid).toBe(false);
      });
    });

    describe('GOOGLE_ADS', () => {
      it('should accept valid Google Ads conversion ID', () => {
        expect(validatePixelId('GOOGLE_ADS', 'AW-1234567890').valid).toBe(true);
        expect(validatePixelId('GOOGLE_ADS', 'AW-12345678901').valid).toBe(true);
      });

      it('should reject invalid Google Ads ID', () => {
        expect(validatePixelId('GOOGLE_ADS', 'AW-123').valid).toBe(false);
        expect(validatePixelId('GOOGLE_ADS', '1234567890').valid).toBe(false);
      });
    });

    describe('TWITTER', () => {
      it('should accept valid Twitter pixel ID', () => {
        expect(validatePixelId('TWITTER', 'abc12').valid).toBe(true);
        expect(validatePixelId('TWITTER', 'abcdefghij').valid).toBe(true);
      });

      it('should reject invalid Twitter pixel ID', () => {
        expect(validatePixelId('TWITTER', 'abc').valid).toBe(false);
        expect(validatePixelId('TWITTER', 'abcdefghijk').valid).toBe(false);
      });
    });

    describe('LINKEDIN', () => {
      it('should accept valid LinkedIn partner ID', () => {
        expect(validatePixelId('LINKEDIN', '123456').valid).toBe(true);
        expect(validatePixelId('LINKEDIN', '1234567').valid).toBe(true);
      });

      it('should reject invalid LinkedIn partner ID', () => {
        expect(validatePixelId('LINKEDIN', '12345').valid).toBe(false);
        expect(validatePixelId('LINKEDIN', '12345678').valid).toBe(false);
        expect(validatePixelId('LINKEDIN', 'abc123').valid).toBe(false);
      });
    });

    describe('TIKTOK', () => {
      it('should accept valid TikTok pixel ID', () => {
        expect(validatePixelId('TIKTOK', 'ABCDEF123456789').valid).toBe(true);
        expect(validatePixelId('TIKTOK', 'ABC123DEF456GHI789JKL012MNO').valid).toBe(true);
      });

      it('should reject invalid TikTok pixel ID', () => {
        expect(validatePixelId('TIKTOK', 'ABC123').valid).toBe(false);
        expect(validatePixelId('TIKTOK', 'a'.repeat(31)).valid).toBe(false);
      });
    });

    describe('CUSTOM', () => {
      it('should accept custom script with 10+ characters', () => {
        expect(validatePixelId('CUSTOM', 'console.log("test")').valid).toBe(true);
        expect(validatePixelId('CUSTOM', '<script>test</script>').valid).toBe(true);
      });

      it('should reject custom script with less than 10 characters', () => {
        expect(validatePixelId('CUSTOM', 'short').valid).toBe(false);
      });
    });

    it('should reject empty pixel ID', () => {
      const types: PixelType[] = ['FACEBOOK', 'GOOGLE_ANALYTICS', 'GOOGLE_ADS', 'TWITTER', 'LINKEDIN', 'TIKTOK', 'CUSTOM'];
      types.forEach(type => {
        expect(validatePixelId(type, '').valid).toBe(false);
        expect(validatePixelId(type, '   ').valid).toBe(false);
      });
    });
  });

  describe('generateFacebookPixel', () => {
    it('should generate valid Facebook pixel script', () => {
      const script = generateFacebookPixel('1234567890123456');
      expect(script).toContain('fbq(\'init\', \'1234567890123456\')');
      expect(script).toContain('fbevents.js');
      expect(script).toContain('PageView');
      expect(script).toContain('<noscript>');
    });

    it('should escape pixel ID in script', () => {
      const script = generateFacebookPixel('<script>alert(1)</script>');
      // The escaped pixel ID should appear in the fbq init call
      expect(script).toContain("fbq('init', '&lt;script&gt;alert(1)&lt;&#x2F;script&gt;')");
    });
  });

  describe('generateGoogleAnalytics', () => {
    it('should generate valid GA4 script', () => {
      const script = generateGoogleAnalytics('G-ABC1234567');
      expect(script).toContain('gtag/js?id=G-ABC1234567');
      expect(script).toContain('gtag(\'config\', \'G-ABC1234567\')');
      expect(script).toContain('googletagmanager.com');
    });
  });

  describe('generateGoogleAds', () => {
    it('should generate valid Google Ads script', () => {
      const script = generateGoogleAds('AW-1234567890');
      expect(script).toContain('gtag/js?id=AW-1234567890');
      expect(script).toContain('gtag(\'config\', \'AW-1234567890\')');
    });
  });

  describe('generateTwitterPixel', () => {
    it('should generate valid Twitter pixel script', () => {
      const script = generateTwitterPixel('abc12');
      expect(script).toContain('twq(\'config\',\'abc12\')');
      expect(script).toContain('ads-twitter.com');
    });
  });

  describe('generateLinkedInPixel', () => {
    it('should generate valid LinkedIn Insight Tag script', () => {
      const script = generateLinkedInPixel('123456');
      expect(script).toContain('_linkedin_partner_id = "123456"');
      expect(script).toContain('licdn.com');
      expect(script).toContain('<noscript>');
    });
  });

  describe('generateTikTokPixel', () => {
    it('should generate valid TikTok pixel script', () => {
      const script = generateTikTokPixel('ABCDEF123456789');
      expect(script).toContain('ttq.load(\'ABCDEF123456789\')');
      expect(script).toContain('analytics.tiktok.com');
      expect(script).toContain('ttq.page()');
    });
  });

  describe('generatePixelScript', () => {
    it('should generate correct script for each type', () => {
      expect(generatePixelScript({ type: 'FACEBOOK', pixelId: '1234567890123456' }))
        .toContain('fbq');

      expect(generatePixelScript({ type: 'GOOGLE_ANALYTICS', pixelId: 'G-ABC1234567' }))
        .toContain('gtag');

      expect(generatePixelScript({ type: 'GOOGLE_ADS', pixelId: 'AW-1234567890' }))
        .toContain('gtag');

      expect(generatePixelScript({ type: 'TWITTER', pixelId: 'abc12' }))
        .toContain('twq');

      expect(generatePixelScript({ type: 'LINKEDIN', pixelId: '123456' }))
        .toContain('linkedin');

      expect(generatePixelScript({ type: 'TIKTOK', pixelId: 'ABCDEF123456789' }))
        .toContain('ttq');
    });

    it('should return pixelId for CUSTOM type', () => {
      const customScript = '<script>custom tracking</script>';
      expect(generatePixelScript({ type: 'CUSTOM', pixelId: customScript }))
        .toBe(customScript);
    });

    it('should return customScript if provided for CUSTOM type', () => {
      const customScript = '<script>override</script>';
      expect(generatePixelScript({ type: 'CUSTOM', pixelId: 'ignored', customScript }))
        .toBe(customScript);
    });
  });

  describe('generateAllPixelScripts', () => {
    it('should generate all scripts combined', () => {
      const pixels = [
        { type: 'FACEBOOK' as PixelType, pixelId: '1234567890123456' },
        { type: 'GOOGLE_ANALYTICS' as PixelType, pixelId: 'G-ABC1234567' },
      ];

      const combined = generateAllPixelScripts(pixels);

      expect(combined).toContain('fbq');
      expect(combined).toContain('gtag');
    });

    it('should return empty string for empty array', () => {
      expect(generateAllPixelScripts([])).toBe('');
    });
  });

  describe('getPixelTypeName', () => {
    it('should return correct display names', () => {
      expect(getPixelTypeName('FACEBOOK')).toBe('Meta (Facebook) Pixel');
      expect(getPixelTypeName('GOOGLE_ANALYTICS')).toBe('Google Analytics 4');
      expect(getPixelTypeName('GOOGLE_ADS')).toBe('Google Ads');
      expect(getPixelTypeName('TWITTER')).toBe('X (Twitter) Pixel');
      expect(getPixelTypeName('LINKEDIN')).toBe('LinkedIn Insight Tag');
      expect(getPixelTypeName('TIKTOK')).toBe('TikTok Pixel');
      expect(getPixelTypeName('CUSTOM')).toBe('Custom Script');
    });
  });

  describe('getPixelTypeIcon', () => {
    it('should return correct icon names', () => {
      expect(getPixelTypeIcon('FACEBOOK')).toBe('facebook');
      expect(getPixelTypeIcon('GOOGLE_ANALYTICS')).toBe('bar-chart');
      expect(getPixelTypeIcon('GOOGLE_ADS')).toBe('google');
      expect(getPixelTypeIcon('TWITTER')).toBe('twitter');
      expect(getPixelTypeIcon('LINKEDIN')).toBe('linkedin');
      expect(getPixelTypeIcon('TIKTOK')).toBe('music');
      expect(getPixelTypeIcon('CUSTOM')).toBe('code');
    });
  });
});
