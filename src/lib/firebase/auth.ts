/**
 * Firebase Authentication Integration
 *
 * Provides server-side Firebase Auth utilities for:
 * - Verifying Firebase ID tokens
 * - Creating custom tokens for NextAuth integration
 * - Managing user claims
 */

import { getFirebaseAuth, isFirebaseConfigured } from './admin';
import type { DecodedIdToken, UserRecord } from 'firebase-admin/auth';

/**
 * Verify a Firebase ID token
 * Used to authenticate requests from clients with Firebase Auth
 */
export async function verifyIdToken(idToken: string): Promise<DecodedIdToken | null> {
  if (!isFirebaseConfigured()) {
    console.warn('[Firebase Auth] Firebase not configured');
    return null;
  }

  try {
    const auth = getFirebaseAuth();
    const decodedToken = await auth.verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    console.error('[Firebase Auth] Failed to verify ID token:', error);
    return null;
  }
}

/**
 * Create a custom token for a user
 * Used to allow NextAuth users to authenticate with Firebase
 */
export async function createCustomToken(
  uid: string,
  claims?: Record<string, unknown>
): Promise<string | null> {
  if (!isFirebaseConfigured()) {
    console.warn('[Firebase Auth] Firebase not configured');
    return null;
  }

  try {
    const auth = getFirebaseAuth();
    const token = await auth.createCustomToken(uid, claims);
    return token;
  } catch (error) {
    console.error('[Firebase Auth] Failed to create custom token:', error);
    return null;
  }
}

/**
 * Get a user by their UID
 */
export async function getUserByUid(uid: string): Promise<UserRecord | null> {
  if (!isFirebaseConfigured()) {
    return null;
  }

  try {
    const auth = getFirebaseAuth();
    return await auth.getUser(uid);
  } catch (error) {
    console.error('[Firebase Auth] Failed to get user:', error);
    return null;
  }
}

/**
 * Get a user by their email
 */
export async function getUserByEmail(email: string): Promise<UserRecord | null> {
  if (!isFirebaseConfigured()) {
    return null;
  }

  try {
    const auth = getFirebaseAuth();
    return await auth.getUserByEmail(email);
  } catch (error) {
    // User not found is expected in some cases
    if ((error as { code?: string }).code !== 'auth/user-not-found') {
      console.error('[Firebase Auth] Failed to get user by email:', error);
    }
    return null;
  }
}

/**
 * Set custom claims for a user
 * Useful for setting subscription tier, roles, etc.
 */
export async function setCustomClaims(
  uid: string,
  claims: Record<string, unknown>
): Promise<boolean> {
  if (!isFirebaseConfigured()) {
    return false;
  }

  try {
    const auth = getFirebaseAuth();
    await auth.setCustomUserClaims(uid, claims);
    return true;
  } catch (error) {
    console.error('[Firebase Auth] Failed to set custom claims:', error);
    return false;
  }
}

/**
 * Revoke all refresh tokens for a user
 * Used when user changes password, signs out everywhere, etc.
 */
export async function revokeRefreshTokens(uid: string): Promise<boolean> {
  if (!isFirebaseConfigured()) {
    return false;
  }

  try {
    const auth = getFirebaseAuth();
    await auth.revokeRefreshTokens(uid);
    return true;
  } catch (error) {
    console.error('[Firebase Auth] Failed to revoke tokens:', error);
    return false;
  }
}

/**
 * Delete a Firebase user
 */
export async function deleteFirebaseUser(uid: string): Promise<boolean> {
  if (!isFirebaseConfigured()) {
    return false;
  }

  try {
    const auth = getFirebaseAuth();
    await auth.deleteUser(uid);
    return true;
  } catch (error) {
    console.error('[Firebase Auth] Failed to delete user:', error);
    return false;
  }
}

/**
 * Create or update a Firebase user from NextAuth session data
 * This syncs NextAuth users with Firebase for FCM and other Firebase services
 */
export async function syncFirebaseUser(
  userId: string,
  email: string,
  displayName?: string,
  photoURL?: string
): Promise<UserRecord | null> {
  if (!isFirebaseConfigured()) {
    return null;
  }

  try {
    const auth = getFirebaseAuth();

    // Try to get existing user
    let user: UserRecord | null = null;
    try {
      user = await auth.getUser(userId);
    } catch {
      // User doesn't exist, will create below
    }

    if (user) {
      // Update existing user
      return await auth.updateUser(userId, {
        email,
        displayName: displayName || undefined,
        photoURL: photoURL || undefined,
      });
    } else {
      // Create new user
      return await auth.createUser({
        uid: userId,
        email,
        displayName: displayName || undefined,
        photoURL: photoURL || undefined,
      });
    }
  } catch (error) {
    console.error('[Firebase Auth] Failed to sync user:', error);
    return null;
  }
}
