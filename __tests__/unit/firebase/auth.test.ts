/**
 * Firebase Auth Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock firebase admin
const mockVerifyIdToken = vi.fn();
const mockCreateCustomToken = vi.fn();
const mockGetUser = vi.fn();
const mockGetUserByEmail = vi.fn();
const mockSetCustomUserClaims = vi.fn();
const mockRevokeRefreshTokens = vi.fn();
const mockDeleteUser = vi.fn();
const mockCreateUser = vi.fn();
const mockUpdateUser = vi.fn();

vi.mock('@/lib/firebase/admin', () => ({
  isFirebaseConfigured: vi.fn(() => true),
  getFirebaseAuth: vi.fn(() => ({
    verifyIdToken: mockVerifyIdToken,
    createCustomToken: mockCreateCustomToken,
    getUser: mockGetUser,
    getUserByEmail: mockGetUserByEmail,
    setCustomUserClaims: mockSetCustomUserClaims,
    revokeRefreshTokens: mockRevokeRefreshTokens,
    deleteUser: mockDeleteUser,
    createUser: mockCreateUser,
    updateUser: mockUpdateUser,
  })),
}));

import {
  verifyIdToken,
  createCustomToken,
  getUserByUid,
  getUserByEmail,
  setCustomClaims,
  revokeRefreshTokens,
  deleteFirebaseUser,
  syncFirebaseUser,
} from '@/lib/firebase/auth';

describe('Firebase Auth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('verifyIdToken', () => {
    it('should verify valid ID token', async () => {
      const mockDecodedToken = {
        uid: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
      };
      mockVerifyIdToken.mockResolvedValue(mockDecodedToken);

      const result = await verifyIdToken('valid-token');

      expect(result).toEqual(mockDecodedToken);
      expect(mockVerifyIdToken).toHaveBeenCalledWith('valid-token');
    });

    it('should return null for invalid token', async () => {
      mockVerifyIdToken.mockRejectedValue(new Error('Invalid token'));

      const result = await verifyIdToken('invalid-token');

      expect(result).toBeNull();
    });
  });

  describe('createCustomToken', () => {
    it('should create custom token with claims', async () => {
      mockCreateCustomToken.mockResolvedValue('custom-token-123');

      const result = await createCustomToken('user-123', { role: 'admin' });

      expect(result).toBe('custom-token-123');
      expect(mockCreateCustomToken).toHaveBeenCalledWith('user-123', { role: 'admin' });
    });

    it('should handle token creation failure', async () => {
      mockCreateCustomToken.mockRejectedValue(new Error('Failed'));

      const result = await createCustomToken('user-123');

      expect(result).toBeNull();
    });
  });

  describe('getUserByUid', () => {
    it('should return user by UID', async () => {
      const mockUser = { uid: 'user-123', email: 'test@example.com' };
      mockGetUser.mockResolvedValue(mockUser);

      const result = await getUserByUid('user-123');

      expect(result).toEqual(mockUser);
      expect(mockGetUser).toHaveBeenCalledWith('user-123');
    });

    it('should return null when user not found', async () => {
      mockGetUser.mockRejectedValue(new Error('User not found'));

      const result = await getUserByUid('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getUserByEmail', () => {
    it('should return user by email', async () => {
      const mockUser = { uid: 'user-123', email: 'test@example.com' };
      mockGetUserByEmail.mockResolvedValue(mockUser);

      const result = await getUserByEmail('test@example.com');

      expect(result).toEqual(mockUser);
      expect(mockGetUserByEmail).toHaveBeenCalledWith('test@example.com');
    });

    it('should return null when email not found', async () => {
      mockGetUserByEmail.mockRejectedValue({ code: 'auth/user-not-found' });

      const result = await getUserByEmail('unknown@example.com');

      expect(result).toBeNull();
    });
  });

  describe('setCustomClaims', () => {
    it('should set custom claims for user', async () => {
      mockSetCustomUserClaims.mockResolvedValue(undefined);

      const result = await setCustomClaims('user-123', { plan: 'PRO' });

      expect(result).toBe(true);
      expect(mockSetCustomUserClaims).toHaveBeenCalledWith('user-123', { plan: 'PRO' });
    });

    it('should return false on failure', async () => {
      mockSetCustomUserClaims.mockRejectedValue(new Error('Failed'));

      const result = await setCustomClaims('user-123', { plan: 'PRO' });

      expect(result).toBe(false);
    });
  });

  describe('revokeRefreshTokens', () => {
    it('should revoke refresh tokens', async () => {
      mockRevokeRefreshTokens.mockResolvedValue(undefined);

      const result = await revokeRefreshTokens('user-123');

      expect(result).toBe(true);
      expect(mockRevokeRefreshTokens).toHaveBeenCalledWith('user-123');
    });

    it('should return false on failure', async () => {
      mockRevokeRefreshTokens.mockRejectedValue(new Error('Failed'));

      const result = await revokeRefreshTokens('user-123');

      expect(result).toBe(false);
    });
  });

  describe('deleteFirebaseUser', () => {
    it('should delete user', async () => {
      mockDeleteUser.mockResolvedValue(undefined);

      const result = await deleteFirebaseUser('user-123');

      expect(result).toBe(true);
      expect(mockDeleteUser).toHaveBeenCalledWith('user-123');
    });

    it('should return false on failure', async () => {
      mockDeleteUser.mockRejectedValue(new Error('Failed'));

      const result = await deleteFirebaseUser('user-123');

      expect(result).toBe(false);
    });
  });

  describe('syncFirebaseUser', () => {
    it('should create new Firebase user if not exists', async () => {
      const mockNewUser = {
        uid: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
      };
      mockGetUser.mockRejectedValue({ code: 'auth/user-not-found' });
      mockCreateUser.mockResolvedValue(mockNewUser);

      const result = await syncFirebaseUser(
        'user-123',
        'test@example.com',
        'Test User',
        'https://example.com/photo.jpg'
      );

      expect(result).toEqual(mockNewUser);
      expect(mockCreateUser).toHaveBeenCalledWith({
        uid: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        photoURL: 'https://example.com/photo.jpg',
      });
    });

    it('should update existing Firebase user', async () => {
      const mockExistingUser = {
        uid: 'user-123',
        email: 'test@example.com',
      };
      const mockUpdatedUser = {
        uid: 'user-123',
        email: 'test@example.com',
        displayName: 'Updated Name',
      };
      mockGetUser.mockResolvedValue(mockExistingUser);
      mockUpdateUser.mockResolvedValue(mockUpdatedUser);

      const result = await syncFirebaseUser(
        'user-123',
        'test@example.com',
        'Updated Name'
      );

      expect(result).toEqual(mockUpdatedUser);
      expect(mockUpdateUser).toHaveBeenCalledWith('user-123', {
        email: 'test@example.com',
        displayName: 'Updated Name',
        photoURL: undefined,
      });
    });
  });
});
