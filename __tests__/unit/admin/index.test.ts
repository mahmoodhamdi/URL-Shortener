import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { isAdminEmail } from '@/lib/admin';

const ORIGINAL = process.env.ADMIN_EMAILS;

describe('isAdminEmail', () => {
  beforeEach(() => {
    delete process.env.ADMIN_EMAILS;
  });

  afterEach(() => {
    if (ORIGINAL === undefined) {
      delete process.env.ADMIN_EMAILS;
    } else {
      process.env.ADMIN_EMAILS = ORIGINAL;
    }
  });

  it('returns false when ADMIN_EMAILS is unset', () => {
    expect(isAdminEmail('anyone@example.com')).toBe(false);
  });

  it('returns false for null / undefined / empty string', () => {
    process.env.ADMIN_EMAILS = 'admin@example.com';
    expect(isAdminEmail(null)).toBe(false);
    expect(isAdminEmail(undefined)).toBe(false);
    expect(isAdminEmail('')).toBe(false);
  });

  it('matches a single configured email case-insensitively', () => {
    process.env.ADMIN_EMAILS = 'Admin@Example.com';
    expect(isAdminEmail('admin@example.com')).toBe(true);
    expect(isAdminEmail('ADMIN@example.com')).toBe(true);
  });

  it('supports a comma-separated allowlist with whitespace', () => {
    process.env.ADMIN_EMAILS = 'a@x.com, b@y.com ,c@z.com';
    expect(isAdminEmail('b@y.com')).toBe(true);
    expect(isAdminEmail('c@z.com')).toBe(true);
    expect(isAdminEmail('d@unknown.com')).toBe(false);
  });

  it('ignores empty entries between commas', () => {
    process.env.ADMIN_EMAILS = ',,admin@example.com,,';
    expect(isAdminEmail('admin@example.com')).toBe(true);
    expect(isAdminEmail('')).toBe(false);
  });
});
