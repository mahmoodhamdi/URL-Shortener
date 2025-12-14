import { describe, it, expect } from 'vitest';
import { isValidSlug } from '@/lib/bio-page';

describe('Bio Page Validation', () => {
  describe('isValidSlug', () => {
    it('should accept valid alphanumeric slugs', () => {
      expect(isValidSlug('john')).toBe(true);
      expect(isValidSlug('john123')).toBe(true);
      expect(isValidSlug('user42')).toBe(true);
    });

    it('should accept slugs with hyphens', () => {
      expect(isValidSlug('john-doe')).toBe(true);
      expect(isValidSlug('my-page')).toBe(true);
      expect(isValidSlug('test-user-1')).toBe(true);
    });

    it('should accept slugs with underscores', () => {
      expect(isValidSlug('john_doe')).toBe(true);
      expect(isValidSlug('my_page')).toBe(true);
      expect(isValidSlug('test_user_1')).toBe(true);
    });

    it('should accept mixed slugs', () => {
      expect(isValidSlug('john-doe_123')).toBe(true);
      expect(isValidSlug('my_page-1')).toBe(true);
    });

    it('should accept uppercase slugs', () => {
      expect(isValidSlug('JOHN')).toBe(true);
      expect(isValidSlug('JohnDoe')).toBe(true);
    });

    it('should reject slugs shorter than 3 characters', () => {
      expect(isValidSlug('ab')).toBe(false);
      expect(isValidSlug('a')).toBe(false);
      expect(isValidSlug('')).toBe(false);
    });

    it('should reject slugs longer than 30 characters', () => {
      const longSlug = 'a'.repeat(31);
      expect(isValidSlug(longSlug)).toBe(false);
    });

    it('should accept slugs exactly 3 characters', () => {
      expect(isValidSlug('abc')).toBe(true);
    });

    it('should accept slugs exactly 30 characters', () => {
      const maxSlug = 'a'.repeat(30);
      expect(isValidSlug(maxSlug)).toBe(true);
    });

    it('should reject slugs with spaces', () => {
      expect(isValidSlug('john doe')).toBe(false);
      expect(isValidSlug('my page')).toBe(false);
    });

    it('should reject slugs with special characters', () => {
      expect(isValidSlug('john@doe')).toBe(false);
      expect(isValidSlug('my.page')).toBe(false);
      expect(isValidSlug('test#1')).toBe(false);
      expect(isValidSlug('user$name')).toBe(false);
      expect(isValidSlug('hello!')).toBe(false);
    });

    it('should reject slugs with non-ASCII characters', () => {
      expect(isValidSlug('مرحبا')).toBe(false);
      expect(isValidSlug('こんにちは')).toBe(false);
      expect(isValidSlug('café')).toBe(false);
    });

    it('should accept slugs starting with hyphen if 3+ chars', () => {
      expect(isValidSlug('-ab')).toBe(true); // 3 chars, valid
      expect(isValidSlug('-abc')).toBe(true); // 4 chars, valid pattern
    });

    it('should accept common username patterns', () => {
      expect(isValidSlug('john_doe_2024')).toBe(true);
      expect(isValidSlug('startup-io')).toBe(true);
      expect(isValidSlug('dev123')).toBe(true);
      expect(isValidSlug('MyBrand')).toBe(true);
    });
  });
});
