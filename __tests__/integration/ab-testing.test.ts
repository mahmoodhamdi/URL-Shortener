import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    aBTest: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    aBVariant: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      updateMany: vi.fn(),
    },
    link: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    subscription: {
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from '@/lib/db/prisma';
import {
  canCreateABTest,
  canAddVariant,
  selectRandomVariant,
} from '@/lib/ab-testing';
import type { Variant } from '@/lib/ab-testing/selector';

describe('A/B Testing Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('canCreateABTest', () => {
    it('should allow Enterprise users unlimited tests', async () => {
      vi.mocked(prisma.aBTest.count).mockResolvedValue(100);

      const result = await canCreateABTest('user-1', 'ENTERPRISE');

      expect(result.allowed).toBe(true);
    });

    it('should not allow FREE users to create A/B tests', async () => {
      const result = await canCreateABTest('user-1', 'FREE');

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('not available');
    });

    it('should allow STARTER users to create 1 test', async () => {
      vi.mocked(prisma.aBTest.count).mockResolvedValue(0);

      const result = await canCreateABTest('user-1', 'STARTER');

      expect(result.allowed).toBe(true);
    });

    it('should not allow STARTER users to exceed 1 test', async () => {
      vi.mocked(prisma.aBTest.count).mockResolvedValue(1);

      const result = await canCreateABTest('user-1', 'STARTER');

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('limit');
    });

    it('should allow PRO users up to 5 tests', async () => {
      vi.mocked(prisma.aBTest.count).mockResolvedValue(4);

      const result = await canCreateABTest('user-1', 'PRO');

      expect(result.allowed).toBe(true);
    });

    it('should not allow PRO users to exceed 5 tests', async () => {
      vi.mocked(prisma.aBTest.count).mockResolvedValue(5);

      const result = await canCreateABTest('user-1', 'PRO');

      expect(result.allowed).toBe(false);
    });

    it('should allow BUSINESS users up to 20 tests', async () => {
      vi.mocked(prisma.aBTest.count).mockResolvedValue(19);

      const result = await canCreateABTest('user-1', 'BUSINESS');

      expect(result.allowed).toBe(true);
    });
  });

  describe('canAddVariant', () => {
    it('should allow Enterprise users unlimited variants', () => {
      const result = canAddVariant(100, 'ENTERPRISE');

      expect(result.allowed).toBe(true);
    });

    it('should not allow FREE users to add variants', () => {
      const result = canAddVariant(0, 'FREE');

      expect(result.allowed).toBe(false);
    });

    it('should allow STARTER users up to 2 variants', () => {
      expect(canAddVariant(1, 'STARTER').allowed).toBe(true);
      expect(canAddVariant(2, 'STARTER').allowed).toBe(false);
    });

    it('should allow PRO users up to 4 variants', () => {
      expect(canAddVariant(3, 'PRO').allowed).toBe(true);
      expect(canAddVariant(4, 'PRO').allowed).toBe(false);
    });

    it('should allow BUSINESS users up to 6 variants', () => {
      expect(canAddVariant(5, 'BUSINESS').allowed).toBe(true);
      expect(canAddVariant(6, 'BUSINESS').allowed).toBe(false);
    });
  });

  describe('selectRandomVariant', () => {
    it('should return null for empty variants', () => {
      const result = selectRandomVariant([]);
      expect(result).toBeNull();
    });

    it('should return a valid variant', () => {
      const variants: Variant[] = [
        { id: '1', name: 'Control', url: 'http://a.com', weight: 50 },
        { id: '2', name: 'Variant', url: 'http://b.com', weight: 50 },
      ];

      const result = selectRandomVariant(variants);

      expect(result).not.toBeNull();
      expect(['1', '2']).toContain(result?.id);
    });

    it('should always return variant with 100% weight', () => {
      const variants: Variant[] = [
        { id: '1', name: 'Control', url: 'http://a.com', weight: 100 },
        { id: '2', name: 'Variant', url: 'http://b.com', weight: 0 },
      ];

      for (let i = 0; i < 10; i++) {
        const result = selectRandomVariant(variants);
        expect(result?.id).toBe('1');
      }
    });
  });
});
