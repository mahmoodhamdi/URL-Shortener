import { describe, it, expect } from 'vitest';
import { validateWebhookUrl } from '@/lib/zapier/dispatcher';

describe('Zapier Dispatcher', () => {
  describe('validateWebhookUrl', () => {
    it('should accept valid Zapier webhook URLs', () => {
      const result = validateWebhookUrl('https://hooks.zapier.com/hooks/catch/123/abc');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept valid Zapier dev webhook URLs', () => {
      const result = validateWebhookUrl('https://hooks.zapier.dev/hooks/catch/123/abc');
      expect(result.valid).toBe(true);
    });

    it('should accept other HTTPS URLs', () => {
      const result = validateWebhookUrl('https://example.com/webhook');
      expect(result.valid).toBe(true);
    });

    it('should reject HTTP URLs', () => {
      const result = validateWebhookUrl('http://hooks.zapier.com/hooks/catch/123/abc');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('HTTPS');
    });

    it('should reject invalid URL format', () => {
      const result = validateWebhookUrl('not-a-url');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid URL');
    });

    it('should reject empty URL', () => {
      const result = validateWebhookUrl('');
      expect(result.valid).toBe(false);
    });

    it('should handle URL with encoded spaces', () => {
      // URLs with spaces are URL-encoded by the browser, so they become valid
      const result = validateWebhookUrl('https://example.com/webhook%20with%20spaces');
      expect(result.valid).toBe(true);
    });

    it('should accept HTTPS URLs with various paths', () => {
      const urls = [
        'https://api.example.com/webhooks/zapier',
        'https://webhooks.myapp.io/v1/receive',
        'https://example.com:8443/webhook',
        'https://sub.domain.example.com/path',
      ];

      urls.forEach((url) => {
        const result = validateWebhookUrl(url);
        expect(result.valid).toBe(true);
      });
    });

    it('should reject file URLs', () => {
      const result = validateWebhookUrl('file:///etc/passwd');
      expect(result.valid).toBe(false);
    });

    it('should reject javascript URLs', () => {
      const result = validateWebhookUrl('javascript:alert(1)');
      expect(result.valid).toBe(false);
    });
  });
});
