import { describe, it, expect } from 'vitest';
import {
  validateDeepLinkConfig,
  generateIOSDeepLinkPage,
  generateAndroidDeepLinkPage,
  generateDesktopFallbackPage,
  getDeepLinkContentType,
} from '@/lib/deeplink/templates';
import type { DeepLinkConfig, DeepLinkPageOptions } from '@/lib/deeplink/templates';

describe('Deep Link Templates', () => {
  describe('validateDeepLinkConfig', () => {
    describe('Basic validation', () => {
      it('should reject null config', () => {
        const result = validateDeepLinkConfig(null);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('required');
      });

      it('should reject undefined config', () => {
        const result = validateDeepLinkConfig(undefined);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('required');
      });

      it('should reject non-object config', () => {
        const result = validateDeepLinkConfig('string');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('required');
      });

      it('should reject config without fallbackUrl', () => {
        const result = validateDeepLinkConfig({});
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Fallback URL');
      });

      it('should reject non-string fallbackUrl', () => {
        const result = validateDeepLinkConfig({ fallbackUrl: 123 });
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Fallback URL');
      });

      it('should reject invalid fallbackUrl', () => {
        const result = validateDeepLinkConfig({ fallbackUrl: 'not-a-url' });
        expect(result.valid).toBe(false);
        expect(result.error).toContain('not a valid URL');
      });

      it('should accept valid minimal config', () => {
        const result = validateDeepLinkConfig({ fallbackUrl: 'https://example.com' });
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    describe('SSRF protection', () => {
      it('should reject localhost fallback URL', () => {
        const result = validateDeepLinkConfig({ fallbackUrl: 'http://localhost/page' });
        expect(result.valid).toBe(false);
        expect(result.error).toContain('not safe');
      });

      it('should reject 127.0.0.1 fallback URL', () => {
        const result = validateDeepLinkConfig({ fallbackUrl: 'http://127.0.0.1/page' });
        expect(result.valid).toBe(false);
        expect(result.error).toContain('not safe');
      });

      it('should reject private IP fallback URLs', () => {
        expect(validateDeepLinkConfig({ fallbackUrl: 'http://192.168.1.1/page' }).valid).toBe(false);
        expect(validateDeepLinkConfig({ fallbackUrl: 'http://10.0.0.1/page' }).valid).toBe(false);
        expect(validateDeepLinkConfig({ fallbackUrl: 'http://172.16.0.1/page' }).valid).toBe(false);
      });

      it('should reject cloud metadata endpoint URLs', () => {
        const result = validateDeepLinkConfig({ fallbackUrl: 'http://169.254.169.254/latest/meta-data/' });
        expect(result.valid).toBe(false);
        expect(result.error).toContain('not safe');
      });

      it('should reject internal hostnames', () => {
        expect(validateDeepLinkConfig({ fallbackUrl: 'http://internal/page' }).valid).toBe(false);
        expect(validateDeepLinkConfig({ fallbackUrl: 'http://intranet/page' }).valid).toBe(false);
        expect(validateDeepLinkConfig({ fallbackUrl: 'http://server.local/page' }).valid).toBe(false);
      });

      it('should reject file:// protocol', () => {
        const result = validateDeepLinkConfig({ fallbackUrl: 'file:///etc/passwd' });
        expect(result.valid).toBe(false);
        expect(result.error).toContain('not safe');
      });

      it('should reject URLs with credentials', () => {
        const result = validateDeepLinkConfig({ fallbackUrl: 'http://user:pass@example.com/page' });
        expect(result.valid).toBe(false);
        expect(result.error).toContain('not safe');
      });

      it('should reject non-standard ports', () => {
        const result = validateDeepLinkConfig({ fallbackUrl: 'http://example.com:22/page' });
        expect(result.valid).toBe(false);
        expect(result.error).toContain('not safe');
      });

      it('should allow public URLs', () => {
        expect(validateDeepLinkConfig({ fallbackUrl: 'https://example.com' }).valid).toBe(true);
        expect(validateDeepLinkConfig({ fallbackUrl: 'https://api.stripe.com/webhook' }).valid).toBe(true);
        expect(validateDeepLinkConfig({ fallbackUrl: 'http://example.com:8080/page' }).valid).toBe(true);
      });
    });

    describe('iOS config validation', () => {
      it('should accept valid iOS config', () => {
        const result = validateDeepLinkConfig({
          fallbackUrl: 'https://example.com',
          ios: {
            scheme: 'myapp://',
            appStoreUrl: 'https://apps.apple.com/app/myapp/id123456789',
          },
        });
        expect(result.valid).toBe(true);
      });

      it('should reject invalid iOS App Store URL', () => {
        const result = validateDeepLinkConfig({
          fallbackUrl: 'https://example.com',
          ios: {
            appStoreUrl: 'not-a-url',
          },
        });
        expect(result.valid).toBe(false);
        expect(result.error).toContain('iOS App Store URL');
      });

      it('should reject non-Apple iOS App Store URL', () => {
        const result = validateDeepLinkConfig({
          fallbackUrl: 'https://example.com',
          ios: {
            appStoreUrl: 'https://example.com/app',
          },
        });
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Apple URL');
      });

      it('should accept iOS config without appStoreUrl', () => {
        const result = validateDeepLinkConfig({
          fallbackUrl: 'https://example.com',
          ios: {
            scheme: 'myapp://',
          },
        });
        expect(result.valid).toBe(true);
      });
    });

    describe('Android config validation', () => {
      it('should accept valid Android config', () => {
        const result = validateDeepLinkConfig({
          fallbackUrl: 'https://example.com',
          android: {
            scheme: 'myapp://',
            package: 'com.example.myapp',
            playStoreUrl: 'https://play.google.com/store/apps/details?id=com.example.myapp',
          },
        });
        expect(result.valid).toBe(true);
      });

      it('should reject invalid Android Play Store URL', () => {
        const result = validateDeepLinkConfig({
          fallbackUrl: 'https://example.com',
          android: {
            playStoreUrl: 'not-a-url',
          },
        });
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Android Play Store URL');
      });

      it('should reject non-Google Play Android URL', () => {
        const result = validateDeepLinkConfig({
          fallbackUrl: 'https://example.com',
          android: {
            playStoreUrl: 'https://example.com/app',
          },
        });
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Google Play URL');
      });

      it('should accept Android config without playStoreUrl', () => {
        const result = validateDeepLinkConfig({
          fallbackUrl: 'https://example.com',
          android: {
            scheme: 'myapp://',
            package: 'com.example.myapp',
          },
        });
        expect(result.valid).toBe(true);
      });
    });

    describe('Wait time validation', () => {
      it('should accept valid wait time', () => {
        const result = validateDeepLinkConfig({
          fallbackUrl: 'https://example.com',
          waitTime: 3000,
        });
        expect(result.valid).toBe(true);
      });

      it('should accept zero wait time', () => {
        const result = validateDeepLinkConfig({
          fallbackUrl: 'https://example.com',
          waitTime: 0,
        });
        expect(result.valid).toBe(true);
      });

      it('should accept maximum wait time', () => {
        const result = validateDeepLinkConfig({
          fallbackUrl: 'https://example.com',
          waitTime: 10000,
        });
        expect(result.valid).toBe(true);
      });

      it('should reject negative wait time', () => {
        const result = validateDeepLinkConfig({
          fallbackUrl: 'https://example.com',
          waitTime: -100,
        });
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Wait time');
      });

      it('should reject wait time over 10000ms', () => {
        const result = validateDeepLinkConfig({
          fallbackUrl: 'https://example.com',
          waitTime: 15000,
        });
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Wait time');
      });

      it('should reject non-number wait time', () => {
        const result = validateDeepLinkConfig({
          fallbackUrl: 'https://example.com',
          waitTime: '3000',
        });
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Wait time');
      });
    });

    describe('Complete config validation', () => {
      it('should accept complete valid config', () => {
        const result = validateDeepLinkConfig({
          fallbackUrl: 'https://example.com',
          ios: {
            scheme: 'myapp://',
            universalLink: 'https://myapp.com',
            appStoreId: '123456789',
            appStoreUrl: 'https://apps.apple.com/app/myapp/id123456789',
          },
          android: {
            scheme: 'myapp://',
            package: 'com.example.myapp',
            playStoreUrl: 'https://play.google.com/store/apps/details?id=com.example.myapp',
          },
          waitTime: 2500,
        });
        expect(result.valid).toBe(true);
      });
    });
  });

  describe('generateIOSDeepLinkPage', () => {
    const baseConfig: DeepLinkConfig = {
      fallbackUrl: 'https://example.com',
      ios: {
        scheme: 'myapp://',
        appStoreUrl: 'https://apps.apple.com/app/myapp/id123456789',
      },
    };

    it('should generate valid HTML', () => {
      const html = generateIOSDeepLinkPage({ config: baseConfig });
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('</html>');
    });

    it('should include the title', () => {
      const html = generateIOSDeepLinkPage({
        config: baseConfig,
        title: 'My Custom Title',
      });
      expect(html).toContain('<title>My Custom Title</title>');
    });

    it('should use default title if not provided', () => {
      const html = generateIOSDeepLinkPage({ config: baseConfig });
      expect(html).toContain('<title>Redirecting...</title>');
    });

    it('should include fallback URL', () => {
      const html = generateIOSDeepLinkPage({ config: baseConfig });
      // URL gets HTML escaped (/ becomes &#x2F;)
      expect(html).toContain('example.com');
      expect(html).toContain('fallbackUrl');
    });

    it('should include scheme in JavaScript', () => {
      const html = generateIOSDeepLinkPage({ config: baseConfig });
      // Scheme gets HTML escaped
      expect(html).toContain('var scheme =');
      expect(html).toContain('myapp');
    });

    it('should include App Store URL', () => {
      const html = generateIOSDeepLinkPage({ config: baseConfig });
      // App Store URL gets HTML escaped
      expect(html).toContain('apps.apple.com');
      expect(html).toContain('appStoreUrl');
    });

    it('should include path if provided', () => {
      const html = generateIOSDeepLinkPage({
        config: baseConfig,
        path: '/deep/path',
      });
      // Path gets HTML escaped
      expect(html).toContain('var path =');
      expect(html).toContain('deep');
    });

    it('should use empty path by default', () => {
      const html = generateIOSDeepLinkPage({ config: baseConfig });
      expect(html).toContain("var path = ''");
    });

    it('should include wait time in JavaScript', () => {
      const html = generateIOSDeepLinkPage({
        config: { ...baseConfig, waitTime: 5000 },
      });
      expect(html).toContain('var waitTime = 5000');
    });

    it('should use default wait time of 2500ms', () => {
      const html = generateIOSDeepLinkPage({ config: baseConfig });
      expect(html).toContain('var waitTime = 2500');
    });

    it('should include meta robots noindex', () => {
      const html = generateIOSDeepLinkPage({ config: baseConfig });
      expect(html).toContain('noindex, nofollow');
    });

    it('should include fallback link in body', () => {
      const html = generateIOSDeepLinkPage({ config: baseConfig });
      expect(html).toContain('Continue to website');
      expect(html).toContain('class="fallback-link"');
      expect(html).toContain('example.com');
    });

    it('should escape HTML special characters in title', () => {
      const html = generateIOSDeepLinkPage({
        config: baseConfig,
        title: '<script>alert("xss")</script>',
      });
      expect(html).not.toContain('<script>alert("xss")</script>');
      expect(html).toContain('&lt;script&gt;');
    });

    it('should handle config without iOS section', () => {
      const html = generateIOSDeepLinkPage({
        config: { fallbackUrl: 'https://example.com' },
      });
      expect(html).toContain("var scheme = ''");
      expect(html).toContain("var appStoreUrl = ''");
    });
  });

  describe('generateAndroidDeepLinkPage', () => {
    const baseConfig: DeepLinkConfig = {
      fallbackUrl: 'https://example.com',
      android: {
        scheme: 'myapp://',
        package: 'com.example.myapp',
        playStoreUrl: 'https://play.google.com/store/apps/details?id=com.example.myapp',
      },
    };

    it('should generate valid HTML', () => {
      const html = generateAndroidDeepLinkPage({ config: baseConfig });
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('</html>');
    });

    it('should include the title', () => {
      const html = generateAndroidDeepLinkPage({
        config: baseConfig,
        title: 'My Custom Title',
      });
      expect(html).toContain('<title>My Custom Title</title>');
    });

    it('should include fallback URL', () => {
      const html = generateAndroidDeepLinkPage({ config: baseConfig });
      // URL gets HTML escaped
      expect(html).toContain('example.com');
      expect(html).toContain('fallbackUrl');
    });

    it('should include scheme in JavaScript', () => {
      const html = generateAndroidDeepLinkPage({ config: baseConfig });
      // Scheme gets HTML escaped
      expect(html).toContain('var scheme =');
      expect(html).toContain('myapp');
    });

    it('should include Play Store URL', () => {
      const html = generateAndroidDeepLinkPage({ config: baseConfig });
      // Play Store URL gets HTML escaped
      expect(html).toContain('play.google.com');
      expect(html).toContain('playStoreUrl');
    });

    it('should include Android intent URL when package is provided', () => {
      const html = generateAndroidDeepLinkPage({ config: baseConfig });
      expect(html).toContain('intent://');
      expect(html).toContain('package=com.example.myapp');
    });

    it('should not include intent URL when package is not provided', () => {
      const html = generateAndroidDeepLinkPage({
        config: {
          fallbackUrl: 'https://example.com',
          android: {
            scheme: 'myapp://',
          },
        },
      });
      expect(html).toContain("var intentUrl = ''");
    });

    it('should include path if provided', () => {
      const html = generateAndroidDeepLinkPage({
        config: baseConfig,
        path: '/deep/path',
      });
      // Path gets HTML escaped
      expect(html).toContain('deep');
      expect(html).toContain('path');
    });

    it('should include wait time in JavaScript', () => {
      const html = generateAndroidDeepLinkPage({
        config: { ...baseConfig, waitTime: 5000 },
      });
      expect(html).toContain('var waitTime = 5000');
    });

    it('should include meta robots noindex', () => {
      const html = generateAndroidDeepLinkPage({ config: baseConfig });
      expect(html).toContain('noindex, nofollow');
    });

    it('should have green gradient background (Android theme)', () => {
      const html = generateAndroidDeepLinkPage({ config: baseConfig });
      expect(html).toContain('#11998e');
      expect(html).toContain('#38ef7d');
    });

    it('should escape HTML special characters', () => {
      const html = generateAndroidDeepLinkPage({
        config: baseConfig,
        title: '<script>alert("xss")</script>',
      });
      expect(html).not.toContain('<script>alert("xss")</script>');
      expect(html).toContain('&lt;script&gt;');
    });

    it('should handle config without Android section', () => {
      const html = generateAndroidDeepLinkPage({
        config: { fallbackUrl: 'https://example.com' },
      });
      expect(html).toContain("var scheme = ''");
      expect(html).toContain("var playStoreUrl = ''");
    });
  });

  describe('generateDesktopFallbackPage', () => {
    const baseConfig: DeepLinkConfig = {
      fallbackUrl: 'https://example.com',
    };

    it('should generate valid HTML', () => {
      const html = generateDesktopFallbackPage({ config: baseConfig });
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('</html>');
    });

    it('should include meta refresh redirect', () => {
      const html = generateDesktopFallbackPage({ config: baseConfig });
      expect(html).toContain('meta http-equiv="refresh"');
      expect(html).toContain('content="0;url=');
      expect(html).toContain('example.com');
    });

    it('should include JavaScript redirect', () => {
      const html = generateDesktopFallbackPage({ config: baseConfig });
      expect(html).toContain('window.location.href =');
      expect(html).toContain('example.com');
    });

    it('should include fallback link in body', () => {
      const html = generateDesktopFallbackPage({ config: baseConfig });
      expect(html).toContain('Click here if not redirected');
      expect(html).toContain('example.com');
    });

    it('should include the title', () => {
      const html = generateDesktopFallbackPage({
        config: baseConfig,
        title: 'Custom Redirect Title',
      });
      expect(html).toContain('<title>Custom Redirect Title</title>');
    });

    it('should use default title if not provided', () => {
      const html = generateDesktopFallbackPage({ config: baseConfig });
      expect(html).toContain('<title>Redirecting...</title>');
    });

    it('should include meta robots noindex', () => {
      const html = generateDesktopFallbackPage({ config: baseConfig });
      expect(html).toContain('noindex, nofollow');
    });

    it('should escape HTML special characters in fallback URL', () => {
      const html = generateDesktopFallbackPage({
        config: { fallbackUrl: 'https://example.com?foo=bar&baz=qux' },
      });
      expect(html).toContain('&amp;');
    });

    it('should escape HTML special characters in title', () => {
      const html = generateDesktopFallbackPage({
        config: baseConfig,
        title: '<script>alert("xss")</script>',
      });
      expect(html).not.toContain('<script>alert("xss")</script>');
    });
  });

  describe('getDeepLinkContentType', () => {
    it('should return correct content type', () => {
      const contentType = getDeepLinkContentType();
      expect(contentType).toBe('text/html; charset=utf-8');
    });
  });
});
