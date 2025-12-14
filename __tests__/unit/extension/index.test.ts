import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  EXTENSION_LIMITS,
  isExtensionAvailable,
  generateExtensionToken,
} from '@/lib/extension';

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
  },
}));

describe('Extension Library', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('EXTENSION_LIMITS', () => {
    it('should have correct limits for FREE plan', () => {
      expect(EXTENSION_LIMITS.FREE).toBe(1);
    });

    it('should have correct limits for STARTER plan', () => {
      expect(EXTENSION_LIMITS.STARTER).toBe(3);
    });

    it('should have correct limits for PRO plan', () => {
      expect(EXTENSION_LIMITS.PRO).toBe(10);
    });

    it('should have correct limits for BUSINESS plan (unlimited)', () => {
      expect(EXTENSION_LIMITS.BUSINESS).toBe(-1);
    });

    it('should have correct limits for ENTERPRISE plan (unlimited)', () => {
      expect(EXTENSION_LIMITS.ENTERPRISE).toBe(-1);
    });
  });

  describe('isExtensionAvailable', () => {
    it('should return true for FREE plan (1 token allowed)', () => {
      expect(isExtensionAvailable('FREE')).toBe(true);
    });

    it('should return true for STARTER plan', () => {
      expect(isExtensionAvailable('STARTER')).toBe(true);
    });

    it('should return true for PRO plan', () => {
      expect(isExtensionAvailable('PRO')).toBe(true);
    });

    it('should return true for BUSINESS plan', () => {
      expect(isExtensionAvailable('BUSINESS')).toBe(true);
    });

    it('should return true for ENTERPRISE plan', () => {
      expect(isExtensionAvailable('ENTERPRISE')).toBe(true);
    });
  });

  describe('generateExtensionToken', () => {
    it('should generate a token starting with ext_', () => {
      const token = generateExtensionToken();
      expect(token).toMatch(/^ext_/);
    });

    it('should generate a token with correct length', () => {
      const token = generateExtensionToken();
      // ext_ (4) + nanoid(32) = 36 characters
      expect(token.length).toBe(36);
    });

    it('should generate unique tokens', () => {
      const token1 = generateExtensionToken();
      const token2 = generateExtensionToken();
      expect(token1).not.toBe(token2);
    });
  });
});
