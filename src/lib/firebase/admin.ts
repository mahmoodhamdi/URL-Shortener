/**
 * Firebase Admin SDK Configuration
 *
 * This module initializes and exports the Firebase Admin SDK for server-side operations.
 * Supports multiple configuration methods:
 * 1. Service account JSON file path (FIREBASE_SERVICE_ACCOUNT_PATH)
 * 2. Service account JSON string (FIREBASE_SERVICE_ACCOUNT)
 * 3. Individual environment variables (FIREBASE_PROJECT_ID, etc.)
 *
 * Environment Variables:
 * - FIREBASE_SERVICE_ACCOUNT_PATH: Path to service account JSON file
 * - FIREBASE_SERVICE_ACCOUNT: JSON string of service account credentials
 * - FIREBASE_PROJECT_ID: Firebase project ID
 * - FIREBASE_CLIENT_EMAIL: Service account client email
 * - FIREBASE_PRIVATE_KEY: Service account private key (with \n for newlines)
 * - FIREBASE_DATABASE_URL: Realtime Database URL (optional)
 * - FIREBASE_STORAGE_BUCKET: Storage bucket name (optional)
 */

import * as admin from 'firebase-admin';

// Singleton initialization flag
let initialized = false;

/**
 * Get Firebase Admin app instance
 * Initializes the app if not already done
 */
export function getFirebaseAdmin(): admin.app.App {
  if (initialized && admin.apps.length > 0) {
    return admin.app();
  }

  // Try different initialization methods
  const credential = getCredential();

  if (!credential) {
    throw new Error(
      'Firebase credentials not configured. Set FIREBASE_SERVICE_ACCOUNT_PATH, ' +
        'FIREBASE_SERVICE_ACCOUNT, or individual FIREBASE_* environment variables.'
    );
  }

  const options: admin.AppOptions = {
    credential,
  };

  // Add optional configurations
  if (process.env.FIREBASE_DATABASE_URL) {
    options.databaseURL = process.env.FIREBASE_DATABASE_URL;
  }

  if (process.env.FIREBASE_STORAGE_BUCKET) {
    options.storageBucket = process.env.FIREBASE_STORAGE_BUCKET;
  }

  admin.initializeApp(options);
  initialized = true;

  console.log('[Firebase] Admin SDK initialized successfully');
  return admin.app();
}

/**
 * Get Firebase credential from environment
 */
function getCredential(): admin.credential.Credential | null {
  // Method 1: Service account file path
  if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    try {
      const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
      return admin.credential.cert(serviceAccount);
    } catch (error) {
      console.error('[Firebase] Failed to load service account file:', error);
    }
  }

  // Method 2: Service account JSON string
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      return admin.credential.cert(serviceAccount);
    } catch (error) {
      console.error('[Firebase] Failed to parse service account JSON:', error);
    }
  }

  // Method 3: Individual environment variables
  if (
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  ) {
    try {
      return admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // Replace escaped newlines with actual newlines
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      });
    } catch (error) {
      console.error('[Firebase] Failed to create credential from env vars:', error);
    }
  }

  return null;
}

/**
 * Get Firebase Auth instance
 */
export function getFirebaseAuth(): admin.auth.Auth {
  return getFirebaseAdmin().auth();
}

/**
 * Get Firebase Messaging (FCM) instance
 */
export function getFirebaseMessaging(): admin.messaging.Messaging {
  return getFirebaseAdmin().messaging();
}

/**
 * Get Firebase Firestore instance
 */
export function getFirebaseFirestore(): admin.firestore.Firestore {
  return getFirebaseAdmin().firestore();
}

/**
 * Check if Firebase is configured
 */
export function isFirebaseConfigured(): boolean {
  return !!(
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
    process.env.FIREBASE_SERVICE_ACCOUNT ||
    (process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY)
  );
}

/**
 * Get Firebase project ID
 */
export function getFirebaseProjectId(): string | undefined {
  if (process.env.FIREBASE_PROJECT_ID) {
    return process.env.FIREBASE_PROJECT_ID;
  }

  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      return serviceAccount.project_id;
    } catch {
      return undefined;
    }
  }

  return undefined;
}

// Re-export admin for direct access if needed
export { admin };
