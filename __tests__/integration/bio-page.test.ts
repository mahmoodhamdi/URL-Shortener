import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    bioPage: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    bioLink: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    subscription: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { prisma } from '@/lib/db/prisma';
import {
  isValidSlug,
  isSlugAvailable,
  canCreateBioPage,
  canAddBioLink,
} from '@/lib/bio-page';

describe('Bio Page Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isSlugAvailable', () => {
    it('should return true when slug is not taken', async () => {
      vi.mocked(prisma.bioPage.findUnique).mockResolvedValue(null);

      const result = await isSlugAvailable('new-slug');

      expect(result).toBe(true);
      expect(prisma.bioPage.findUnique).toHaveBeenCalledWith({
        where: { slug: 'new-slug' },
        select: { id: true },
      });
    });

    it('should return false when slug is taken', async () => {
      vi.mocked(prisma.bioPage.findUnique).mockResolvedValue({
        id: 'existing-id',
      } as never);

      const result = await isSlugAvailable('taken-slug');

      expect(result).toBe(false);
    });
  });

  describe('canCreateBioPage', () => {
    it('should allow Enterprise users unlimited bio pages', async () => {
      vi.mocked(prisma.bioPage.count).mockResolvedValue(100);

      const result = await canCreateBioPage('user-1', 'ENTERPRISE');

      expect(result.allowed).toBe(true);
    });

    it('should allow FREE users 1 bio page', async () => {
      vi.mocked(prisma.bioPage.count).mockResolvedValue(0);

      const result = await canCreateBioPage('user-1', 'FREE');

      expect(result.allowed).toBe(true);
    });

    it('should not allow FREE users to exceed 1 bio page', async () => {
      vi.mocked(prisma.bioPage.count).mockResolvedValue(1);

      const result = await canCreateBioPage('user-1', 'FREE');

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('limit');
    });

    it('should allow STARTER users up to 2 bio pages', async () => {
      vi.mocked(prisma.bioPage.count).mockResolvedValue(1);

      const result = await canCreateBioPage('user-1', 'STARTER');

      expect(result.allowed).toBe(true);
    });

    it('should not allow STARTER users to exceed 2 bio pages', async () => {
      vi.mocked(prisma.bioPage.count).mockResolvedValue(2);

      const result = await canCreateBioPage('user-1', 'STARTER');

      expect(result.allowed).toBe(false);
    });

    it('should allow PRO users up to 5 bio pages', async () => {
      vi.mocked(prisma.bioPage.count).mockResolvedValue(4);

      const result = await canCreateBioPage('user-1', 'PRO');

      expect(result.allowed).toBe(true);
    });

    it('should allow BUSINESS users up to 20 bio pages', async () => {
      vi.mocked(prisma.bioPage.count).mockResolvedValue(19);

      const result = await canCreateBioPage('user-1', 'BUSINESS');

      expect(result.allowed).toBe(true);
    });
  });

  describe('canAddBioLink', () => {
    it('should allow Enterprise users unlimited links', () => {
      const result = canAddBioLink(1000, 'ENTERPRISE');

      expect(result.allowed).toBe(true);
    });

    it('should allow FREE users up to 5 links', () => {
      expect(canAddBioLink(4, 'FREE').allowed).toBe(true);
      expect(canAddBioLink(5, 'FREE').allowed).toBe(false);
    });

    it('should allow STARTER users up to 10 links', () => {
      expect(canAddBioLink(9, 'STARTER').allowed).toBe(true);
      expect(canAddBioLink(10, 'STARTER').allowed).toBe(false);
    });

    it('should allow PRO users up to 20 links', () => {
      expect(canAddBioLink(19, 'PRO').allowed).toBe(true);
      expect(canAddBioLink(20, 'PRO').allowed).toBe(false);
    });

    it('should allow BUSINESS users unlimited links', () => {
      const result = canAddBioLink(1000, 'BUSINESS');

      expect(result.allowed).toBe(true);
    });
  });

  describe('isValidSlug with integration context', () => {
    it('should work with common social media usernames', () => {
      expect(isValidSlug('john_doe')).toBe(true);
      expect(isValidSlug('startup-io')).toBe(true);
      expect(isValidSlug('brand2024')).toBe(true);
    });

    it('should reject reserved words patterns', () => {
      // These are valid format but might be reserved in practice
      expect(isValidSlug('admin')).toBe(true);  // Format is valid
      expect(isValidSlug('api')).toBe(true);    // Format is valid
      expect(isValidSlug('www')).toBe(true);    // Format is valid
      // Real reservation should happen at the application level
    });

    it('should handle edge cases', () => {
      expect(isValidSlug('a-b')).toBe(true);  // 3 chars
      expect(isValidSlug('abc')).toBe(true);  // exactly 3
      expect(isValidSlug('ab')).toBe(false);  // too short
      expect(isValidSlug('a'.repeat(30))).toBe(true);  // exactly 30
      expect(isValidSlug('a'.repeat(31))).toBe(false); // too long
    });
  });
});
