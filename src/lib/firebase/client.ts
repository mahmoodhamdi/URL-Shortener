/**
 * Firebase Client SDK Configuration
 *
 * This module initializes Firebase for client-side usage.
 * Used for Firebase Auth (Google Sign-In) and FCM (Push Notifications).
 *
 * Environment Variables (public - can be exposed to client):
 * - NEXT_PUBLIC_FIREBASE_API_KEY
 * - NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
 * - NEXT_PUBLIC_FIREBASE_PROJECT_ID
 * - NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
 * - NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
 * - NEXT_PUBLIC_FIREBASE_APP_ID
 * - NEXT_PUBLIC_FIREBASE_VAPID_KEY (for FCM web push)
 */

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';
import { getAuth, GoogleAuthProvider, signInWithPopup, Auth } from 'firebase/auth';

/**
 * Firebase client configuration
 */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/**
 * Check if Firebase is configured for client
 */
export function isFirebaseClientConfigured(): boolean {
  return !!(
    firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    firebaseConfig.messagingSenderId
  );
}

/**
 * Get Firebase app instance (singleton)
 */
export function getFirebaseApp(): FirebaseApp | null {
  if (!isFirebaseClientConfigured()) {
    console.warn('[Firebase Client] Firebase not configured');
    return null;
  }

  if (getApps().length === 0) {
    return initializeApp(firebaseConfig);
  }
  return getApp();
}

/**
 * Get Firebase Auth instance
 */
export function getClientAuth(): Auth | null {
  const app = getFirebaseApp();
  if (!app) return null;
  return getAuth(app);
}

/**
 * Get Firebase Messaging instance
 * Only available in browser with service worker support
 */
export function getClientMessaging(): Messaging | null {
  if (typeof window === 'undefined') return null;
  if (!('serviceWorker' in navigator)) return null;

  const app = getFirebaseApp();
  if (!app) return null;

  try {
    return getMessaging(app);
  } catch (error) {
    console.error('[Firebase Client] Failed to get messaging:', error);
    return null;
  }
}

/**
 * Request FCM token for push notifications
 */
export async function requestFCMToken(): Promise<string | null> {
  const messaging = getClientMessaging();
  if (!messaging) {
    console.warn('[Firebase Client] Messaging not available');
    return null;
  }

  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
  if (!vapidKey) {
    console.warn('[Firebase Client] VAPID key not configured');
    return null;
  }

  try {
    // Request notification permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return null;
    }

    // Get FCM token
    const token = await getToken(messaging, { vapidKey });
    return token;
  } catch (error) {
    console.error('[Firebase Client] Failed to get FCM token:', error);
    return null;
  }
}

/**
 * Register FCM token with backend
 */
export async function registerFCMTokenWithBackend(
  token: string,
  deviceName?: string
): Promise<boolean> {
  try {
    const response = await fetch('/api/notifications/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        deviceType: 'web',
        deviceName: deviceName || getBrowserName(),
      }),
    });
    return response.ok;
  } catch (error) {
    console.error('[Firebase Client] Failed to register token:', error);
    return false;
  }
}

/**
 * Set up foreground message handler
 */
export function onForegroundMessage(
  callback: (payload: { title?: string; body?: string; data?: Record<string, string> }) => void
): (() => void) | null {
  const messaging = getClientMessaging();
  if (!messaging) return null;

  return onMessage(messaging, (payload) => {
    callback({
      title: payload.notification?.title,
      body: payload.notification?.body,
      data: payload.data,
    });
  });
}

/**
 * Sign in with Google using Firebase Auth
 */
export async function signInWithGoogle(): Promise<{
  idToken: string;
  user: { email: string; name?: string; image?: string };
} | null> {
  const auth = getClientAuth();
  if (!auth) {
    console.warn('[Firebase Client] Auth not available');
    return null;
  }

  try {
    const provider = new GoogleAuthProvider();
    provider.addScope('email');
    provider.addScope('profile');

    const result = await signInWithPopup(auth, provider);
    const idToken = await result.user.getIdToken();

    return {
      idToken,
      user: {
        email: result.user.email || '',
        name: result.user.displayName || undefined,
        image: result.user.photoURL || undefined,
      },
    };
  } catch (error) {
    console.error('[Firebase Client] Google sign-in failed:', error);
    return null;
  }
}

/**
 * Get browser name for device identification
 */
function getBrowserName(): string {
  if (typeof navigator === 'undefined') return 'Unknown';

  const ua = navigator.userAgent;
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Safari')) return 'Safari';
  if (ua.includes('Edge')) return 'Edge';
  if (ua.includes('Opera')) return 'Opera';
  return 'Browser';
}

/**
 * Initialize push notifications
 * Call this when user enables notifications
 */
export async function initializePushNotifications(): Promise<{
  success: boolean;
  token?: string;
  error?: string;
}> {
  // Check if browser supports notifications
  if (!('Notification' in window)) {
    return { success: false, error: 'Notifications not supported' };
  }

  // Check if service workers are supported
  if (!('serviceWorker' in navigator)) {
    return { success: false, error: 'Service workers not supported' };
  }

  try {
    // Register service worker for FCM
    await navigator.serviceWorker.register('/firebase-messaging-sw.js');

    // Get FCM token
    const token = await requestFCMToken();
    if (!token) {
      return { success: false, error: 'Failed to get FCM token' };
    }

    // Register with backend
    const registered = await registerFCMTokenWithBackend(token);
    if (!registered) {
      return { success: false, error: 'Failed to register token' };
    }

    return { success: true, token };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
