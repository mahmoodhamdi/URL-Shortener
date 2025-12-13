import { describe, it, expect } from 'vitest';
import {
  isValidTargetValue,
  normalizeTargetValue,
  matchesTarget,
  findMatchingTarget,
  getTargetUrl,
  getTargetTypeOptions,
  type Target,
} from '@/lib/targeting/matcher';
import type { DetectedInfo } from '@/lib/targeting/detector';

describe('Target Matcher', () => {
  describe('isValidTargetValue', () => {
    it('should validate device values', () => {
      expect(isValidTargetValue('DEVICE', 'mobile')).toBe(true);
      expect(isValidTargetValue('DEVICE', 'desktop')).toBe(true);
      expect(isValidTargetValue('DEVICE', 'tablet')).toBe(true);
      expect(isValidTargetValue('DEVICE', 'invalid')).toBe(false);
    });

    it('should validate OS values', () => {
      expect(isValidTargetValue('OS', 'ios')).toBe(true);
      expect(isValidTargetValue('OS', 'android')).toBe(true);
      expect(isValidTargetValue('OS', 'windows')).toBe(true);
      expect(isValidTargetValue('OS', 'macos')).toBe(true);
      expect(isValidTargetValue('OS', 'linux')).toBe(true);
      expect(isValidTargetValue('OS', 'chromeos')).toBe(true);
      expect(isValidTargetValue('OS', 'invalid')).toBe(false);
    });

    it('should validate browser values', () => {
      expect(isValidTargetValue('BROWSER', 'chrome')).toBe(true);
      expect(isValidTargetValue('BROWSER', 'safari')).toBe(true);
      expect(isValidTargetValue('BROWSER', 'firefox')).toBe(true);
      expect(isValidTargetValue('BROWSER', 'edge')).toBe(true);
      expect(isValidTargetValue('BROWSER', 'opera')).toBe(true);
      expect(isValidTargetValue('BROWSER', 'samsung')).toBe(true);
      expect(isValidTargetValue('BROWSER', 'invalid')).toBe(false);
    });

    it('should validate country codes', () => {
      expect(isValidTargetValue('COUNTRY', 'US')).toBe(true);
      expect(isValidTargetValue('COUNTRY', 'EG')).toBe(true);
      expect(isValidTargetValue('COUNTRY', 'SA')).toBe(true);
      expect(isValidTargetValue('COUNTRY', 'us')).toBe(true); // case insensitive
      expect(isValidTargetValue('COUNTRY', 'USA')).toBe(false); // 3 letters
      expect(isValidTargetValue('COUNTRY', 'X')).toBe(false); // 1 letter
      expect(isValidTargetValue('COUNTRY', '12')).toBe(false); // numbers
    });

    it('should validate language codes', () => {
      expect(isValidTargetValue('LANGUAGE', 'en')).toBe(true);
      expect(isValidTargetValue('LANGUAGE', 'ar')).toBe(true);
      expect(isValidTargetValue('LANGUAGE', 'EN')).toBe(true); // case insensitive
      expect(isValidTargetValue('LANGUAGE', 'ara')).toBe(true); // 3 letter codes
      expect(isValidTargetValue('LANGUAGE', 'e')).toBe(false); // 1 letter
      expect(isValidTargetValue('LANGUAGE', 'english')).toBe(false); // too long
    });
  });

  describe('normalizeTargetValue', () => {
    it('should uppercase country codes', () => {
      expect(normalizeTargetValue('COUNTRY', 'us')).toBe('US');
      expect(normalizeTargetValue('COUNTRY', 'eg')).toBe('EG');
    });

    it('should lowercase device values', () => {
      expect(normalizeTargetValue('DEVICE', 'MOBILE')).toBe('mobile');
      expect(normalizeTargetValue('DEVICE', 'Desktop')).toBe('desktop');
    });

    it('should lowercase OS values', () => {
      expect(normalizeTargetValue('OS', 'IOS')).toBe('ios');
      expect(normalizeTargetValue('OS', 'Android')).toBe('android');
    });

    it('should lowercase browser values', () => {
      expect(normalizeTargetValue('BROWSER', 'Chrome')).toBe('chrome');
      expect(normalizeTargetValue('BROWSER', 'SAFARI')).toBe('safari');
    });

    it('should lowercase language codes', () => {
      expect(normalizeTargetValue('LANGUAGE', 'EN')).toBe('en');
      expect(normalizeTargetValue('LANGUAGE', 'AR')).toBe('ar');
    });
  });

  describe('matchesTarget', () => {
    const baseDetected: DetectedInfo = {
      device: 'mobile',
      os: 'ios',
      browser: 'safari',
      country: 'EG',
      language: 'ar',
    };

    it('should match device target', () => {
      const target: Target = {
        id: '1',
        type: 'DEVICE',
        value: 'mobile',
        targetUrl: 'https://m.example.com',
        priority: 0,
        isActive: true,
      };
      expect(matchesTarget(target, baseDetected)).toBe(true);

      target.value = 'desktop';
      expect(matchesTarget(target, baseDetected)).toBe(false);
    });

    it('should match OS target', () => {
      const target: Target = {
        id: '1',
        type: 'OS',
        value: 'ios',
        targetUrl: 'https://ios.example.com',
        priority: 0,
        isActive: true,
      };
      expect(matchesTarget(target, baseDetected)).toBe(true);

      target.value = 'android';
      expect(matchesTarget(target, baseDetected)).toBe(false);
    });

    it('should match browser target', () => {
      const target: Target = {
        id: '1',
        type: 'BROWSER',
        value: 'safari',
        targetUrl: 'https://safari.example.com',
        priority: 0,
        isActive: true,
      };
      expect(matchesTarget(target, baseDetected)).toBe(true);

      target.value = 'chrome';
      expect(matchesTarget(target, baseDetected)).toBe(false);
    });

    it('should match country target', () => {
      const target: Target = {
        id: '1',
        type: 'COUNTRY',
        value: 'EG',
        targetUrl: 'https://eg.example.com',
        priority: 0,
        isActive: true,
      };
      expect(matchesTarget(target, baseDetected)).toBe(true);

      target.value = 'US';
      expect(matchesTarget(target, baseDetected)).toBe(false);
    });

    it('should match language target', () => {
      const target: Target = {
        id: '1',
        type: 'LANGUAGE',
        value: 'ar',
        targetUrl: 'https://ar.example.com',
        priority: 0,
        isActive: true,
      };
      expect(matchesTarget(target, baseDetected)).toBe(true);

      target.value = 'en';
      expect(matchesTarget(target, baseDetected)).toBe(false);
    });

    it('should not match inactive targets', () => {
      const target: Target = {
        id: '1',
        type: 'DEVICE',
        value: 'mobile',
        targetUrl: 'https://m.example.com',
        priority: 0,
        isActive: false,
      };
      expect(matchesTarget(target, baseDetected)).toBe(false);
    });

    it('should handle null country in detected info', () => {
      const detected: DetectedInfo = { ...baseDetected, country: null };
      const target: Target = {
        id: '1',
        type: 'COUNTRY',
        value: 'EG',
        targetUrl: 'https://eg.example.com',
        priority: 0,
        isActive: true,
      };
      expect(matchesTarget(target, detected)).toBe(false);
    });

    it('should handle null language in detected info', () => {
      const detected: DetectedInfo = { ...baseDetected, language: null };
      const target: Target = {
        id: '1',
        type: 'LANGUAGE',
        value: 'ar',
        targetUrl: 'https://ar.example.com',
        priority: 0,
        isActive: true,
      };
      expect(matchesTarget(target, detected)).toBe(false);
    });
  });

  describe('findMatchingTarget', () => {
    const detected: DetectedInfo = {
      device: 'mobile',
      os: 'ios',
      browser: 'safari',
      country: 'EG',
      language: 'ar',
    };

    it('should return null for empty targets', () => {
      expect(findMatchingTarget([], detected)).toBeNull();
    });

    it('should find first matching target by priority', () => {
      const targets: Target[] = [
        {
          id: '1',
          type: 'COUNTRY',
          value: 'EG',
          targetUrl: 'https://eg.example.com',
          priority: 1,
          isActive: true,
        },
        {
          id: '2',
          type: 'DEVICE',
          value: 'mobile',
          targetUrl: 'https://m.example.com',
          priority: 2,
          isActive: true,
        },
      ];

      // Higher priority (2) should be checked first
      const match = findMatchingTarget(targets, detected);
      expect(match?.id).toBe('2');
      expect(match?.targetUrl).toBe('https://m.example.com');
    });

    it('should skip inactive targets', () => {
      const targets: Target[] = [
        {
          id: '1',
          type: 'DEVICE',
          value: 'mobile',
          targetUrl: 'https://m.example.com',
          priority: 2,
          isActive: false,
        },
        {
          id: '2',
          type: 'COUNTRY',
          value: 'EG',
          targetUrl: 'https://eg.example.com',
          priority: 1,
          isActive: true,
        },
      ];

      const match = findMatchingTarget(targets, detected);
      expect(match?.id).toBe('2');
    });

    it('should return null if no targets match', () => {
      const targets: Target[] = [
        {
          id: '1',
          type: 'DEVICE',
          value: 'desktop',
          targetUrl: 'https://desktop.example.com',
          priority: 1,
          isActive: true,
        },
        {
          id: '2',
          type: 'COUNTRY',
          value: 'US',
          targetUrl: 'https://us.example.com',
          priority: 2,
          isActive: true,
        },
      ];

      expect(findMatchingTarget(targets, detected)).toBeNull();
    });
  });

  describe('getTargetUrl', () => {
    const detected: DetectedInfo = {
      device: 'mobile',
      os: 'ios',
      browser: 'safari',
      country: 'EG',
      language: 'ar',
    };

    it('should return original URL when no targets', () => {
      const result = getTargetUrl('https://original.com', [], detected);
      expect(result).toBe('https://original.com');
    });

    it('should return target URL when match found', () => {
      const targets: Target[] = [
        {
          id: '1',
          type: 'DEVICE',
          value: 'mobile',
          targetUrl: 'https://m.example.com',
          priority: 1,
          isActive: true,
        },
      ];

      const result = getTargetUrl('https://original.com', targets, detected);
      expect(result).toBe('https://m.example.com');
    });

    it('should return original URL when no match', () => {
      const targets: Target[] = [
        {
          id: '1',
          type: 'DEVICE',
          value: 'desktop',
          targetUrl: 'https://desktop.example.com',
          priority: 1,
          isActive: true,
        },
      ];

      const result = getTargetUrl('https://original.com', targets, detected);
      expect(result).toBe('https://original.com');
    });
  });

  describe('getTargetTypeOptions', () => {
    it('should return device options', () => {
      const options = getTargetTypeOptions('DEVICE');
      expect(options).toHaveLength(3);
      expect(options.map(o => o.value)).toContain('mobile');
      expect(options.map(o => o.value)).toContain('desktop');
      expect(options.map(o => o.value)).toContain('tablet');
    });

    it('should return OS options', () => {
      const options = getTargetTypeOptions('OS');
      expect(options).toHaveLength(6);
      expect(options.map(o => o.value)).toContain('ios');
      expect(options.map(o => o.value)).toContain('android');
    });

    it('should return browser options', () => {
      const options = getTargetTypeOptions('BROWSER');
      expect(options).toHaveLength(6);
      expect(options.map(o => o.value)).toContain('chrome');
      expect(options.map(o => o.value)).toContain('safari');
    });

    it('should return country options', () => {
      const options = getTargetTypeOptions('COUNTRY');
      expect(options.length).toBeGreaterThan(10);
      expect(options.map(o => o.value)).toContain('EG');
      expect(options.map(o => o.value)).toContain('US');
    });

    it('should return language options', () => {
      const options = getTargetTypeOptions('LANGUAGE');
      expect(options.length).toBeGreaterThan(10);
      expect(options.map(o => o.value)).toContain('ar');
      expect(options.map(o => o.value)).toContain('en');
    });
  });
});
