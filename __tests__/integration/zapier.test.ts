import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    zapierSubscription: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    subscription: {
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from '@/lib/db/prisma';
import {
  ZAPIER_LIMITS,
  isZapierAvailable,
  canCreateSubscription,
  createSubscription,
  deleteSubscription,
  listSubscriptions,
  getSubscription,
  updateSubscriptionStatus,
  subscriptionExists,
  getSubscriptionsByEvent,
} from '@/lib/zapier';

describe('Zapier Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ZAPIER_LIMITS', () => {
    it('should have correct limits for FREE plan', () => {
      expect(ZAPIER_LIMITS.FREE).toEqual({ subscriptions: 0, eventsPerDay: 0 });
    });

    it('should have correct limits for STARTER plan', () => {
      expect(ZAPIER_LIMITS.STARTER).toEqual({ subscriptions: 2, eventsPerDay: 100 });
    });

    it('should have correct limits for PRO plan', () => {
      expect(ZAPIER_LIMITS.PRO).toEqual({ subscriptions: 10, eventsPerDay: 1000 });
    });

    it('should have correct limits for BUSINESS plan', () => {
      expect(ZAPIER_LIMITS.BUSINESS).toEqual({ subscriptions: 50, eventsPerDay: 10000 });
    });

    it('should have correct limits for ENTERPRISE plan', () => {
      expect(ZAPIER_LIMITS.ENTERPRISE).toEqual({ subscriptions: -1, eventsPerDay: -1 });
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

  describe('canCreateSubscription', () => {
    it('should not allow FREE users to create subscriptions', async () => {
      const result = await canCreateSubscription('user-1', 'FREE');

      expect(result.allowed).toBe(false);
      expect(result.limit).toBe(0);
      expect(result.reason).toContain('not available');
    });

    it('should allow STARTER users to create up to 2 subscriptions', async () => {
      vi.mocked(prisma.zapierSubscription.count).mockResolvedValue(1);

      const result = await canCreateSubscription('user-1', 'STARTER');

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(2);
      expect(result.current).toBe(1);
    });

    it('should not allow STARTER users to exceed 2 subscriptions', async () => {
      vi.mocked(prisma.zapierSubscription.count).mockResolvedValue(2);

      const result = await canCreateSubscription('user-1', 'STARTER');

      expect(result.allowed).toBe(false);
      expect(result.limit).toBe(2);
      expect(result.reason).toContain('limit');
    });

    it('should allow PRO users to create up to 10 subscriptions', async () => {
      vi.mocked(prisma.zapierSubscription.count).mockResolvedValue(9);

      const result = await canCreateSubscription('user-1', 'PRO');

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(10);
    });

    it('should not allow PRO users to exceed 10 subscriptions', async () => {
      vi.mocked(prisma.zapierSubscription.count).mockResolvedValue(10);

      const result = await canCreateSubscription('user-1', 'PRO');

      expect(result.allowed).toBe(false);
    });

    it('should allow BUSINESS users to create up to 50 subscriptions', async () => {
      vi.mocked(prisma.zapierSubscription.count).mockResolvedValue(49);

      const result = await canCreateSubscription('user-1', 'BUSINESS');

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(50);
    });

    it('should allow ENTERPRISE users unlimited subscriptions', async () => {
      vi.mocked(prisma.zapierSubscription.count).mockResolvedValue(100);

      const result = await canCreateSubscription('user-1', 'ENTERPRISE');

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(-1);
    });
  });

  describe('createSubscription', () => {
    it('should create a new subscription', async () => {
      const mockSubscription = {
        id: 'sub-1',
        userId: 'user-1',
        hookUrl: 'https://hooks.zapier.com/test',
        event: 'LINK_CREATED',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.zapierSubscription.create).mockResolvedValue(mockSubscription as never);

      const result = await createSubscription(
        'user-1',
        'https://hooks.zapier.com/test',
        'LINK_CREATED'
      );

      expect(result).toEqual(mockSubscription);
      expect(prisma.zapierSubscription.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          hookUrl: 'https://hooks.zapier.com/test',
          event: 'LINK_CREATED',
          isActive: true,
        },
      });
    });
  });

  describe('deleteSubscription', () => {
    it('should delete a subscription', async () => {
      vi.mocked(prisma.zapierSubscription.deleteMany).mockResolvedValue({ count: 1 });

      const result = await deleteSubscription('sub-1', 'user-1');

      expect(result.count).toBe(1);
      expect(prisma.zapierSubscription.deleteMany).toHaveBeenCalledWith({
        where: {
          id: 'sub-1',
          userId: 'user-1',
        },
      });
    });

    it('should return 0 if subscription not found', async () => {
      vi.mocked(prisma.zapierSubscription.deleteMany).mockResolvedValue({ count: 0 });

      const result = await deleteSubscription('non-existent', 'user-1');

      expect(result.count).toBe(0);
    });
  });

  describe('listSubscriptions', () => {
    it('should list all subscriptions for a user', async () => {
      const mockSubscriptions = [
        {
          id: 'sub-1',
          userId: 'user-1',
          hookUrl: 'https://hooks.zapier.com/test1',
          event: 'LINK_CREATED',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'sub-2',
          userId: 'user-1',
          hookUrl: 'https://hooks.zapier.com/test2',
          event: 'LINK_CLICKED',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(prisma.zapierSubscription.findMany).mockResolvedValue(mockSubscriptions as never);

      const result = await listSubscriptions('user-1');

      expect(result).toHaveLength(2);
      expect(prisma.zapierSubscription.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('getSubscription', () => {
    it('should get a specific subscription', async () => {
      const mockSubscription = {
        id: 'sub-1',
        userId: 'user-1',
        hookUrl: 'https://hooks.zapier.com/test',
        event: 'LINK_CREATED',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.zapierSubscription.findFirst).mockResolvedValue(mockSubscription as never);

      const result = await getSubscription('sub-1', 'user-1');

      expect(result).toEqual(mockSubscription);
      expect(prisma.zapierSubscription.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'sub-1',
          userId: 'user-1',
        },
      });
    });

    it('should return null if subscription not found', async () => {
      vi.mocked(prisma.zapierSubscription.findFirst).mockResolvedValue(null);

      const result = await getSubscription('non-existent', 'user-1');

      expect(result).toBeNull();
    });
  });

  describe('updateSubscriptionStatus', () => {
    it('should update subscription status', async () => {
      vi.mocked(prisma.zapierSubscription.updateMany).mockResolvedValue({ count: 1 });

      const result = await updateSubscriptionStatus('sub-1', 'user-1', false);

      expect(result.count).toBe(1);
      expect(prisma.zapierSubscription.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'sub-1',
          userId: 'user-1',
        },
        data: { isActive: false },
      });
    });
  });

  describe('subscriptionExists', () => {
    it('should return true if subscription exists', async () => {
      vi.mocked(prisma.zapierSubscription.findFirst).mockResolvedValue({
        id: 'sub-1',
      } as never);

      const result = await subscriptionExists(
        'user-1',
        'https://hooks.zapier.com/test',
        'LINK_CREATED'
      );

      expect(result).toBe(true);
    });

    it('should return false if subscription does not exist', async () => {
      vi.mocked(prisma.zapierSubscription.findFirst).mockResolvedValue(null);

      const result = await subscriptionExists(
        'user-1',
        'https://hooks.zapier.com/test',
        'LINK_CREATED'
      );

      expect(result).toBe(false);
    });
  });

  describe('getSubscriptionsByEvent', () => {
    it('should return subscriptions grouped by event', async () => {
      vi.mocked(prisma.zapierSubscription.groupBy).mockResolvedValue([
        { event: 'LINK_CREATED', _count: { event: 3 } },
        { event: 'LINK_CLICKED', _count: { event: 2 } },
      ] as never);

      const result = await getSubscriptionsByEvent('user-1');

      expect(result).toEqual({
        LINK_CREATED: 3,
        LINK_CLICKED: 2,
      });
    });

    it('should return empty object if no subscriptions', async () => {
      vi.mocked(prisma.zapierSubscription.groupBy).mockResolvedValue([]);

      const result = await getSubscriptionsByEvent('user-1');

      expect(result).toEqual({});
    });
  });
});
