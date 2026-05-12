import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    zapierSubscription: {
      count: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
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
} from '@/lib/zapier';

const p = prisma as unknown as {
  zapierSubscription: Record<string, ReturnType<typeof vi.fn>>;
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('zapier subscriptions', () => {
  describe('ZAPIER_LIMITS', () => {
    it('locks Zapier behind paid plans', () => {
      expect(ZAPIER_LIMITS.FREE.subscriptions).toBe(0);
      expect(ZAPIER_LIMITS.FREE.eventsPerDay).toBe(0);
    });

    it('ENTERPRISE is unlimited (-1 sentinel)', () => {
      expect(ZAPIER_LIMITS.ENTERPRISE.subscriptions).toBe(-1);
      expect(ZAPIER_LIMITS.ENTERPRISE.eventsPerDay).toBe(-1);
    });

    it.each([
      ['FREE', false],
      ['STARTER', true],
      ['PRO', true],
      ['BUSINESS', true],
      ['ENTERPRISE', true],
    ] as const)('isZapierAvailable(%s) → %s', (plan, expected) => {
      expect(isZapierAvailable(plan)).toBe(expected);
    });
  });

  describe('canCreateSubscription', () => {
    it('rejects when the plan does not include Zapier', async () => {
      const result = await canCreateSubscription('u1', 'FREE');
      expect(result.allowed).toBe(false);
      expect(result.limit).toBe(0);
      expect(result.reason).toMatch(/not available/i);
      expect(p.zapierSubscription.count).not.toHaveBeenCalled();
    });

    it('allows unlimited plans without enforcing a ceiling', async () => {
      p.zapierSubscription.count.mockResolvedValue(50);
      const result = await canCreateSubscription('u1', 'ENTERPRISE');
      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(-1);
      expect(result.current).toBe(50);
    });

    it('blocks once the per-plan limit is reached', async () => {
      p.zapierSubscription.count.mockResolvedValue(2);
      const result = await canCreateSubscription('u1', 'STARTER');
      expect(result.allowed).toBe(false);
      expect(result.limit).toBe(2);
      expect(result.current).toBe(2);
    });

    it('allows when current count is below the limit', async () => {
      p.zapierSubscription.count.mockResolvedValue(1);
      const result = await canCreateSubscription('u1', 'STARTER');
      expect(result.allowed).toBe(true);
    });
  });

  describe('createSubscription', () => {
    it('persists an active subscription with the given event', async () => {
      p.zapierSubscription.create.mockResolvedValue({ id: 's1' });
      await createSubscription('u1', 'https://hooks.zapier.com/x', 'LINK_CREATED');
      const call = p.zapierSubscription.create.mock.calls[0][0];
      expect(call.data).toEqual({
        userId: 'u1',
        hookUrl: 'https://hooks.zapier.com/x',
        event: 'LINK_CREATED',
        isActive: true,
      });
    });
  });

  describe('deleteSubscription', () => {
    it('scopes the delete to the owning user', async () => {
      p.zapierSubscription.deleteMany.mockResolvedValue({ count: 1 });
      await deleteSubscription('s1', 'u1');
      const call = p.zapierSubscription.deleteMany.mock.calls[0][0];
      expect(call.where).toEqual({ id: 's1', userId: 'u1' });
    });
  });

  describe('lookups', () => {
    it('listSubscriptions filters by user', async () => {
      p.zapierSubscription.findMany.mockResolvedValue([]);
      await listSubscriptions('u1');
      const call = p.zapierSubscription.findMany.mock.calls[0][0];
      expect(call.where).toEqual({ userId: 'u1' });
    });

    it('getSubscription enforces user ownership', async () => {
      p.zapierSubscription.findFirst.mockResolvedValue({ id: 's1' });
      await getSubscription('s1', 'u1');
      const call = p.zapierSubscription.findFirst.mock.calls[0][0];
      expect(call.where).toEqual({ id: 's1', userId: 'u1' });
    });

    it('updateSubscriptionStatus toggles isActive scoped by user', async () => {
      p.zapierSubscription.updateMany.mockResolvedValue({ count: 1 });
      await updateSubscriptionStatus('s1', 'u1', false);
      const call = p.zapierSubscription.updateMany.mock.calls[0][0];
      expect(call.where).toEqual({ id: 's1', userId: 'u1' });
      expect(call.data.isActive).toBe(false);
    });
  });
});
