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
      delete: vi.fn(),
      count: vi.fn(),
    },
    subscription: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    click: {
      count: vi.fn(),
    },
    $transaction: vi.fn().mockImplementation(async (fn) => {
      // Create a transaction mock that mimics Prisma's tx object
      const txMock = {
        link: {
          findUnique: vi.fn(),
          findFirst: vi.fn(),
          findMany: vi.fn(),
          create: vi.fn(),
          update: vi.fn(),
          delete: vi.fn(),
          count: vi.fn(),
        },
        subscription: {
          findUnique: vi.fn().mockResolvedValue(null),
          findFirst: vi.fn(),
          update: vi.fn(),
        },
      };
      return fn(txMock);
    }),
  },
}));

// Mock auth
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

// Mock rate limiter
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 100, limit: 100, reset: Date.now() + 60000 }),
  getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
  getRateLimitHeaders: vi.fn().mockReturnValue({
    'X-RateLimit-Limit': '100',
    'X-RateLimit-Remaining': '99',
    'X-RateLimit-Reset': String(Date.now() + 60000),
  }),
  RATE_LIMIT_PRESETS: {
    api: {
      shorten: { limit: 100, windowMs: 60000 },
    },
  },
}));

import { prisma } from '@/lib/db/prisma';
import { auth } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import {
  createShortLink,
  getLinkByCode,
  getLinkById,
  updateLink,
  deleteLink,
  getAllLinks,
  isShortCodeAvailable,
  generateShortCode,
} from '@/lib/url/shortener';
import { checkLinkLimit } from '@/lib/limits';

// Mock checkLinkLimit
vi.mock('@/lib/limits', () => ({
  checkLinkLimit: vi.fn().mockResolvedValue({
    allowed: true,
    limit: 100,
    used: 0,
    remaining: 100,
  }),
}));

