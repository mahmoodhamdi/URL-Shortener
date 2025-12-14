import { describe, it, expect } from 'vitest';
import {
  CLOAKING_LIMITS,
  isCloakingAvailable,
  validateCloakingSettings,
} from '@/lib/cloaking';

describe('Cloaking Integration', () => {
  describe('CLOAKING_LIMITS', () => {
    it('should have correct limits for FREE plan', () => {
      expect(CLOAKING_LIMITS.FREE).toBe(0);
    });

    it('should have correct limits for STARTER plan', () => {
      expect(CLOAKING_LIMITS.STARTER).toBe(10);
    });

    it('should have correct limits for PRO plan', () => {
      expect(CLOAKING_LIMITS.PRO).toBe(50);
    });

    it('should have correct limits for BUSINESS plan', () => {
      expect(CLOAKING_LIMITS.BUSINESS).toBe(-1); // Unlimited
    });

    it('should have correct limits for ENTERPRISE plan', () => {
      expect(CLOAKING_LIMITS.ENTERPRISE).toBe(-1); // Unlimited
    });
  });

  describe('isCloakingAvailable', () => {
    it('should return false for FREE plan', () => {
      expect(isCloakingAvailable('FREE')).toBe(false);
    });

    it('should return true for STARTER plan', () => {
      expect(isCloakingAvailable('STARTER')).toBe(true);
    });

    it('should return true for PRO plan', () => {
      expect(isCloakingAvailable('PRO')).toBe(true);
    });

    it('should return true for BUSINESS plan', () => {
      expect(isCloakingAvailable('BUSINESS')).toBe(true);
    });

    it('should return true for ENTERPRISE plan', () => {
      expect(isCloakingAvailable('ENTERPRISE')).toBe(true);
    });
  });

  describe('validateCloakingSettings', () => {
    it('should accept valid IFRAME type', () => {
      const result = validateCloakingSettings({ type: 'IFRAME' });
      expect(result.valid).toBe(true);
    });

    it('should accept valid JAVASCRIPT type', () => {
      const result = validateCloakingSettings({ type: 'JAVASCRIPT' });
      expect(result.valid).toBe(true);
    });

    it('should accept valid META_REFRESH type', () => {
      const result = validateCloakingSettings({ type: 'META_REFRESH' });
      expect(result.valid).toBe(true);
    });

    it('should reject invalid type', () => {
      const result = validateCloakingSettings({ type: 'INVALID' });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid cloaking type');
    });

    it('should accept valid title', () => {
      const result = validateCloakingSettings({ title: 'My Custom Title' });
      expect(result.valid).toBe(true);
    });

    it('should reject title over 100 characters', () => {
      const longTitle = 'a'.repeat(101);
      const result = validateCloakingSettings({ title: longTitle });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('100 characters');
    });

    it('should accept valid favicon URL', () => {
      const result = validateCloakingSettings({
        favicon: 'https://example.com/favicon.ico',
      });
      expect(result.valid).toBe(true);
    });

    it('should reject invalid favicon URL', () => {
      const result = validateCloakingSettings({ favicon: 'not-a-url' });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('valid URL');
    });

    it('should accept empty options', () => {
      const result = validateCloakingSettings({});
      expect(result.valid).toBe(true);
    });

    it('should accept all valid options together', () => {
      const result = validateCloakingSettings({
        type: 'IFRAME',
        title: 'My Page',
        favicon: 'https://example.com/icon.png',
      });
      expect(result.valid).toBe(true);
    });
  });
});
