import { describe, it, expect } from 'vitest';
import {
  parseUserAgent,
  getDeviceType,
  getBrowser,
  getOS,
} from '@/lib/analytics/device';

describe('Device Parser', () => {
  describe('parseUserAgent', () => {
    it('should parse Chrome on Windows desktop', () => {
      const ua =
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
      const result = parseUserAgent(ua);

      expect(result.device).toBe('desktop');
      expect(result.browser).toBe('Chrome');
      expect(result.os).toBe('Windows');
    });

    it('should parse Safari on iOS mobile', () => {
      const ua =
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
      const result = parseUserAgent(ua);

      expect(result.device).toBe('mobile');
      expect(result.browser).toBe('Mobile Safari');
      expect(result.os).toBe('iOS');
    });

    it('should parse Chrome on Android tablet', () => {
      const ua =
        'Mozilla/5.0 (Linux; Android 13; SM-T870) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
      const result = parseUserAgent(ua);

      expect(result.device).toBe('tablet');
      expect(result.browser).toBe('Chrome');
      expect(result.os).toBe('Android');
    });

    it('should handle null user agent', () => {
      const result = parseUserAgent(null);

      expect(result.device).toBe('unknown');
      expect(result.browser).toBe('unknown');
      expect(result.os).toBe('unknown');
    });

    it('should handle empty user agent', () => {
      const result = parseUserAgent('');

      // Empty string is treated the same as null (falsy value)
      expect(result.device).toBe('unknown');
      expect(result.browser).toBe('unknown');
      expect(result.os).toBe('unknown');
    });
  });

  describe('getDeviceType', () => {
    it('should return mobile for mobile UA', () => {
      const ua =
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15';
      expect(getDeviceType(ua)).toBe('mobile');
    });

    it('should return desktop for desktop UA', () => {
      const ua =
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0';
      expect(getDeviceType(ua)).toBe('desktop');
    });

    it('should return unknown for null', () => {
      expect(getDeviceType(null)).toBe('unknown');
    });
  });

  describe('getBrowser', () => {
    it('should return browser name', () => {
      const ua =
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0';
      expect(getBrowser(ua)).toBe('Chrome');
    });

    it('should return unknown for null', () => {
      expect(getBrowser(null)).toBe('unknown');
    });
  });

  describe('getOS', () => {
    it('should return OS name', () => {
      const ua =
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';
      expect(getOS(ua)).toBe('Mac OS');
    });

    it('should return unknown for null', () => {
      expect(getOS(null)).toBe('unknown');
    });
  });
});
