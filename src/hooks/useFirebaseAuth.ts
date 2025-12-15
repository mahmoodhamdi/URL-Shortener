'use client';

/**
 * Firebase Authentication Hook
 *
 * Provides Firebase authentication functionality for React components.
 * Integrates Firebase Auth with NextAuth.js session.
 */

import { useState, useCallback } from 'react';
import { signInWithGoogle as firebaseSignInWithGoogle } from '@/lib/firebase/client';
import { signIn as nextAuthSignIn } from 'next-auth/react';

interface FirebaseAuthState {
  isLoading: boolean;
  error: string | null;
}

interface FirebaseAuthResult {
  success: boolean;
  isNewUser?: boolean;
  error?: string;
}

/**
 * Hook for Firebase authentication
 */
export function useFirebaseAuth() {
  const [state, setState] = useState<FirebaseAuthState>({
    isLoading: false,
    error: null,
  });

  /**
   * Sign in with Google using Firebase
   * After Firebase auth, syncs with NextAuth session
   */
  const signInWithGoogle = useCallback(async (
    callbackUrl?: string
  ): Promise<FirebaseAuthResult> => {
    setState({ isLoading: true, error: null });

    try {
      // First, sign in with Firebase
      const firebaseResult = await firebaseSignInWithGoogle();
      if (!firebaseResult) {
        setState({ isLoading: false, error: 'Firebase sign-in cancelled or failed' });
        return { success: false, error: 'Sign-in cancelled' };
      }

      // Send Firebase ID token to our API to create/link session
      const response = await fetch('/api/auth/firebase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idToken: firebaseResult.idToken,
          action: 'signin',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setState({ isLoading: false, error: errorData.error || 'Authentication failed' });
        return { success: false, error: errorData.error };
      }

      const data = await response.json();

      // Sign in with NextAuth using credentials (the user is already verified)
      await nextAuthSignIn('credentials', {
        email: firebaseResult.user.email,
        firebaseUid: data.user.id,
        redirect: false,
      });

      setState({ isLoading: false, error: null });

      // Redirect if callbackUrl provided
      if (callbackUrl) {
        window.location.href = callbackUrl;
      }

      return {
        success: true,
        isNewUser: data.isNewUser,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState({ isLoading: false, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  }, []);

  /**
   * Link existing account with Firebase
   */
  const linkWithFirebase = useCallback(async (): Promise<FirebaseAuthResult> => {
    setState({ isLoading: true, error: null });

    try {
      const firebaseResult = await firebaseSignInWithGoogle();
      if (!firebaseResult) {
        setState({ isLoading: false, error: 'Firebase sign-in cancelled' });
        return { success: false, error: 'Sign-in cancelled' };
      }

      const response = await fetch('/api/auth/firebase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idToken: firebaseResult.idToken,
          action: 'link',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setState({ isLoading: false, error: errorData.error });
        return { success: false, error: errorData.error };
      }

      setState({ isLoading: false, error: null });
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState({ isLoading: false, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  }, []);

  return {
    signInWithGoogle,
    linkWithFirebase,
    isLoading: state.isLoading,
    error: state.error,
    clearError: () => setState((s) => ({ ...s, error: null })),
  };
}
