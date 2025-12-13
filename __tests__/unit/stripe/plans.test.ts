import { describe, it, expect } from 'vitest';
import {
  PLANS,
  getPlanByPriceId,
  getPlanLimits,
  getPlanFeatures,
  formatPrice,
  isFeatureAvailable,
} from '@/lib/stripe/plans';
import { Plan } from '@/types';

describe('Stripe Plans', () => {
  describe('PLANS configuration', () => {
    it('should have all plan tiers defined', () => {
      const expectedPlans: Plan[] = ['FREE', 'STARTER', 'PRO', 'BUSINESS', 'ENTERPRISE'];
      expectedPlans.forEach(plan => {
        expect(PLANS[plan]).toBeDefined();
        expect(PLANS[plan].name).toBeDefined();
        expect(PLANS[plan].limits).toBeDefined();
        expect(PLANS[plan].features).toBeDefined();
      });
    });

    it('should have FREE plan with correct limits', () => {
      expect(PLANS.FREE.price).toBe(0);
      expect(PLANS.FREE.limits.linksPerMonth).toBe(100);
      expect(PLANS.FREE.limits.customDomains).toBe(0);
      expect(PLANS.FREE.limits.teamMembers).toBe(1);
    });

    it('should have increasing limits as plans upgrade', () => {
      const plans: Plan[] = ['FREE', 'STARTER', 'PRO', 'BUSINESS'];

      for (let i = 0; i < plans.length - 1; i++) {
        const currentPlan = PLANS[plans[i]];
        const nextPlan = PLANS[plans[i + 1]];

        // Links per month should increase (or be unlimited)
        if (nextPlan.limits.linksPerMonth !== -1) {
          expect(nextPlan.limits.linksPerMonth).toBeGreaterThan(currentPlan.limits.linksPerMonth);
        }

        // Price should increase
        expect(nextPlan.price).toBeGreaterThan(currentPlan.price);
      }
    });

    it('should have ENTERPRISE plan with unlimited resources', () => {
      expect(PLANS.ENTERPRISE.limits.linksPerMonth).toBe(-1);
      expect(PLANS.ENTERPRISE.limits.clicksTracked).toBe(-1);
      expect(PLANS.ENTERPRISE.limits.customDomains).toBe(-1);
      expect(PLANS.ENTERPRISE.limits.teamMembers).toBe(-1);
    });

    it('should have PRO plan marked as popular', () => {
      expect(PLANS.PRO.popular).toBe(true);
    });
  });

  describe('getPlanByPriceId', () => {
    it('should return null for unknown price ID', () => {
      const result = getPlanByPriceId('unknown_price_id');
      expect(result).toBeNull();
    });

    it('should return null for empty price ID', () => {
      const result = getPlanByPriceId('');
      expect(result).toBeNull();
    });
  });

  describe('getPlanLimits', () => {
    it('should return correct limits for each plan', () => {
      const freeLimit = getPlanLimits('FREE');
      expect(freeLimit.linksPerMonth).toBe(100);

      const proLimit = getPlanLimits('PRO');
      expect(proLimit.linksPerMonth).toBe(5000);
    });
  });

  describe('getPlanFeatures', () => {
    it('should return features array for each plan', () => {
      const freeFeatures = getPlanFeatures('FREE');
      expect(Array.isArray(freeFeatures)).toBe(true);
      expect(freeFeatures.length).toBeGreaterThan(0);
    });

    it('should include expected features for FREE plan', () => {
      const freeFeatures = getPlanFeatures('FREE');
      expect(freeFeatures).toContain('Basic Analytics');
      expect(freeFeatures).toContain('QR Codes');
    });
  });

  describe('formatPrice', () => {
    it('should return "Free" for zero price', () => {
      expect(formatPrice(0)).toBe('Free');
    });

    it('should format monthly price correctly', () => {
      expect(formatPrice(5)).toBe('$5/mo');
      expect(formatPrice(12)).toBe('$12/mo');
    });

    it('should format yearly price as monthly equivalent', () => {
      expect(formatPrice(120, true)).toBe('$10/mo');
      expect(formatPrice(48, true)).toBe('$4/mo');
    });
  });

  describe('isFeatureAvailable', () => {
    it('should return true for features in the current plan', () => {
      // Basic Analytics is in FREE plan
      expect(isFeatureAvailable('FREE', 'Basic Analytics')).toBe(true);
    });

    it('should return true for features in lower plans', () => {
      // Basic Analytics is in FREE, should be available in PRO
      expect(isFeatureAvailable('PRO', 'Basic Analytics')).toBe(true);
    });

    it('should return false for features not available', () => {
      // Custom feature that doesn't exist
      expect(isFeatureAvailable('FREE', 'Nonexistent Feature')).toBe(false);
    });
  });
});
