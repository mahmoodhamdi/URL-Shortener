import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  validateEnv,
  requireValidEnv,
  getEnvVar,
  getRequiredEnvVar,
  hasEnvVar,
  getEnvInfo,
} from '@/lib/config/env-validation';

describe('Environment Validation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('validateEnv', () => {
    it('should return valid when all required vars are set', () => {
      process.env.DATABASE_URL = 'postgresql://localhost/test';
      process.env.AUTH_SECRET = 'test-secret-12345';

      const result = validateEnv();

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return invalid when DATABASE_URL is missing', () => {
      delete process.env.DATABASE_URL;
      process.env.AUTH_SECRET = 'test-secret-12345';

      const result = validateEnv();

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('DATABASE_URL'))).toBe(true);
    });

    it('should return invalid when AUTH_SECRET is missing', () => {
      process.env.DATABASE_URL = 'postgresql://localhost/test';
      delete process.env.AUTH_SECRET;

      const result = validateEnv();

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('AUTH_SECRET'))).toBe(true);
    });

    it('should return invalid when required var is empty string', () => {
      process.env.DATABASE_URL = '   ';
      process.env.AUTH_SECRET = 'test-secret-12345';

      const result = validateEnv();

      expect(result.valid).toBe(false);
    });

    it('should warn when Stripe is not configured', () => {
      process.env.DATABASE_URL = 'postgresql://localhost/test';
      process.env.AUTH_SECRET = 'test-secret-12345';
      delete process.env.STRIPE_SECRET_KEY;

      const result = validateEnv();

      expect(result.warnings.some(w => w.includes('Stripe'))).toBe(true);
    });

    it('should warn when Google OAuth is partially configured', () => {
      process.env.DATABASE_URL = 'postgresql://localhost/test';
      process.env.AUTH_SECRET = 'test-secret-12345';
      process.env.GOOGLE_CLIENT_ID = 'google-client-id';
      delete process.env.GOOGLE_CLIENT_SECRET;

      const result = validateEnv();

      expect(result.warnings.some(w => w.includes('Google OAuth'))).toBe(true);
    });

    it('should warn when GitHub OAuth is partially configured', () => {
      process.env.DATABASE_URL = 'postgresql://localhost/test';
      process.env.AUTH_SECRET = 'test-secret-12345';
      process.env.GITHUB_CLIENT_SECRET = 'github-secret';
      delete process.env.GITHUB_CLIENT_ID;

      const result = validateEnv();

      expect(result.warnings.some(w => w.includes('Github OAuth'))).toBe(true);
    });

    it('should not warn when OAuth is fully configured', () => {
      process.env.DATABASE_URL = 'postgresql://localhost/test';
      process.env.AUTH_SECRET = 'test-secret-12345';
      process.env.GOOGLE_CLIENT_ID = 'google-id';
      process.env.GOOGLE_CLIENT_SECRET = 'google-secret';

      const result = validateEnv();

      expect(result.warnings.filter(w => w.includes('Google OAuth'))).toHaveLength(0);
    });

    it('should collect multiple errors', () => {
      delete process.env.DATABASE_URL;
      delete process.env.AUTH_SECRET;

      const result = validateEnv();

      expect(result.errors.length).toBe(2);
    });
  });

  describe('requireValidEnv', () => {
    it('should not throw when all required vars are set', () => {
      process.env.DATABASE_URL = 'postgresql://localhost/test';
      process.env.AUTH_SECRET = 'test-secret-12345';

      expect(() => requireValidEnv()).not.toThrow();
    });

    it('should throw when required vars are missing', () => {
      delete process.env.DATABASE_URL;
      delete process.env.AUTH_SECRET;

      expect(() => requireValidEnv()).toThrow('Environment validation failed');
    });

    it('should include missing var names in error message', () => {
      delete process.env.DATABASE_URL;
      process.env.AUTH_SECRET = 'test-secret-12345';

      expect(() => requireValidEnv()).toThrow(/DATABASE_URL/);
    });
  });

  describe('getEnvVar', () => {
    it('should return value when env var exists', () => {
      process.env.TEST_VAR = 'test-value';

      const result = getEnvVar('TEST_VAR');

      expect(result).toBe('test-value');
    });

    it('should return default when env var is missing', () => {
      delete process.env.TEST_VAR;

      const result = getEnvVar('TEST_VAR', 'default-value');

      expect(result).toBe('default-value');
    });

    it('should throw when env var is missing and no default', () => {
      delete process.env.TEST_VAR;

      expect(() => getEnvVar('TEST_VAR')).toThrow('not set');
    });

    it('should return empty string for empty default', () => {
      delete process.env.TEST_VAR;

      const result = getEnvVar('TEST_VAR', '');

      expect(result).toBe('');
    });
  });

  describe('getRequiredEnvVar', () => {
    it('should return value when env var exists', () => {
      process.env.REQUIRED_VAR = 'required-value';

      const result = getRequiredEnvVar('REQUIRED_VAR');

      expect(result).toBe('required-value');
    });

    it('should throw when env var is missing', () => {
      delete process.env.REQUIRED_VAR;

      expect(() => getRequiredEnvVar('REQUIRED_VAR')).toThrow('REQUIRED_VAR');
    });

    it('should include var name in error message', () => {
      delete process.env.MY_CUSTOM_VAR;

      expect(() => getRequiredEnvVar('MY_CUSTOM_VAR')).toThrow('MY_CUSTOM_VAR');
    });
  });

  describe('hasEnvVar', () => {
    it('should return true when env var exists and has value', () => {
      process.env.HAS_VAR = 'some-value';

      expect(hasEnvVar('HAS_VAR')).toBe(true);
    });

    it('should return false when env var is missing', () => {
      delete process.env.MISSING_VAR;

      expect(hasEnvVar('MISSING_VAR')).toBe(false);
    });

    it('should return false when env var is empty string', () => {
      process.env.EMPTY_VAR = '';

      expect(hasEnvVar('EMPTY_VAR')).toBe(false);
    });

    it('should return false when env var is whitespace only', () => {
      process.env.WHITESPACE_VAR = '   ';

      expect(hasEnvVar('WHITESPACE_VAR')).toBe(false);
    });
  });

  describe('getEnvInfo', () => {
    it('should return correct env info object', () => {
      process.env.DATABASE_URL = 'postgresql://localhost/test';
      process.env.AUTH_SECRET = 'secret';
      process.env.STRIPE_SECRET_KEY = 'sk_test';
      process.env.GOOGLE_CLIENT_ID = 'google-id';
      process.env.GOOGLE_CLIENT_SECRET = 'google-secret';
      process.env.GITHUB_CLIENT_ID = 'github-id';
      process.env.GITHUB_CLIENT_SECRET = 'github-secret';
      (process.env as Record<string, string | undefined>).NODE_ENV = 'test';

      const info = getEnvInfo();

      expect(info.nodeEnv).toBe('test');
      expect(info.hasDatabase).toBe(true);
      expect(info.hasAuth).toBe(true);
      expect(info.hasStripe).toBe(true);
      expect(info.hasGoogleOAuth).toBe(true);
      expect(info.hasGitHubOAuth).toBe(true);
    });

    it('should return false for missing features', () => {
      delete process.env.DATABASE_URL;
      delete process.env.AUTH_SECRET;
      delete process.env.STRIPE_SECRET_KEY;
      delete process.env.GOOGLE_CLIENT_ID;
      delete process.env.GITHUB_CLIENT_ID;

      const info = getEnvInfo();

      expect(info.hasDatabase).toBe(false);
      expect(info.hasAuth).toBe(false);
      expect(info.hasStripe).toBe(false);
      expect(info.hasGoogleOAuth).toBe(false);
      expect(info.hasGitHubOAuth).toBe(false);
    });

    it('should default to development when NODE_ENV is not set', () => {
      (process.env as Record<string, string | undefined>).NODE_ENV = undefined;

      const info = getEnvInfo();

      expect(info.nodeEnv).toBe('development');
    });

    it('should require both ID and SECRET for OAuth providers', () => {
      process.env.GOOGLE_CLIENT_ID = 'google-id';
      delete process.env.GOOGLE_CLIENT_SECRET;

      const info = getEnvInfo();

      expect(info.hasGoogleOAuth).toBe(false);
    });
  });
});
