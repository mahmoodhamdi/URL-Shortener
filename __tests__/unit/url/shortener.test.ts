import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateShortCode,
  isLinkExpired,
  getShortUrl,
} from '@/lib/url/shortener';
import type { Link } from '@/types';

// Mock nanoid
vi.mock('nanoid', () => ({
  nanoid: vi.fn(() => 'abc1234'),
}));

describe('URL Shortener', () => {
  describe('generateShortCode', () => {
    it('should generate a short code', () => {
      const code = generateShortCode();
      expect(code).toBeDefined();
      expect(typeof code).toBe('string');
    });

    it('should generate a 7 character code', () => {
      const code = generateShortCode();
      expect(code.length).toBe(7);
    });

    it('should generate consistent code (mocked)', () => {
      const code1 = generateShortCode();
      const code2 = generateShortCode();
      expect(code1).toBe('abc1234');
      expect(code2).toBe('abc1234');
    });
  });

  describe('isLinkExpired', () => {
    const createMockLink = (expiresAt: Date | null): Link => ({
      id: 'test-id',
      originalUrl: 'https://example.com',
      shortCode: 'abc1234',
      customAlias: null,
      title: null,
      description: null,
      password: null,
      expiresAt,
      isActive: true,
      isFavorite: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: null,
      folderId: null,
      customDomainId: null,
      workspaceId: null,
      utmSource: null,
      utmMedium: null,
      utmCampaign: null,
      utmTerm: null,
      utmContent: null,
      cloakingEnabled: false,
      cloakingType: null,
      cloakingTitle: null,
      cloakingFavicon: null,
      deepLinkEnabled: false,
      deepLinkConfig: null,
      _count: { clicks: 0 },
    });

    it('should return false for link without expiration', () => {
      const link = createMockLink(null);
      expect(isLinkExpired(link)).toBe(false);
    });

    it('should return false for link with future expiration', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7); // 7 days in future
      const link = createMockLink(futureDate);
      expect(isLinkExpired(link)).toBe(false);
    });

    it('should return true for link with past expiration', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1); // 1 day in past
      const link = createMockLink(pastDate);
      expect(isLinkExpired(link)).toBe(true);
    });

    it('should return true for link that just expired', () => {
      const justExpired = new Date(Date.now() - 1000); // 1 second ago
      const link = createMockLink(justExpired);
      expect(isLinkExpired(link)).toBe(true);
    });

    it('should return false for link expiring in 1 second', () => {
      const aboutToExpire = new Date(Date.now() + 1000); // 1 second from now
      const link = createMockLink(aboutToExpire);
      expect(isLinkExpired(link)).toBe(false);
    });
  });

  describe('getShortUrl', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      vi.resetModules();
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should use provided baseUrl', () => {
      const url = getShortUrl('abc123', 'https://short.io');
      expect(url).toBe('https://short.io/abc123');
    });

    it('should use environment variable when no baseUrl provided', () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://myapp.com';
      const url = getShortUrl('abc123');
      expect(url).toBe('https://myapp.com/abc123');
    });

    it('should fall back to localhost when no baseUrl or env var', () => {
      delete process.env.NEXT_PUBLIC_APP_URL;
      const url = getShortUrl('abc123');
      expect(url).toBe('http://localhost:3000/abc123');
    });

    it('should handle custom alias codes', () => {
      const url = getShortUrl('my-custom-alias', 'https://short.io');
      expect(url).toBe('https://short.io/my-custom-alias');
    });

    it('should handle codes with special characters', () => {
      const url = getShortUrl('test-123_abc', 'https://short.io');
      expect(url).toBe('https://short.io/test-123_abc');
    });

    it('should handle trailing slashes in baseUrl correctly', () => {
      // Note: Current implementation doesn't strip trailing slashes
      // This test documents current behavior
      const url = getShortUrl('abc123', 'https://short.io/');
      expect(url).toBe('https://short.io//abc123');
    });
  });
});

// Add afterEach to ensure cleanup
import { afterEach } from 'vitest';
