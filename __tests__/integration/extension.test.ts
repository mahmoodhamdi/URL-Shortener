import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    extensionToken: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
    },
    subscription: {
      findUnique: vi.fn(),
    },
    link: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { prisma } from '@/lib/db/prisma';
import {
  EXTENSION_LIMITS,
  canCreateExtensionToken,
  createExtensionToken,
  validateExtensionToken,
  getExtensionTokens,
  deleteExtensionToken,
  getExtensionStats,
} from '@/lib/extension';

describe('Extension Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('canCreateExtensionToken', () => {
    it('should allow FREE users to create 1 token', async () => {
      vi.mocked(prisma.extensionToken.count).mockResolvedValue(0);

      const result = await canCreateExtensionToken('user-1', 'FREE');

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(1);
      expect(result.current).toBe(0);
    });

    it('should not allow FREE users to exceed 1 token', async () => {
      vi.mocked(prisma.extensionToken.count).mockResolvedValue(1);

      const result = await canCreateExtensionToken('user-1', 'FREE');

      expect(result.allowed).toBe(false);
      expect(result.limit).toBe(1);
      expect(result.reason).toContain('limit');
    });

    it('should allow STARTER users up to 3 tokens', async () => {
      vi.mocked(prisma.extensionToken.count).mockResolvedValue(2);

      const result = await canCreateExtensionToken('user-1', 'STARTER');

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(3);
    });

    it('should allow PRO users up to 10 tokens', async () => {
      vi.mocked(prisma.extensionToken.count).mockResolvedValue(5);

      const result = await canCreateExtensionToken('user-1', 'PRO');

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(10);
    });

    it('should allow BUSINESS users unlimited tokens', async () => {
      vi.mocked(prisma.extensionToken.count).mockResolvedValue(100);

      const result = await canCreateExtensionToken('user-1', 'BUSINESS');

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(-1);
    });

    it('should allow ENTERPRISE users unlimited tokens', async () => {
      vi.mocked(prisma.extensionToken.count).mockResolvedValue(500);

      const result = await canCreateExtensionToken('user-1', 'ENTERPRISE');

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(-1);
    });
  });

  describe('createExtensionToken', () => {
    it('should create a token with default name', async () => {
      const mockToken = {
        id: 'token-1',
        userId: 'user-1',
        token: 'ext_abc123',
        name: 'Browser Extension',
        createdAt: new Date(),
      };

      vi.mocked(prisma.extensionToken.create).mockResolvedValue(mockToken as never);

      const result = await createExtensionToken('user-1');

      expect(result.name).toBe('Browser Extension');
      expect(prisma.extensionToken.create).toHaveBeenCalled();
    });

    it('should create a token with custom name', async () => {
      const mockToken = {
        id: 'token-1',
        userId: 'user-1',
        token: 'ext_abc123',
        name: 'My Custom Token',
        createdAt: new Date(),
      };

      vi.mocked(prisma.extensionToken.create).mockResolvedValue(mockToken as never);

      const result = await createExtensionToken('user-1', { name: 'My Custom Token' });

      expect(result.name).toBe('My Custom Token');
    });

    it('should create a token with device info', async () => {
      const mockToken = {
        id: 'token-1',
        userId: 'user-1',
        token: 'ext_abc123',
        name: 'Browser Extension',
        deviceInfo: 'Chrome on Windows',
        createdAt: new Date(),
      };

      vi.mocked(prisma.extensionToken.create).mockResolvedValue(mockToken as never);

      const result = await createExtensionToken('user-1', {
        deviceInfo: 'Chrome on Windows',
      });

      expect(result.deviceInfo).toBe('Chrome on Windows');
    });
  });

  describe('validateExtensionToken', () => {
    it('should return invalid for non-existent token', async () => {
      vi.mocked(prisma.extensionToken.findUnique).mockResolvedValue(null);

      const result = await validateExtensionToken('ext_invalid');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid token');
    });

    it('should return invalid for expired token', async () => {
      const expiredToken = {
        id: 'token-1',
        userId: 'user-1',
        token: 'ext_abc123',
        expiresAt: new Date(Date.now() - 86400000), // Yesterday
        user: {
          id: 'user-1',
          name: 'Test User',
          email: 'test@example.com',
          subscription: { plan: 'FREE' },
        },
      };

      vi.mocked(prisma.extensionToken.findUnique).mockResolvedValue(expiredToken as never);

      const result = await validateExtensionToken('ext_abc123');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Token has expired');
    });

    it('should return valid for active token', async () => {
      const validToken = {
        id: 'token-1',
        userId: 'user-1',
        token: 'ext_abc123',
        expiresAt: null,
        user: {
          id: 'user-1',
          name: 'Test User',
          email: 'test@example.com',
          subscription: { plan: 'PRO' },
        },
      };

      vi.mocked(prisma.extensionToken.findUnique).mockResolvedValue(validToken as never);
      vi.mocked(prisma.extensionToken.update).mockResolvedValue(validToken as never);

      const result = await validateExtensionToken('ext_abc123');

      expect(result.valid).toBe(true);
      expect(result.user?.id).toBe('user-1');
      expect(result.plan).toBe('PRO');
    });

    it('should update lastUsedAt on validation', async () => {
      const validToken = {
        id: 'token-1',
        userId: 'user-1',
        token: 'ext_abc123',
        expiresAt: null,
        user: {
          id: 'user-1',
          name: 'Test User',
          email: 'test@example.com',
          subscription: null,
        },
      };

      vi.mocked(prisma.extensionToken.findUnique).mockResolvedValue(validToken as never);
      vi.mocked(prisma.extensionToken.update).mockResolvedValue(validToken as never);

      await validateExtensionToken('ext_abc123');

      expect(prisma.extensionToken.update).toHaveBeenCalledWith({
        where: { id: 'token-1' },
        data: { lastUsedAt: expect.any(Date) },
      });
    });
  });

  describe('getExtensionTokens', () => {
    it('should return all tokens for a user', async () => {
      const mockTokens = [
        { id: 'token-1', name: 'Token 1', createdAt: new Date() },
        { id: 'token-2', name: 'Token 2', createdAt: new Date() },
      ];

      vi.mocked(prisma.extensionToken.findMany).mockResolvedValue(mockTokens as never);

      const result = await getExtensionTokens('user-1');

      expect(result).toHaveLength(2);
      expect(prisma.extensionToken.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('deleteExtensionToken', () => {
    it('should delete a token for the owner', async () => {
      vi.mocked(prisma.extensionToken.deleteMany).mockResolvedValue({ count: 1 });

      const result = await deleteExtensionToken('token-1', 'user-1');

      expect(result.count).toBe(1);
      expect(prisma.extensionToken.deleteMany).toHaveBeenCalledWith({
        where: {
          id: 'token-1',
          userId: 'user-1',
        },
      });
    });

    it('should not delete token for non-owner', async () => {
      vi.mocked(prisma.extensionToken.deleteMany).mockResolvedValue({ count: 0 });

      const result = await deleteExtensionToken('token-1', 'other-user');

      expect(result.count).toBe(0);
    });
  });

  describe('getExtensionStats', () => {
    it('should return correct stats for limited plan', async () => {
      vi.mocked(prisma.extensionToken.count).mockResolvedValue(2);

      const stats = await getExtensionStats('user-1', 'STARTER');

      expect(stats.tokens).toBe(2);
      expect(stats.limit).toBe(3);
      expect(stats.remaining).toBe(1);
      expect(stats.isUnlimited).toBe(false);
    });

    it('should return correct stats for unlimited plan', async () => {
      vi.mocked(prisma.extensionToken.count).mockResolvedValue(50);

      const stats = await getExtensionStats('user-1', 'BUSINESS');

      expect(stats.tokens).toBe(50);
      expect(stats.limit).toBe(-1);
      expect(stats.remaining).toBe(-1);
      expect(stats.isUnlimited).toBe(true);
    });
  });
});
