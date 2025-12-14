import { describe, it, expect } from 'vitest';
import { ZAPIER_LIMITS, isZapierAvailable } from '@/lib/zapier';

describe('Zapier Integration', () => {
  describe('ZAPIER_LIMITS', () => {
    it('should have correct limits for FREE plan', () => {
      expect(ZAPIER_LIMITS.FREE).toEqual({
        subscriptions: 0,
        eventsPerDay: 0,
      });
    });

    it('should have correct limits for STARTER plan', () => {
      expect(ZAPIER_LIMITS.STARTER).toEqual({
        subscriptions: 2,
        eventsPerDay: 100,
      });
    });

    it('should have correct limits for PRO plan', () => {
      expect(ZAPIER_LIMITS.PRO).toEqual({
        subscriptions: 10,
        eventsPerDay: 1000,
      });
    });

    it('should have correct limits for BUSINESS plan', () => {
      expect(ZAPIER_LIMITS.BUSINESS).toEqual({
        subscriptions: 50,
        eventsPerDay: 10000,
      });
    });

    it('should have correct limits for ENTERPRISE plan', () => {
      expect(ZAPIER_LIMITS.ENTERPRISE).toEqual({
        subscriptions: -1,
        eventsPerDay: -1,
      });
    });
  });

  describe('isZapierAvailable', () => {
    it('should return false for FREE plan', () => {
      expect(isZapierAvailable('FREE')).toBe(false);
    });

    it('should return true for STARTER plan', () => {
      expect(isZapierAvailable('STARTER')).toBe(true);
    });

    it('should return true for PRO plan', () => {
      expect(isZapierAvailable('PRO')).toBe(true);
    });

    it('should return true for BUSINESS plan', () => {
      expect(isZapierAvailable('BUSINESS')).toBe(true);
    });

    it('should return true for ENTERPRISE plan', () => {
      expect(isZapierAvailable('ENTERPRISE')).toBe(true);
    });
  });
});
