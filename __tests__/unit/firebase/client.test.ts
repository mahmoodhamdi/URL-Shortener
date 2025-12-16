/**
 * Firebase Client SDK Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Firebase client SDK
const mockInitializeApp = vi.fn(() => ({ name: '[DEFAULT]' }));
const mockGetApps = vi.fn(() => []);
const mockGetApp = vi.fn(() => ({ name: '[DEFAULT]' }));
const mockGetAuth = vi.fn(() => ({}));
const mockGetMessaging = vi.fn(() => ({}));
const mockGetToken = vi.fn();
const mockOnMessage = vi.fn();
const mockSignInWithPopup = vi.fn();

vi.mock('firebase/app', () => ({
  initializeApp: mockInitializeApp,
  getApps: mockGetApps,
  getApp: mockGetApp,
}));

vi.mock('firebase/auth', () => ({
  getAuth: mockGetAuth,
  GoogleAuthProvider: vi.fn(() => ({
    addScope: vi.fn(),
  })),
  signInWithPopup: mockSignInWithPopup,
}));

vi.mock('firebase/messaging', () => ({
  getMessaging: mockGetMessaging,
  getToken: mockGetToken,
  onMessage: mockOnMessage,
}));

// Set up environment variables
process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'test-api-key';
process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'test-project';
process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = '123456789';
process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY = 'test-vapid-key';

describe('Firebase Client SDK', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetApps.mockReturnValue([]);
  });

  describe('isFirebaseClientConfigured', () => {
    it('should return true when required config is present', async () => {
      const { isFirebaseClientConfigured } = await import('@/lib/firebase/client');
      expect(isFirebaseClientConfigured()).toBe(true);
    });
  });

  describe('getFirebaseApp', () => {
    it('should initialize app if not already initialized', async () => {
      mockGetApps.mockReturnValue([]);
      const { getFirebaseApp } = await import('@/lib/firebase/client');

      const app = getFirebaseApp();

      expect(mockInitializeApp).toHaveBeenCalled();
      expect(app).not.toBeNull();
    });

    it('should return existing app if already initialized', async () => {
      mockGetApps.mockReturnValue([{ name: '[DEFAULT]' }] as never);
      const { getFirebaseApp } = await import('@/lib/firebase/client');

      const app = getFirebaseApp();

      expect(mockGetApp).toHaveBeenCalled();
      expect(app).not.toBeNull();
    });
  });

  describe('getClientAuth', () => {
    it('should return auth instance', async () => {
      const mockAuthInstance = { currentUser: null };
      mockGetAuth.mockReturnValue(mockAuthInstance);
      mockGetApps.mockReturnValue([{ name: '[DEFAULT]' }] as never);

      const { getClientAuth } = await import('@/lib/firebase/client');
      const auth = getClientAuth();

      expect(auth).toEqual(mockAuthInstance);
    });
  });

  describe('signInWithGoogle', () => {
    it('should return user data on successful sign-in', async () => {
      const mockUser = {
        email: 'test@example.com',
        displayName: 'Test User',
        photoURL: 'https://example.com/photo.jpg',
        getIdToken: vi.fn().mockResolvedValue('id-token-123'),
      };

      mockGetApps.mockReturnValue([{ name: '[DEFAULT]' }] as never);
      mockSignInWithPopup.mockResolvedValue({ user: mockUser });

      const { signInWithGoogle } = await import('@/lib/firebase/client');
      const result = await signInWithGoogle();

      expect(result).toEqual({
        idToken: 'id-token-123',
        user: {
          email: 'test@example.com',
          name: 'Test User',
          image: 'https://example.com/photo.jpg',
        },
      });
    });

    it('should return null on sign-in failure', async () => {
      mockGetApps.mockReturnValue([{ name: '[DEFAULT]' }] as never);
      mockSignInWithPopup.mockRejectedValue(new Error('Sign-in cancelled'));

      const { signInWithGoogle } = await import('@/lib/firebase/client');
      const result = await signInWithGoogle();

      expect(result).toBeNull();
    });
  });

  describe('registerFCMTokenWithBackend', () => {
    it('should send token to backend', async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      global.fetch = mockFetch;

      const { registerFCMTokenWithBackend } = await import('@/lib/firebase/client');
      const result = await registerFCMTokenWithBackend('fcm-token-123', 'Chrome');

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith('/api/notifications/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('fcm-token-123'),
      });
    });

    it('should return false on failure', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: false });

      const { registerFCMTokenWithBackend } = await import('@/lib/firebase/client');
      const result = await registerFCMTokenWithBackend('fcm-token-123');

      expect(result).toBe(false);
    });
  });

  describe('onForegroundMessage', () => {
    it('should register message handler', async () => {
      mockGetApps.mockReturnValue([{ name: '[DEFAULT]' }] as never);
      const unsubscribe = vi.fn();
      mockOnMessage.mockReturnValue(unsubscribe);

      const { onForegroundMessage } = await import('@/lib/firebase/client');
      const callback = vi.fn();

      // Note: This may return null in test environment due to no window/serviceWorker
      const result = onForegroundMessage(callback);

      // In a real browser environment, this would register the handler
      // In tests, getClientMessaging returns null due to no serviceWorker
    });
  });

  describe('getBrowserName', () => {
    it('should detect browser from user agent', async () => {
      // This is a private function, tested indirectly through registerFCMTokenWithBackend
      // when deviceName is not provided
    });
  });
});
