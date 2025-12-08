import { describe, it, expect } from 'vitest';
import {
  isValidUrl,
  isValidAlias,
  normalizeUrl,
  urlSchema,
  aliasSchema,
} from '@/lib/url/validator';

describe('URL Validator', () => {
  describe('isValidUrl', () => {
    it('should return true for valid URLs', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('http://example.com')).toBe(true);
      expect(isValidUrl('https://example.com/path/to/page')).toBe(true);
      expect(isValidUrl('https://sub.example.com')).toBe(true);
      expect(isValidUrl('https://example.com?query=1')).toBe(true);
      expect(isValidUrl('https://example.com#hash')).toBe(true);
    });

    it('should return false for invalid URLs', () => {
      expect(isValidUrl('')).toBe(false);
      expect(isValidUrl('not-a-url')).toBe(false);
      expect(isValidUrl('//example.com')).toBe(false);
    });

    it('should accept ftp:// URLs (valid URL format)', () => {
      // Zod's url() schema accepts any valid URL including ftp://
      expect(isValidUrl('ftp://example.com')).toBe(true);
    });
  });

  describe('isValidAlias', () => {
    it('should return true for valid aliases', () => {
      expect(isValidAlias('my-link')).toBe(true);
      expect(isValidAlias('abc')).toBe(true);
      expect(isValidAlias('link123')).toBe(true);
      expect(isValidAlias('my-custom-link-2024')).toBe(true);
    });

    it('should return true for undefined alias', () => {
      expect(isValidAlias(undefined as unknown as string)).toBe(true);
    });

    it('should return false for invalid aliases', () => {
      expect(isValidAlias('ab')).toBe(false); // too short
      expect(isValidAlias('a'.repeat(51))).toBe(false); // too long
      expect(isValidAlias('my_link')).toBe(false); // underscore not allowed
      expect(isValidAlias('my link')).toBe(false); // space not allowed
      expect(isValidAlias('link@123')).toBe(false); // special char not allowed
    });
  });

  describe('normalizeUrl', () => {
    it('should add https:// if protocol is missing', () => {
      expect(normalizeUrl('example.com')).toBe('https://example.com');
      expect(normalizeUrl('www.example.com')).toBe('https://www.example.com');
    });

    it('should keep existing protocol', () => {
      expect(normalizeUrl('https://example.com')).toBe('https://example.com');
      expect(normalizeUrl('http://example.com')).toBe('http://example.com');
    });

    it('should trim whitespace', () => {
      expect(normalizeUrl('  https://example.com  ')).toBe('https://example.com');
    });
  });

  describe('urlSchema', () => {
    it('should validate correct URLs', () => {
      expect(() => urlSchema.parse('https://example.com')).not.toThrow();
    });

    it('should throw for invalid URLs', () => {
      expect(() => urlSchema.parse('')).toThrow();
      expect(() => urlSchema.parse('invalid')).toThrow();
    });
  });

  describe('aliasSchema', () => {
    it('should validate correct aliases', () => {
      expect(() => aliasSchema.parse('my-link')).not.toThrow();
      expect(() => aliasSchema.parse(undefined)).not.toThrow();
    });

    it('should throw for invalid aliases', () => {
      expect(() => aliasSchema.parse('ab')).toThrow();
      expect(() => aliasSchema.parse('invalid_alias!')).toThrow();
    });
  });
});
