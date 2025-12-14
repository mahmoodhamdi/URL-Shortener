import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    retargetingPixel: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    linkPixel: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    link: {
      findFirst: vi.fn(),
    },
    subscription: {
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from '@/lib/db/prisma';
import {
  canCreatePixel,
  canAddPixelToLink,
  isPixelsAvailable,
  PIXEL_LIMITS,
} from '@/lib/retargeting';

describe('Retargeting Pixels Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('PIXEL_LIMITS', () => {
    it('should have correct limits for FREE plan', () => {
      expect(PIXEL_LIMITS.FREE).toEqual({ pixels: 0, linksWithPixels: 0 });
    });

    it('should have correct limits for STARTER plan', () => {
      expect(PIXEL_LIMITS.STARTER).toEqual({ pixels: 1, linksWithPixels: 10 });
    });

    it('should have correct limits for PRO plan', () => {
      expect(PIXEL_LIMITS.PRO).toEqual({ pixels: 5, linksWithPixels: 50 });
    });

    it('should have correct limits for BUSINESS plan', () => {
      expect(PIXEL_LIMITS.BUSINESS).toEqual({ pixels: 20, linksWithPixels: -1 });
    });

    it('should have correct limits for ENTERPRISE plan', () => {
      expect(PIXEL_LIMITS.ENTERPRISE).toEqual({ pixels: -1, linksWithPixels: -1 });
    });
  });

  describe('isPixelsAvailable', () => {
    it('should return false for FREE plan', () => {
      expect(isPixelsAvailable('FREE')).toBe(false);
    });

    it('should return true for STARTER plan', () => {
      expect(isPixelsAvailable('STARTER')).toBe(true);
    });

    it('should return true for PRO plan', () => {
      expect(isPixelsAvailable('PRO')).toBe(true);
    });

    it('should return true for BUSINESS plan', () => {
      expect(isPixelsAvailable('BUSINESS')).toBe(true);
    });

    it('should return true for ENTERPRISE plan', () => {
      expect(isPixelsAvailable('ENTERPRISE')).toBe(true);
    });
  });

  describe('canCreatePixel', () => {
    it('should allow ENTERPRISE users unlimited pixels', async () => {
      vi.mocked(prisma.retargetingPixel.count).mockResolvedValue(100);

      const result = await canCreatePixel('user-1', 'ENTERPRISE');

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(-1);
    });

    it('should allow STARTER users 1 pixel', async () => {
      vi.mocked(prisma.retargetingPixel.count).mockResolvedValue(0);

      const result = await canCreatePixel('user-1', 'STARTER');

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(1);
    });

    it('should not allow STARTER users to exceed 1 pixel', async () => {
      vi.mocked(prisma.retargetingPixel.count).mockResolvedValue(1);

      const result = await canCreatePixel('user-1', 'STARTER');

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('limit');
    });

    it('should allow PRO users up to 5 pixels', async () => {
      vi.mocked(prisma.retargetingPixel.count).mockResolvedValue(4);

      const result = await canCreatePixel('user-1', 'PRO');

      expect(result.allowed).toBe(true);
    });

    it('should not allow PRO users to exceed 5 pixels', async () => {
      vi.mocked(prisma.retargetingPixel.count).mockResolvedValue(5);

      const result = await canCreatePixel('user-1', 'PRO');

      expect(result.allowed).toBe(false);
    });

    it('should allow BUSINESS users up to 20 pixels', async () => {
      vi.mocked(prisma.retargetingPixel.count).mockResolvedValue(19);

      const result = await canCreatePixel('user-1', 'BUSINESS');

      expect(result.allowed).toBe(true);
    });
  });

  describe('canAddPixelToLink', () => {
    it('should allow ENTERPRISE users unlimited links with pixels', async () => {
      vi.mocked(prisma.linkPixel.count).mockResolvedValue(1000);
      vi.mocked(prisma.linkPixel.groupBy).mockResolvedValue([]);

      const result = await canAddPixelToLink('user-1', 'ENTERPRISE');

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(-1);
    });

    it('should allow BUSINESS users unlimited links with pixels', async () => {
      vi.mocked(prisma.linkPixel.count).mockResolvedValue(1000);
      vi.mocked(prisma.linkPixel.groupBy).mockResolvedValue([]);

      const result = await canAddPixelToLink('user-1', 'BUSINESS');

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(-1);
    });

    it('should allow STARTER users up to 10 links with pixels', async () => {
      vi.mocked(prisma.linkPixel.count).mockResolvedValue(9);
      vi.mocked(prisma.linkPixel.groupBy).mockResolvedValue(
        Array(9).fill({ linkId: 'link-id' }) as never
      );

      const result = await canAddPixelToLink('user-1', 'STARTER');

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(10);
    });

    it('should not allow STARTER users to exceed 10 links with pixels', async () => {
      vi.mocked(prisma.linkPixel.count).mockResolvedValue(10);
      vi.mocked(prisma.linkPixel.groupBy).mockResolvedValue(
        Array(10).fill({ linkId: 'link-id' }) as never
      );

      const result = await canAddPixelToLink('user-1', 'STARTER');

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('limit');
    });

    it('should allow PRO users up to 50 links with pixels', async () => {
      vi.mocked(prisma.linkPixel.count).mockResolvedValue(49);
      vi.mocked(prisma.linkPixel.groupBy).mockResolvedValue(
        Array(49).fill({ linkId: 'link-id' }) as never
      );

      const result = await canAddPixelToLink('user-1', 'PRO');

      expect(result.allowed).toBe(true);
    });

    it('should not allow PRO users to exceed 50 links with pixels', async () => {
      vi.mocked(prisma.linkPixel.count).mockResolvedValue(50);
      vi.mocked(prisma.linkPixel.groupBy).mockResolvedValue(
        Array(50).fill({ linkId: 'link-id' }) as never
      );

      const result = await canAddPixelToLink('user-1', 'PRO');

      expect(result.allowed).toBe(false);
    });
  });
});
