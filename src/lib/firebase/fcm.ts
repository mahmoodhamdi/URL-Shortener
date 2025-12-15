/**
 * Firebase Cloud Messaging (FCM) Service
 *
 * Provides push notification functionality for the URL Shortener application.
 * Supports:
 * - Single device notifications
 * - Topic-based notifications
 * - Multi-device notifications
 * - Notification templates for common events
 */

import { getFirebaseMessaging, isFirebaseConfigured } from './admin';
import type { Message, MulticastMessage, TopicMessage } from 'firebase-admin/messaging';

/**
 * Notification payload structure
 */
export interface NotificationPayload {
  title: string;
  body: string;
  imageUrl?: string;
  icon?: string;
  clickAction?: string;
  data?: Record<string, string>;
}

/**
 * FCM send result
 */
export interface FCMSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  failureCount?: number;
  successCount?: number;
}

/**
 * Notification topics for the URL Shortener
 */
export const FCM_TOPICS = {
  LINK_CLICKS: 'link_clicks',
  LINK_MILESTONES: 'link_milestones',
  WORKSPACE_UPDATES: 'workspace_updates',
  SYSTEM_ANNOUNCEMENTS: 'system_announcements',
  SUBSCRIPTION_ALERTS: 'subscription_alerts',
} as const;

export type FCMTopic = (typeof FCM_TOPICS)[keyof typeof FCM_TOPICS];

/**
 * Send notification to a single device
 */
