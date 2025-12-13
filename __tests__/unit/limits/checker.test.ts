import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the prisma client
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    subscription: {
      findUnique: vi.fn(),
    },
    link: {
      count: vi.fn(),
    },
    click: {
      count: vi.fn(),
    },
    customDomain: {
      count: vi.fn(),
    },
  },
}));

// Mock the stripe plans
vi.mock('@/lib/stripe/plans', () => ({
  PLANS: {
    FREE: {
      name: 'Free',
      limits: {
        linksPerMonth: 100,
        clicksTracked: 10000,
        customDomains: 0,
        teamMembers: 1,
        apiRequestsPerDay: 100,
        analyticsRetentionDays: 30,
        bulkShortenLimit: 10,
      },
    },
    PRO: {
      name: 'Pro',
      limits: {
        linksPerMonth: 5000,
        clicksTracked: 250000,
        customDomains: 3,
        teamMembers: 5,
        apiRequestsPerDay: 5000,
        analyticsRetentionDays: 180,
        bulkShortenLimit: 100,
      },
    },
    ENTERPRISE: {
      name: 'Enterprise',
      limits: {
        linksPerMonth: -1,
        clicksTracked: -1,
        customDomains: -1,
        teamMembers: -1,
        apiRequestsPerDay: -1,
        analyticsRetentionDays: -1,
        bulkShortenLimit: -1,
      },
    },
  },
  getPlanLimits: vi.fn((plan: string) => {
    const limits = {
      FREE: {
        linksPerMonth: 100,
        clicksTracked: 10000,
        customDomains: 0,
        teamMembers: 1,
        apiRequestsPerDay: 100,
        analyticsRetentionDays: 30,
        bulkShortenLimit: 10,
      },
      PRO: {
        linksPerMonth: 5000,
        clicksTracked: 250000,
        customDomains: 3,
        teamMembers: 5,
        apiRequestsPerDay: 5000,
        analyticsRetentionDays: 180,
        bulkShortenLimit: 100,
      },
      ENTERPRISE: {
        linksPerMonth: -1,
        clicksTracked: -1,
        customDomains: -1,
        teamMembers: -1,
        apiRequestsPerDay: -1,
        analyticsRetentionDays: -1,
        bulkShortenLimit: -1,
      },
    };
    return limits[plan as keyof typeof limits] || limits.FREE;
  }),
}));

import { prisma } from '@/lib/db/prisma';
import {
  checkLinkLimit,
  checkBulkLimit,
  checkCustomDomainLimit,
} from '@/lib/limits/checker';

describe('Limits Checker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkLinkLimit', () => {
    it('should allow link creation when under limit', async () => {
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
        id: '1',
        userId: 'user-1',
        plan: 'FREE',
        status: 'ACTIVE',
        linksUsedThisMonth: 50,
        linksResetAt: new Date(),
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        stripePriceId: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await checkLinkLimit('user-1');

      expect(result.allowed).toBe(true);
      expect(result.used).toBe(50);
      expect(result.limit).toBe(100);
      expect(result.remaining).toBe(50);
      expect(result.plan).toBe('FREE');
    });

    it('should deny link creation when at limit', async () => {
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
        id: '1',
        userId: 'user-1',
        plan: 'FREE',
        status: 'ACTIVE',
        linksUsedThisMonth: 100,
        linksResetAt: new Date(),
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        stripePriceId: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await checkLinkLimit('user-1');

      expect(result.allowed).toBe(false);
      expect(result.used).toBe(100);
      expect(result.limit).toBe(100);
      expect(result.remaining).toBe(0);
      expect(result.message).toBeDefined();
    });

    it('should always allow for unlimited plans', async () => {
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
        id: '1',
        userId: 'user-1',
        plan: 'ENTERPRISE',
        status: 'ACTIVE',
        linksUsedThisMonth: 10000,
        linksResetAt: new Date(),
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        stripePriceId: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await checkLinkLimit('user-1');

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(-1);
      expect(result.remaining).toBe(-1);
    });

    it('should use free tier limits when no subscription exists', async () => {
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.link.count).mockResolvedValue(25);

      const result = await checkLinkLimit('user-1');

      expect(result.allowed).toBe(true);
      expect(result.used).toBe(25);
      expect(result.limit).toBe(100);
      expect(result.plan).toBe('FREE');
    });
  });

  describe('checkBulkLimit', () => {
    it('should allow bulk creation within per-request limit', async () => {
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
        id: '1',
        userId: 'user-1',
        plan: 'FREE',
        status: 'ACTIVE',
        linksUsedThisMonth: 50,
        linksResetAt: new Date(),
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        stripePriceId: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await checkBulkLimit('user-1', 5);

      expect(result.allowed).toBe(true);
    });

    it('should deny bulk creation exceeding per-request limit', async () => {
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
        id: '1',
        userId: 'user-1',
        plan: 'FREE',
        status: 'ACTIVE',
        linksUsedThisMonth: 50,
        linksResetAt: new Date(),
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        stripePriceId: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await checkBulkLimit('user-1', 15);

      expect(result.allowed).toBe(false);
      expect(result.message).toContain('Bulk shorten limit');
    });

    it('should deny if bulk would exceed monthly limit', async () => {
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
        id: '1',
        userId: 'user-1',
        plan: 'FREE',
        status: 'ACTIVE',
        linksUsedThisMonth: 95,
        linksResetAt: new Date(),
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        stripePriceId: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await checkBulkLimit('user-1', 10);

      expect(result.allowed).toBe(false);
      expect(result.message).toContain('would exceed');
    });
  });

  describe('checkCustomDomainLimit', () => {
    it('should deny custom domains for free plan', async () => {
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
        id: '1',
        userId: 'user-1',
        plan: 'FREE',
        status: 'ACTIVE',
        linksUsedThisMonth: 50,
        linksResetAt: new Date(),
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        stripePriceId: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(prisma.customDomain.count).mockResolvedValue(0);

      const result = await checkCustomDomainLimit('user-1');

      expect(result.allowed).toBe(false);
      expect(result.limit).toBe(0);
      expect(result.message).toContain('not available');
    });

    it('should allow custom domains for PRO plan', async () => {
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
        id: '1',
        userId: 'user-1',
        plan: 'PRO',
        status: 'ACTIVE',
        linksUsedThisMonth: 50,
        linksResetAt: new Date(),
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        stripePriceId: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(prisma.customDomain.count).mockResolvedValue(1);

      const result = await checkCustomDomainLimit('user-1');

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(3);
      expect(result.used).toBe(1);
      expect(result.remaining).toBe(2);
    });

    it('should deny when domain limit reached', async () => {
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
        id: '1',
        userId: 'user-1',
        plan: 'PRO',
        status: 'ACTIVE',
        linksUsedThisMonth: 50,
        linksResetAt: new Date(),
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        stripePriceId: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(prisma.customDomain.count).mockResolvedValue(3);

      const result = await checkCustomDomainLimit('user-1');

      expect(result.allowed).toBe(false);
      expect(result.used).toBe(3);
      expect(result.limit).toBe(3);
      expect(result.remaining).toBe(0);
      expect(result.message).toContain('limit reached');
    });
  });
});
