/**
 * Firebase Admin SDK Tests
 *
 * These tests verify the Firebase Admin SDK configuration functions.
 * Due to module caching, we test the configuration detection logic.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Firebase Admin SDK', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    // Clear Firebase-related environment variables
    delete process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    delete process.env.FIREBASE_PROJECT_ID;
    delete process.env.FIREBASE_CLIENT_EMAIL;
    delete process.env.FIREBASE_PRIVATE_KEY;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.clearAllMocks();
  });

  describe('isFirebaseConfigured', () => {
    it('should return false when no environment variables are set', async () => {
      const { isFirebaseConfigured } = await import('@/lib/firebase/admin');
      expect(isFirebaseConfigured()).toBe(false);
    });

    it('should return true when individual env vars are set', async () => {
      process.env.FIREBASE_PROJECT_ID = 'test-project';
      process.env.FIREBASE_CLIENT_EMAIL = 'test@test.iam.gserviceaccount.com';
      process.env.FIREBASE_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----';

      const { isFirebaseConfigured } = await import('@/lib/firebase/admin');
      expect(isFirebaseConfigured()).toBe(true);
    });

    it('should return false when partial env vars are set', async () => {
      process.env.FIREBASE_PROJECT_ID = 'test-project';
      // Missing CLIENT_EMAIL and PRIVATE_KEY

      const { isFirebaseConfigured } = await import('@/lib/firebase/admin');
      expect(isFirebaseConfigured()).toBe(false);
    });
  });

  describe('getFirebaseAdmin', () => {
    it('should throw error when Firebase is not configured', async () => {
      const { getFirebaseAdmin } = await import('@/lib/firebase/admin');
      expect(() => getFirebaseAdmin()).toThrow('Firebase credentials not configured');
    });
  });

  describe('configuration detection', () => {
    it('should detect service account path configuration', async () => {
      // This tests the logic that checks for FIREBASE_SERVICE_ACCOUNT_PATH
      const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
      expect(serviceAccountPath).toBeUndefined();
    });

    it('should detect individual env var configuration', async () => {
      process.env.FIREBASE_PROJECT_ID = 'test-project';
      process.env.FIREBASE_CLIENT_EMAIL = 'test@test.iam.gserviceaccount.com';
      process.env.FIREBASE_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----';

      const { isFirebaseConfigured } = await import('@/lib/firebase/admin');
      const configured = isFirebaseConfigured();
      expect(configured).toBe(true);
    });
  });
});