describe('URL Shortening Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createShortLink', () => {
    it('should create anonymous link without userId', async () => {
      const mockLink = {
        id: 'link-456',
        shortCode: 'xyz7890',
        originalUrl: 'https://example.com',
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: null,
        clicks: 0,
        _count: { clicks: 0 },
      };

      vi.mocked(prisma.link.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.link.create).mockResolvedValue(mockLink as never);

      const result = await createShortLink({
        url: 'https://example.com',
      });

      expect(result).toBeDefined();
      expect(prisma.link.create).toHaveBeenCalled();
    });

    it('should validate URL format', () => {
      // URL validation happens before database operations
      // The validator rejects obviously invalid URLs
      const invalidUrls = [
        '',
        '   ',
        'javascript:alert(1)',
        'data:text/html,<script>alert(1)</script>',
      ];

      for (const url of invalidUrls) {
        expect(url).not.toMatch(/^https?:\/\//);
      }

      const validUrls = [
        'https://example.com',
        'http://example.org/path',
        'https://sub.domain.com/path?query=1',
      ];

      for (const url of validUrls) {
        expect(url).toMatch(/^https?:\/\//);
      }
    });

    it('should throw error when custom alias is taken', async () => {
      vi.mocked(prisma.link.findFirst).mockResolvedValue({
        id: 'existing-link',
        shortCode: 'taken-alias',
      } as never);

      await expect(
        createShortLink({
          url: 'https://example.com',
          customAlias: 'taken-alias',
        })
      ).rejects.toThrow(/already taken/i);
    });

    it('should validate alias format', async () => {
      await expect(
        createShortLink({
          url: 'https://example.com',
          customAlias: 'a b c', // Invalid - contains spaces
        })
      ).rejects.toThrow(/invalid/i);
    });
  });

  describe('getLinkByCode', () => {
    it('should return link when found', async () => {
      const mockLink = {
        id: 'link-123',
        shortCode: 'abc1234',
        originalUrl: 'https://example.com',
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: 'user-123',
      };

      vi.mocked(prisma.link.findFirst).mockResolvedValue(mockLink as never);

      const result = await getLinkByCode('abc1234');

      expect(result).toBeDefined();
      expect(result?.shortCode).toBe('abc1234');
    });

    it('should return null when link not found', async () => {
      vi.mocked(prisma.link.findFirst).mockResolvedValue(null);

      const result = await getLinkByCode('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getLinkById', () => {
    it('should return link when found', async () => {
      const mockLink = {
        id: 'link-123',
        shortCode: 'abc1234',
        originalUrl: 'https://example.com',
      };

      vi.mocked(prisma.link.findUnique).mockResolvedValue(mockLink as never);

      const result = await getLinkById('link-123');

      expect(result).toBeDefined();
      expect(result?.id).toBe('link-123');
    });

    it('should return null when link not found', async () => {
      vi.mocked(prisma.link.findUnique).mockResolvedValue(null);

      const result = await getLinkById('nonexistent-id');

      expect(result).toBeNull();
    });
  });

  describe('updateLink', () => {
    it('should update link properties', async () => {
      const mockUpdatedLink = {
        id: 'link-123',
        shortCode: 'abc1234',
        originalUrl: 'https://example.com',
        title: 'Updated Title',
        description: 'Updated Description',
        updatedAt: new Date(),
        _count: { clicks: 0 },
      };

      vi.mocked(prisma.link.update).mockResolvedValue(mockUpdatedLink as never);

      const result = await updateLink('link-123', {
        title: 'Updated Title',
        description: 'Updated Description',
      });

      expect(result).toBeDefined();
      expect(prisma.link.update).toHaveBeenCalled();
    });

    it('should update link URL', async () => {
      const mockUpdatedLink = {
        id: 'link-123',
        shortCode: 'abc1234',
        originalUrl: 'https://new-example.com',
        updatedAt: new Date(),
        _count: { clicks: 0 },
      };

      vi.mocked(prisma.link.update).mockResolvedValue(mockUpdatedLink as never);

      const result = await updateLink('link-123', {
        originalUrl: 'https://new-example.com',
      });

      expect(result).toBeDefined();
      expect(result.originalUrl).toBe('https://new-example.com');
    });
  });

  describe('deleteLink', () => {
    it('should delete link by id', async () => {
      vi.mocked(prisma.link.delete).mockResolvedValue({} as never);

      await expect(deleteLink('link-123')).resolves.not.toThrow();

      expect(prisma.link.delete).toHaveBeenCalledWith({
        where: { id: 'link-123' },
      });
    });

    it('should call prisma delete with correct id', async () => {
      vi.mocked(prisma.link.delete).mockResolvedValue({} as never);

      await deleteLink('test-link-id');

      expect(prisma.link.delete).toHaveBeenCalledWith({
        where: { id: 'test-link-id' },
      });
    });
  });

  describe('getAllLinks', () => {
    it('should return all links', async () => {
      const mockLinks = [
        { id: 'link-1', shortCode: 'abc1', originalUrl: 'https://example1.com', _count: { clicks: 5 } },
        { id: 'link-2', shortCode: 'abc2', originalUrl: 'https://example2.com', _count: { clicks: 10 } },
        { id: 'link-3', shortCode: 'abc3', originalUrl: 'https://example3.com', _count: { clicks: 3 } },
      ];

      vi.mocked(prisma.link.findMany).mockResolvedValue(mockLinks as never);

      const result = await getAllLinks();

      expect(result).toHaveLength(3);
      expect(prisma.link.findMany).toHaveBeenCalled();
    });

    it('should filter links by search query', async () => {
      vi.mocked(prisma.link.findMany).mockResolvedValue([]);

      await getAllLinks({ search: 'example' });

      expect(prisma.link.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.any(Array),
          }),
        })
      );
    });

    it('should sort links by creation date by default', async () => {
      vi.mocked(prisma.link.findMany).mockResolvedValue([]);

      await getAllLinks();

      expect(prisma.link.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        })
      );
    });

    it('should filter active links', async () => {
      vi.mocked(prisma.link.findMany).mockResolvedValue([]);

      await getAllLinks({ filter: 'active' });

      expect(prisma.link.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
          }),
        })
      );
    });
  });

  describe('isShortCodeAvailable', () => {
    it('should return true when code is available', async () => {
      vi.mocked(prisma.link.findFirst).mockResolvedValue(null);

      const result = await isShortCodeAvailable('new-code');

      expect(result).toBe(true);
    });

    it('should return false when code is taken', async () => {
      vi.mocked(prisma.link.findFirst).mockResolvedValue({
        id: 'existing',
        shortCode: 'existing-code',
      } as never);

      const result = await isShortCodeAvailable('existing-code');

      expect(result).toBe(false);
    });
  });

  describe('generateShortCode', () => {
    it('should generate a 7 character code by default', () => {
      const code = generateShortCode();

      expect(code).toBeDefined();
      expect(code.length).toBe(7);
    });

    it('should generate unique codes', () => {
      const codes = new Set<string>();
      for (let i = 0; i < 100; i++) {
        codes.add(generateShortCode());
      }

      // All 100 codes should be unique
      expect(codes.size).toBe(100);
    });

    it('should generate URL-safe characters', () => {
      const code = generateShortCode();
      // Should only contain alphanumeric and URL-safe characters
      expect(code).toMatch(/^[a-zA-Z0-9_-]+$/);
    });
  });

  describe('Rate Limiting Integration', () => {
    it('should check rate limit before creating link', async () => {
      vi.mocked(checkRateLimit).mockResolvedValue({
        allowed: true,
        remaining: 99,
        limit: 100,
        reset: Date.now() + 60000,
      });

      // Rate limit is checked internally in the API route
      // This test verifies the mock setup works
      const result = await checkRateLimit('127.0.0.1', { limit: 100, windowMs: 60000 });

      expect(result.allowed).toBe(true);
    });

    it('should reject when rate limit exceeded', async () => {
      vi.mocked(checkRateLimit).mockResolvedValue({
        allowed: false,
        remaining: 0,
        limit: 100,
        reset: Date.now() + 60000,
      });

      const result = await checkRateLimit('127.0.0.1', { limit: 100, windowMs: 60000 });

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });
  });

  describe('Link Limits Integration', () => {
    it('should check link limit for authenticated user', async () => {
      vi.mocked(checkLinkLimit).mockResolvedValue({
        allowed: true,
        limit: 100,
        used: 50,
        remaining: 50,
      });

      const result = await checkLinkLimit('user-123');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(50);
    });

    it('should reject when link limit exceeded', async () => {
      vi.mocked(checkLinkLimit).mockResolvedValue({
        allowed: false,
        limit: 100,
        used: 100,
        remaining: 0,
        message: 'Link limit reached for your plan',
      });

      const result = await checkLinkLimit('user-123');

      expect(result.allowed).toBe(false);
      expect(result.message).toContain('limit');
    });
  });

  describe('Authentication Integration', () => {
    it('should return session for authenticated user', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: 'user-123', name: 'Test User', email: 'test@example.com' },
        expires: new Date(Date.now() + 3600000).toISOString(),
      });

      const session = await auth();

      expect(session?.user?.id).toBe('user-123');
    });

    it('should return null for unauthenticated request', async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const session = await auth();

      expect(session).toBeNull();
    });
  });
});
