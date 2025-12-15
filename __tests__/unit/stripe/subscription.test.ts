import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getPlanConfig } from '@/lib/stripe/subscription';
import type { Plan } from '@/types';

// Mock prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    subscription: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

// Mock stripe client
vi.mock('@/lib/stripe/client', () => ({
  stripe: {
    customers: { create: vi.fn() },
    checkout: { sessions: { create: vi.fn() } },
    billingPortal: { sessions: { create: vi.fn() } },
    subscriptions: { update: vi.fn() },
  },
  getStripe: vi.fn(),
}));

describe('Stripe Subscription', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getPlanConfig', () => {
    it('should return config for FREE plan', () => {
      const config = getPlanConfig('FREE');
      expect(config).toBeDefined();
      expect(config.name).toBe('Free');
      expect(config.price).toBe(0);
    });

    it('should return config for STARTER plan', () => {
      const config = getPlanConfig('STARTER');
      expect(config).toBeDefined();
      expect(config.name).toBe('Starter');
      expect(config.price).toBeGreaterThan(0);
    });

    it('should return config for PRO plan', () => {
      const config = getPlanConfig('PRO');
      expect(config).toBeDefined();
      expect(config.name).toBe('Pro');
      expect(config.price).toBeGreaterThan(0);
    });

    it('should return config for BUSINESS plan', () => {
      const config = getPlanConfig('BUSINESS');
      expect(config).toBeDefined();
      expect(config.name).toBe('Business');
      expect(config.price).toBeGreaterThan(0);
    });

    it('should return config for ENTERPRISE plan', () => {
      const config = getPlanConfig('ENTERPRISE');
      expect(config).toBeDefined();
      expect(config.name).toBe('Enterprise');
    });

    it('should have increasing prices from FREE to BUSINESS', () => {
      const plans: Plan[] = ['FREE', 'STARTER', 'PRO', 'BUSINESS'];
      let prevPrice = -1;

      for (const plan of plans) {
        const config = getPlanConfig(plan);
        expect(config.price).toBeGreaterThanOrEqual(prevPrice);
        prevPrice = config.price;
      }
    });

    it('should have features array for each plan', () => {
      const plans: Plan[] = ['FREE', 'STARTER', 'PRO', 'BUSINESS', 'ENTERPRISE'];

      for (const plan of plans) {
        const config = getPlanConfig(plan);
        expect(Array.isArray(config.features)).toBe(true);
        expect(config.features.length).toBeGreaterThan(0);
      }
    });

    it('should have limits for each plan', () => {
      const plans: Plan[] = ['FREE', 'STARTER', 'PRO', 'BUSINESS', 'ENTERPRISE'];

      for (const plan of plans) {
        const config = getPlanConfig(plan);
        expect(config.limits).toBeDefined();
        expect(typeof config.limits.linksPerMonth).toBe('number');
      }
    });

    it('should have increasing link limits for higher plans', () => {
      const freeConfig = getPlanConfig('FREE');
      const starterConfig = getPlanConfig('STARTER');
      const proConfig = getPlanConfig('PRO');

      expect(starterConfig.limits.linksPerMonth).toBeGreaterThan(freeConfig.limits.linksPerMonth);
      expect(proConfig.limits.linksPerMonth).toBeGreaterThan(starterConfig.limits.linksPerMonth);
    });
  });

  describe('Subscription exports', () => {
    it('should export getOrCreateStripeCustomer', async () => {
      const { getOrCreateStripeCustomer } = await import('@/lib/stripe/subscription');
      expect(getOrCreateStripeCustomer).toBeDefined();
      expect(typeof getOrCreateStripeCustomer).toBe('function');
    });

    it('should export createCheckoutSession', async () => {
      const { createCheckoutSession } = await import('@/lib/stripe/subscription');
      expect(createCheckoutSession).toBeDefined();
      expect(typeof createCheckoutSession).toBe('function');
    });

    it('should export createBillingPortalSession', async () => {
      const { createBillingPortalSession } = await import('@/lib/stripe/subscription');
      expect(createBillingPortalSession).toBeDefined();
      expect(typeof createBillingPortalSession).toBe('function');
    });

    it('should export handleSubscriptionCreated', async () => {
      const { handleSubscriptionCreated } = await import('@/lib/stripe/subscription');
      expect(handleSubscriptionCreated).toBeDefined();
      expect(typeof handleSubscriptionCreated).toBe('function');
    });

    it('should export handleSubscriptionUpdated', async () => {
      const { handleSubscriptionUpdated } = await import('@/lib/stripe/subscription');
      expect(handleSubscriptionUpdated).toBeDefined();
      expect(typeof handleSubscriptionUpdated).toBe('function');
    });

    it('should export handleSubscriptionDeleted', async () => {
      const { handleSubscriptionDeleted } = await import('@/lib/stripe/subscription');
      expect(handleSubscriptionDeleted).toBeDefined();
      expect(typeof handleSubscriptionDeleted).toBe('function');
    });

    it('should export getUserSubscription', async () => {
      const { getUserSubscription } = await import('@/lib/stripe/subscription');
      expect(getUserSubscription).toBeDefined();
      expect(typeof getUserSubscription).toBe('function');
    });

    it('should export cancelSubscription', async () => {
      const { cancelSubscription } = await import('@/lib/stripe/subscription');
      expect(cancelSubscription).toBeDefined();
      expect(typeof cancelSubscription).toBe('function');
    });

    it('should export resumeSubscription', async () => {
      const { resumeSubscription } = await import('@/lib/stripe/subscription');
      expect(resumeSubscription).toBeDefined();
      expect(typeof resumeSubscription).toBe('function');
    });

    it('should export resetMonthlyUsage', async () => {
      const { resetMonthlyUsage } = await import('@/lib/stripe/subscription');
      expect(resetMonthlyUsage).toBeDefined();
      expect(typeof resetMonthlyUsage).toBe('function');
    });

    it('should export incrementLinkUsage', async () => {
      const { incrementLinkUsage } = await import('@/lib/stripe/subscription');
      expect(incrementLinkUsage).toBeDefined();
      expect(typeof incrementLinkUsage).toBe('function');
    });
  });
});
