import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    link: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    subscription: {
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from '@/lib/db/prisma';
import {
  CLOAKING_LIMITS,
  isCloakingAvailable,
  canEnableCloaking,
  getCloakedLinks,
  enableCloaking,
  disableCloaking,
  updateCloakingSettings,
  getCloakingStats,
} from '@/lib/cloaking';

describe('Cloaking Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

    it('should have correct limits for BUSINESS plan (unlimited)', () => {
      expect(CLOAKING_LIMITS.BUSINESS).toBe(-1);
    });

    it('should have correct limits for ENTERPRISE plan (unlimited)', () => {
      expect(CLOAKING_LIMITS.ENTERPRISE).toBe(-1);
    });
  });

  describe('isCloakingAvailable', () => {
    it('should return false for FREE plan', () => {
      expect(isCloakingAvailable('FREE')).toBe(false);
    });

    it('should return true for paid plans', () => {
      expect(isCloakingAvailable('STARTER')).toBe(true);
      expect(isCloakingAvailable('PRO')).toBe(true);
      expect(isCloakingAvailable('BUSINESS')).toBe(true);
      expect(isCloakingAvailable('ENTERPRISE')).toBe(true);
    });
  });

  describe('canEnableCloaking', () => {
    it('should not allow FREE users to enable cloaking', async () => {
      const result = await canEnableCloaking('user-1', 'FREE');

      expect(result.allowed).toBe(false);
      expect(result.limit).toBe(0);
      expect(result.reason).toContain('not available');
    });

    it('should allow STARTER users with available quota', async () => {
      vi.mocked(prisma.link.count).mockResolvedValue(5);

      const result = await canEnableCloaking('user-1', 'STARTER');

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(10);
      expect(result.current).toBe(5);
    });

    it('should not allow STARTER users exceeding quota', async () => {
      vi.mocked(prisma.link.count).mockResolvedValue(10);

      const result = await canEnableCloaking('user-1', 'STARTER');

      expect(result.allowed).toBe(false);
      expect(result.limit).toBe(10);
      expect(result.reason).toContain('limit');
    });

    it('should allow PRO users with available quota', async () => {
      vi.mocked(prisma.link.count).mockResolvedValue(25);

      const result = await canEnableCloaking('user-1', 'PRO');

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(50);
    });

    it('should allow BUSINESS users unlimited cloaking', async () => {
      vi.mocked(prisma.link.count).mockResolvedValue(100);

      const result = await canEnableCloaking('user-1', 'BUSINESS');

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(-1);
    });

    it('should allow ENTERPRISE users unlimited cloaking', async () => {
      vi.mocked(prisma.link.count).mockResolvedValue(500);

      const result = await canEnableCloaking('user-1', 'ENTERPRISE');

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(-1);
    });
  });

  describe('getCloakedLinks', () => {
    it('should return cloaked links for a user', async () => {
      const mockLinks = [
        {
          id: 'link-1',
          shortCode: 'abc123',
          cloakingEnabled: true,
          cloakingType: 'IFRAME',
        },
        {
          id: 'link-2',
          shortCode: 'def456',
          cloakingEnabled: true,
          cloakingType: 'JAVASCRIPT',
        },
      ];

      vi.mocked(prisma.link.findMany).mockResolvedValue(mockLinks as never);

      const result = await getCloakedLinks('user-1');

      expect(result).toHaveLength(2);
      expect(prisma.link.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          cloakingEnabled: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('enableCloaking', () => {
    it('should enable cloaking on a link', async () => {
      vi.mocked(prisma.link.updateMany).mockResolvedValue({ count: 1 });

      const result = await enableCloaking('link-1', 'user-1', {
        type: 'IFRAME',
        title: 'My Page',
        favicon: 'https://example.com/icon.png',
      });

      expect(result.count).toBe(1);
      expect(prisma.link.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'link-1',
          userId: 'user-1',
        },
        data: {
          cloakingEnabled: true,
          cloakingType: 'IFRAME',
          cloakingTitle: 'My Page',
          cloakingFavicon: 'https://example.com/icon.png',
        },
      });
    });

    it('should handle null title and favicon', async () => {
      vi.mocked(prisma.link.updateMany).mockResolvedValue({ count: 1 });

      await enableCloaking('link-1', 'user-1', {
        type: 'JAVASCRIPT',
      });

      expect(prisma.link.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'link-1',
          userId: 'user-1',
        },
        data: {
          cloakingEnabled: true,
          cloakingType: 'JAVASCRIPT',
          cloakingTitle: null,
          cloakingFavicon: null,
        },
      });
    });
  });

  describe('disableCloaking', () => {
    it('should disable cloaking on a link', async () => {
      vi.mocked(prisma.link.updateMany).mockResolvedValue({ count: 1 });

      const result = await disableCloaking('link-1', 'user-1');

      expect(result.count).toBe(1);
      expect(prisma.link.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'link-1',
          userId: 'user-1',
        },
        data: {
          cloakingEnabled: false,
          cloakingType: null,
          cloakingTitle: null,
          cloakingFavicon: null,
        },
      });
    });
  });

  describe('updateCloakingSettings', () => {
    it('should update cloaking type', async () => {
      vi.mocked(prisma.link.updateMany).mockResolvedValue({ count: 1 });

      await updateCloakingSettings('link-1', 'user-1', {
        type: 'META_REFRESH',
      });

      expect(prisma.link.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'link-1',
          userId: 'user-1',
        },
        data: {
          cloakingType: 'META_REFRESH',
        },
      });
    });

    it('should update cloaking title', async () => {
      vi.mocked(prisma.link.updateMany).mockResolvedValue({ count: 1 });

      await updateCloakingSettings('link-1', 'user-1', {
        title: 'New Title',
      });

      expect(prisma.link.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'link-1',
          userId: 'user-1',
        },
        data: {
          cloakingTitle: 'New Title',
        },
      });
    });
  });

  describe('getCloakingStats', () => {
    it('should return stats for limited plan', async () => {
      vi.mocked(prisma.link.count).mockResolvedValue(5);

      const stats = await getCloakingStats('user-1', 'STARTER');

      expect(stats.enabled).toBe(5);
      expect(stats.limit).toBe(10);
      expect(stats.remaining).toBe(5);
      expect(stats.isUnlimited).toBe(false);
    });

    it('should return stats for unlimited plan', async () => {
      vi.mocked(prisma.link.count).mockResolvedValue(100);

      const stats = await getCloakingStats('user-1', 'BUSINESS');

      expect(stats.enabled).toBe(100);
      expect(stats.limit).toBe(-1);
      expect(stats.remaining).toBe(-1);
      expect(stats.isUnlimited).toBe(true);
    });
  });
});
