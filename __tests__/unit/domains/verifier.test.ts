import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock DNS with proper structure
vi.mock('dns', () => ({
  default: {
    resolveTxt: vi.fn(),
  },
  resolveTxt: vi.fn(),
}));

// Mock util with proper structure
vi.mock('util', async (importOriginal) => {
  const actual = await importOriginal<typeof import('util')>();
  return {
    ...actual,
    promisify: vi.fn((fn) => fn),
  };
});

// Mock prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    customDomain: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

import {
  generateVerifyToken,
  getExpectedTxtRecord,
  getVerificationRecordName,
  isValidDomain,
  normalizeDomain,
  DNS_VERIFICATION_PREFIX,
} from '@/lib/domains/verifier';

describe('Domain Verifier', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateVerifyToken', () => {
    it('should generate a 32-character token', () => {
      const token = generateVerifyToken();
      expect(token).toHaveLength(32);
    });

    it('should generate unique tokens', () => {
      const token1 = generateVerifyToken();
      const token2 = generateVerifyToken();
      expect(token1).not.toBe(token2);
    });
  });

  describe('getExpectedTxtRecord', () => {
    it('should return TXT record with prefix', () => {
      const token = 'abc123';
      const expected = getExpectedTxtRecord(token);
      expect(expected).toBe(`${DNS_VERIFICATION_PREFIX}abc123`);
    });
  });

  describe('getVerificationRecordName', () => {
    it('should return _url-shortener subdomain', () => {
      const recordName = getVerificationRecordName('example.com');
      expect(recordName).toBe('_url-shortener.example.com');
    });
  });

  describe('isValidDomain', () => {
    it('should accept valid domains', () => {
      expect(isValidDomain('example.com')).toBe(true);
      expect(isValidDomain('sub.example.com')).toBe(true);
      expect(isValidDomain('my-domain.org')).toBe(true);
      expect(isValidDomain('example.co.uk')).toBe(true);
    });

    it('should reject invalid domains', () => {
      expect(isValidDomain('')).toBe(false);
      expect(isValidDomain('example')).toBe(false);
      expect(isValidDomain('-example.com')).toBe(false);
      expect(isValidDomain('example-.com')).toBe(false);
      expect(isValidDomain('exam ple.com')).toBe(false);
      expect(isValidDomain('example..com')).toBe(false);
    });

    it('should reject URLs and protocols', () => {
      expect(isValidDomain('http://example.com')).toBe(false);
      expect(isValidDomain('https://example.com')).toBe(false);
    });
  });

  describe('normalizeDomain', () => {
    it('should lowercase the domain', () => {
      expect(normalizeDomain('EXAMPLE.COM')).toBe('example.com');
      expect(normalizeDomain('Example.Com')).toBe('example.com');
    });

    it('should trim whitespace', () => {
      expect(normalizeDomain('  example.com  ')).toBe('example.com');
    });

    it('should remove trailing dots', () => {
      expect(normalizeDomain('example.com.')).toBe('example.com');
      expect(normalizeDomain('example.com...')).toBe('example.com');
    });
  });
});
