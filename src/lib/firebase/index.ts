/**
 * Firebase Module Index
 *
 * Re-exports all Firebase functionality for easy imports.
 *
 * Server-side:
 * - Admin SDK (admin.ts)
 * - Firebase Auth (auth.ts)
 * - FCM Push Notifications (fcm.ts)
 * - FCM Token Management (tokens.ts)
 *
 * Client-side:
 * - Firebase Client SDK (client.ts)
 */

// Server-side exports
export {
  getFirebaseAdmin,
  getFirebaseAuth,
  getFirebaseMessaging,
  getFirebaseFirestore,
  isFirebaseConfigured,
} from './admin';

export {
  verifyIdToken,
  createCustomToken,
  getUserByUid,
  getUserByEmail,
  setCustomClaims,
  revokeRefreshTokens,
  deleteFirebaseUser,
  syncFirebaseUser,
} from './auth';

export {
  sendNotification,
  sendMulticastNotification,
  sendTopicNotification,
  subscribeToTopic,
  unsubscribeFromTopic,
  notifyLinkMilestone,
  notifyLinkClick,
  notifyWorkspaceInvitation,
  notifySubscriptionAlert,
  notifyABTestComplete,
  FCM_TOPICS,
  type NotificationPayload,
  type FCMSendResult,
  type FCMTopic,
} from './fcm';

export {
  registerFCMToken,
  removeFCMToken,
  getUserFCMTokens,
  getUserFCMTokenDetails,
  touchFCMToken,
  cleanupStaleTokens,
  getUserNotificationPreferences,
  updateNotificationPreferences,
  type FCMToken,
  type NotificationPreferences,
} from './tokens';

// Client-side exports (for use in React components)
// Import these directly from './client' in client components
// to avoid importing server-side code
