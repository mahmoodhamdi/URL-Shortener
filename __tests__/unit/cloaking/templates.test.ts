import { describe, it, expect } from 'vitest';
import {
  escapeHtml,
  generateIframePage,
  generateJavaScriptPage,
  generateMetaRefreshPage,
  generateCloakedPage,
  getCloakedPageContentType,
  getCloakingTypeName,
  getCloakingTypeDescription,
} from '@/lib/cloaking/templates';

describe('Cloaking Templates', () => {
  describe('escapeHtml', () => {
    it('should escape HTML special characters', () => {
      expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
      expect(escapeHtml('"test"')).toBe('&quot;test&quot;');
      expect(escapeHtml("'test'")).toBe('&#x27;test&#x27;');
      expect(escapeHtml('test&value')).toBe('test&amp;value');
      expect(escapeHtml('test/path')).toBe('test&#x2F;path');
    });

    it('should not escape normal characters', () => {
      expect(escapeHtml('Hello World')).toBe('Hello World');
      expect(escapeHtml('https://example.com')).toBe('https:&#x2F;&#x2F;example.com');
    });
  });

  describe('generateIframePage', () => {
    it('should generate valid iFrame cloaked page', () => {
      const html = generateIframePage({
        destinationUrl: 'https://example.com',
      });

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<iframe');
      expect(html).toContain('example.com');
      expect(html).toContain('noindex, nofollow');
    });

    it('should use custom title when provided', () => {
      const html = generateIframePage({
        destinationUrl: 'https://example.com',
        title: 'Custom Title',
      });

      expect(html).toContain('<title>Custom Title</title>');
    });

    it('should use custom favicon when provided', () => {
      const html = generateIframePage({
        destinationUrl: 'https://example.com',
        favicon: 'https://custom.com/favicon.ico',
      });

      expect(html).toContain('href="https:');
      expect(html).toContain('custom.com');
    });

    it('should escape destination URL to prevent XSS', () => {
      const html = generateIframePage({
        destinationUrl: 'https://example.com?q=<script>alert(1)</script>',
      });

      expect(html).not.toContain('<script>alert(1)</script>');
      expect(html).toContain('&lt;script&gt;');
    });

    it('should escape title to prevent XSS', () => {
      const html = generateIframePage({
        destinationUrl: 'https://example.com',
        title: '<script>alert(1)</script>',
      });

      expect(html).toContain('&lt;script&gt;');
      expect(html).not.toContain('<script>alert(1)</script>');
    });
  });

  describe('generateJavaScriptPage', () => {
    it('should generate valid JavaScript redirect page', () => {
      const html = generateJavaScriptPage({
        destinationUrl: 'https://example.com',
      });

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('window.location.replace');
      expect(html).toContain('example.com');
      expect(html).toContain('noindex, nofollow');
    });

    it('should include noscript fallback', () => {
      const html = generateJavaScriptPage({
        destinationUrl: 'https://example.com',
      });

      expect(html).toContain('<noscript>');
      expect(html).toContain('meta http-equiv="refresh"');
    });

    it('should use custom title when provided', () => {
      const html = generateJavaScriptPage({
        destinationUrl: 'https://example.com',
        title: 'Custom JS Title',
      });

      expect(html).toContain('<title>Custom JS Title</title>');
    });

    it('should include loading spinner', () => {
      const html = generateJavaScriptPage({
        destinationUrl: 'https://example.com',
      });

      expect(html).toContain('spinner');
      expect(html).toContain('Redirecting');
    });
  });

  describe('generateMetaRefreshPage', () => {
    it('should generate valid meta refresh page', () => {
      const html = generateMetaRefreshPage({
        destinationUrl: 'https://example.com',
      });

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('meta http-equiv="refresh"');
      expect(html).toContain('content="0;url=');
      expect(html).toContain('example.com');
    });

    it('should use custom title when provided', () => {
      const html = generateMetaRefreshPage({
        destinationUrl: 'https://example.com',
        title: 'Meta Refresh Title',
      });

      expect(html).toContain('<title>Meta Refresh Title</title>');
    });

    it('should include fallback link', () => {
      const html = generateMetaRefreshPage({
        destinationUrl: 'https://example.com',
      });

      expect(html).toContain('Click here if not redirected');
      expect(html).toContain('<a href=');
    });
  });

  describe('generateCloakedPage', () => {
    it('should generate iFrame page for IFRAME type', () => {
      const html = generateCloakedPage('IFRAME', {
        destinationUrl: 'https://example.com',
      });

      expect(html).toContain('<iframe');
    });

    it('should generate JavaScript page for JAVASCRIPT type', () => {
      const html = generateCloakedPage('JAVASCRIPT', {
        destinationUrl: 'https://example.com',
      });

      expect(html).toContain('window.location.replace');
    });

    it('should generate meta refresh page for META_REFRESH type', () => {
      const html = generateCloakedPage('META_REFRESH', {
        destinationUrl: 'https://example.com',
      });

      expect(html).toContain('meta http-equiv="refresh"');
    });
  });

  describe('getCloakedPageContentType', () => {
    it('should return correct content type', () => {
      const contentType = getCloakedPageContentType();

      expect(contentType).toBe('text/html; charset=utf-8');
    });
  });

  describe('getCloakingTypeName', () => {
    it('should return correct names for all types', () => {
      expect(getCloakingTypeName('IFRAME')).toBe('iFrame Cloaking');
      expect(getCloakingTypeName('JAVASCRIPT')).toBe('JavaScript Redirect');
      expect(getCloakingTypeName('META_REFRESH')).toBe('Meta Refresh Redirect');
    });
  });

  describe('getCloakingTypeDescription', () => {
    it('should return descriptions for all types', () => {
      expect(getCloakingTypeDescription('IFRAME')).toContain('iFrame');
      expect(getCloakingTypeDescription('JAVASCRIPT')).toContain('JavaScript');
      expect(getCloakingTypeDescription('META_REFRESH')).toContain('meta refresh');
    });
  });
});