export async function sendNotification(
  token: string,
  notification: NotificationPayload
): Promise<FCMSendResult> {
  if (!isFirebaseConfigured()) {
    console.warn('[FCM] Firebase not configured, skipping notification');
    return { success: false, error: 'Firebase not configured' };
  }

  try {
    const messaging = getFirebaseMessaging();

    const message: Message = {
      token,
      notification: {
        title: notification.title,
        body: notification.body,
        imageUrl: notification.imageUrl,
      },
      webpush: {
        notification: {
          icon: notification.icon || '/icon-192x192.png',
          badge: '/badge-72x72.png',
        },
        fcmOptions: {
          link: notification.clickAction,
        },
      },
      data: notification.data,
    };

    const messageId = await messaging.send(message);
    return { success: true, messageId };
  } catch (error) {
    console.error('[FCM] Failed to send notification:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send notification to multiple devices
 */
export async function sendMulticastNotification(
  tokens: string[],
  notification: NotificationPayload
): Promise<FCMSendResult> {
  if (!isFirebaseConfigured()) {
    console.warn('[FCM] Firebase not configured, skipping notification');
    return { success: false, error: 'Firebase not configured' };
  }

  if (tokens.length === 0) {
    return { success: true, successCount: 0, failureCount: 0 };
  }

  // FCM allows max 500 tokens per multicast
  if (tokens.length > 500) {
    const results = await Promise.all(
      chunk(tokens, 500).map((batch) => sendMulticastNotification(batch, notification))
    );

    const combined = results.reduce(
      (acc, r) => ({
        success: acc.success && r.success,
        successCount: (acc.successCount || 0) + (r.successCount || 0),
        failureCount: (acc.failureCount || 0) + (r.failureCount || 0),
      }),
      { success: true, successCount: 0, failureCount: 0 }
    );

    return combined;
  }

  try {
    const messaging = getFirebaseMessaging();

    const message: MulticastMessage = {
      tokens,
      notification: {
        title: notification.title,
        body: notification.body,
        imageUrl: notification.imageUrl,
      },
      webpush: {
        notification: {
          icon: notification.icon || '/icon-192x192.png',
        },
        fcmOptions: {
          link: notification.clickAction,
        },
      },
      data: notification.data,
    };

    const response = await messaging.sendEachForMulticast(message);

    return {
      success: response.failureCount === 0,
      successCount: response.successCount,
      failureCount: response.failureCount,
    };
  } catch (error) {
    console.error('[FCM] Failed to send multicast notification:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      failureCount: tokens.length,
    };
  }
}

/**
 * Send notification to a topic
 */
export async function sendTopicNotification(
  topic: FCMTopic,
  notification: NotificationPayload
): Promise<FCMSendResult> {
  if (!isFirebaseConfigured()) {
    console.warn('[FCM] Firebase not configured, skipping notification');
    return { success: false, error: 'Firebase not configured' };
  }

  try {
    const messaging = getFirebaseMessaging();

    const message: TopicMessage = {
      topic,
      notification: {
        title: notification.title,
        body: notification.body,
        imageUrl: notification.imageUrl,
      },
      webpush: {
        notification: {
          icon: notification.icon || '/icon-192x192.png',
        },
        fcmOptions: {
          link: notification.clickAction,
        },
      },
      data: notification.data,
    };

    const messageId = await messaging.send(message);
    return { success: true, messageId };
  } catch (error) {
    console.error('[FCM] Failed to send topic notification:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Subscribe a device to a topic
 */
export async function subscribeToTopic(
  tokens: string | string[],
  topic: FCMTopic
): Promise<{ success: boolean; error?: string }> {
  if (!isFirebaseConfigured()) {
    return { success: false, error: 'Firebase not configured' };
  }

  try {
    const messaging = getFirebaseMessaging();
    const tokenArray = Array.isArray(tokens) ? tokens : [tokens];
    await messaging.subscribeToTopic(tokenArray, topic);
    return { success: true };
  } catch (error) {
    console.error('[FCM] Failed to subscribe to topic:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Unsubscribe a device from a topic
 */
export async function unsubscribeFromTopic(
  tokens: string | string[],
  topic: FCMTopic
): Promise<{ success: boolean; error?: string }> {
  if (!isFirebaseConfigured()) {
    return { success: false, error: 'Firebase not configured' };
  }

  try {
    const messaging = getFirebaseMessaging();
    const tokenArray = Array.isArray(tokens) ? tokens : [tokens];
    await messaging.unsubscribeFromTopic(tokenArray, topic);
    return { success: true };
  } catch (error) {
    console.error('[FCM] Failed to unsubscribe from topic:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// Notification Templates for Common Events
// ============================================================================

/**
 * Send notification when a link reaches a click milestone
 */
export async function notifyLinkMilestone(
  token: string,
  linkTitle: string,
  shortCode: string,
  milestone: number
): Promise<FCMSendResult> {
  return sendNotification(token, {
    title: '🎉 Milestone Reached!',
    body: `Your link "${linkTitle}" just hit ${milestone.toLocaleString()} clicks!`,
    clickAction: `/dashboard/links/${shortCode}/stats`,
    data: {
      type: 'link_milestone',
      shortCode,
      milestone: milestone.toString(),
    },
  });
}

/**
 * Send notification when someone clicks a link (for real-time tracking)
 */
export async function notifyLinkClick(
  token: string,
  linkTitle: string,
  shortCode: string,
  country?: string,
  device?: string
): Promise<FCMSendResult> {
  const locationInfo = country ? ` from ${country}` : '';
  const deviceInfo = device ? ` on ${device}` : '';

  return sendNotification(token, {
    title: '🔗 New Click',
    body: `Someone clicked "${linkTitle}"${locationInfo}${deviceInfo}`,
    clickAction: `/dashboard/links/${shortCode}/stats`,
    data: {
      type: 'link_click',
      shortCode,
      country: country || '',
      device: device || '',
    },
  });
}

/**
 * Send notification for workspace invitation
 */
export async function notifyWorkspaceInvitation(
  token: string,
  workspaceName: string,
  inviterName: string,
  invitationToken: string
): Promise<FCMSendResult> {
  return sendNotification(token, {
    title: '👥 Workspace Invitation',
    body: `${inviterName} invited you to join "${workspaceName}"`,
    clickAction: `/invitations/${invitationToken}`,
    data: {
      type: 'workspace_invitation',
      workspaceName,
      inviterName,
      invitationToken,
    },
  });
}

/**
 * Send notification for subscription alerts
 */
export async function notifySubscriptionAlert(
  token: string,
  alertType: 'expiring' | 'expired' | 'limit_reached' | 'upgraded',
  details: string
): Promise<FCMSendResult> {
  const titles = {
    expiring: '⏰ Subscription Expiring Soon',
    expired: '❌ Subscription Expired',
    limit_reached: '⚠️ Plan Limit Reached',
    upgraded: '🎉 Plan Upgraded!',
  };

  return sendNotification(token, {
    title: titles[alertType],
    body: details,
    clickAction: '/settings/billing',
    data: {
      type: 'subscription_alert',
      alertType,
    },
  });
}

/**
 * Send notification for A/B test results
 */
export async function notifyABTestComplete(
  token: string,
  testName: string,
  winningVariant: string,
  improvementPercent: number
): Promise<FCMSendResult> {
  return sendNotification(token, {
    title: '📊 A/B Test Results Ready',
    body: `"${testName}" complete! "${winningVariant}" won with ${improvementPercent}% improvement`,
    clickAction: '/dashboard/ab-tests',
    data: {
      type: 'ab_test_complete',
      testName,
      winningVariant,
      improvement: improvementPercent.toString(),
    },
  });
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Split array into chunks
 */
function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}
