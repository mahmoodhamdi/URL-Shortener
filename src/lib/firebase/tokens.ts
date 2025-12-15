/**
 * FCM Token Management
 *
 * Manages FCM tokens for users to enable push notifications.
 * Stores tokens in the database and handles token lifecycle.
 */

import { prisma } from '@/lib/db/prisma';
import { subscribeToTopic, unsubscribeFromTopic, FCM_TOPICS, FCMTopic } from './fcm';

/**
 * FCM Token with metadata
 */
export interface FCMToken {
  id: string;
  userId: string;
  token: string;
  deviceType: 'web' | 'android' | 'ios';
  deviceName?: string;
  createdAt: Date;
  lastUsedAt: Date;
}

/**
 * User notification preferences
 */
export interface NotificationPreferences {
  linkClicks: boolean;
  linkMilestones: boolean;
  workspaceUpdates: boolean;
  systemAnnouncements: boolean;
  subscriptionAlerts: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  linkClicks: false, // Off by default (can be noisy)
  linkMilestones: true,
  workspaceUpdates: true,
  systemAnnouncements: true,
  subscriptionAlerts: true,
};

/**
 * Register an FCM token for a user
 */
export async function registerFCMToken(
  userId: string,
  token: string,
  deviceType: 'web' | 'android' | 'ios' = 'web',
  deviceName?: string
): Promise<FCMToken | null> {
  try {
    // Check if token already exists
    const existingToken = await prisma.fCMToken.findUnique({
      where: { token },
    });

    if (existingToken) {
      // Update existing token
      const updated = await prisma.fCMToken.update({
        where: { token },
        data: {
          userId,
          deviceType,
          deviceName,
          lastUsedAt: new Date(),
        },
      });
      return updated as unknown as FCMToken;
    }

    // Create new token
    const newToken = await prisma.fCMToken.create({
      data: {
        userId,
        token,
        deviceType,
        deviceName,
      },
    });

    // Subscribe to default topics based on user preferences
    const preferences = await getUserNotificationPreferences(userId);
    await syncTopicSubscriptions(token, preferences);

    return newToken as unknown as FCMToken;
  } catch (error) {
    console.error('[FCM Tokens] Failed to register token:', error);
    return null;
  }
}

/**
 * Remove an FCM token
 */
export async function removeFCMToken(token: string): Promise<boolean> {
  try {
    // Unsubscribe from all topics
    await Promise.all(
      Object.values(FCM_TOPICS).map((topic) => unsubscribeFromTopic(token, topic))
    );

    await prisma.fCMToken.delete({
      where: { token },
    });

    return true;
  } catch (error) {
    console.error('[FCM Tokens] Failed to remove token:', error);
    return false;
  }
}

/**
 * Get all FCM tokens for a user
 */
export async function getUserFCMTokens(userId: string): Promise<string[]> {
  try {
    const tokens = await prisma.fCMToken.findMany({
      where: { userId },
      select: { token: true },
    });
    return tokens.map((t) => t.token);
  } catch (error) {
    console.error('[FCM Tokens] Failed to get user tokens:', error);
    return [];
  }
}

/**
 * Get detailed FCM token info for a user
 */
export async function getUserFCMTokenDetails(userId: string): Promise<FCMToken[]> {
  try {
    const tokens = await prisma.fCMToken.findMany({
      where: { userId },
      orderBy: { lastUsedAt: 'desc' },
    });
    return tokens as unknown as FCMToken[];
  } catch (error) {
    console.error('[FCM Tokens] Failed to get token details:', error);
    return [];
  }
}

/**
 * Update last used timestamp for a token
 */
export async function touchFCMToken(token: string): Promise<void> {
  try {
    await prisma.fCMToken.update({
      where: { token },
      data: { lastUsedAt: new Date() },
    });
  } catch (error) {
    // Ignore errors for touch operation
  }
}

/**
 * Clean up stale tokens (not used in X days)
 */
export async function cleanupStaleTokens(daysOld: number = 30): Promise<number> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await prisma.fCMToken.deleteMany({
      where: {
        lastUsedAt: { lt: cutoffDate },
      },
    });

    return result.count;
  } catch (error) {
    console.error('[FCM Tokens] Failed to cleanup stale tokens:', error);
    return 0;
  }
}

/**
 * Get user notification preferences
 */
export async function getUserNotificationPreferences(
  userId: string
): Promise<NotificationPreferences> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { notificationPreferences: true },
    });

    if (user?.notificationPreferences) {
      return {
        ...DEFAULT_PREFERENCES,
        ...(user.notificationPreferences as Partial<NotificationPreferences>),
      };
    }

    return DEFAULT_PREFERENCES;
  } catch (error) {
    console.error('[FCM Tokens] Failed to get preferences:', error);
    return DEFAULT_PREFERENCES;
  }
}

/**
 * Update user notification preferences
 */
export async function updateNotificationPreferences(
  userId: string,
  preferences: Partial<NotificationPreferences>
): Promise<boolean> {
  try {
    const current = await getUserNotificationPreferences(userId);
    const updated = { ...current, ...preferences };

    await prisma.user.update({
      where: { id: userId },
      data: { notificationPreferences: updated as unknown as Record<string, boolean> },
    });

    // Update topic subscriptions for all user tokens
    const tokens = await getUserFCMTokens(userId);
    await Promise.all(tokens.map((token) => syncTopicSubscriptions(token, updated)));

    return true;
  } catch (error) {
    console.error('[FCM Tokens] Failed to update preferences:', error);
    return false;
  }
}

/**
 * Sync topic subscriptions based on preferences
 */
async function syncTopicSubscriptions(
  token: string,
  preferences: NotificationPreferences
): Promise<void> {
  const topicMap: Record<keyof NotificationPreferences, FCMTopic> = {
    linkClicks: FCM_TOPICS.LINK_CLICKS,
    linkMilestones: FCM_TOPICS.LINK_MILESTONES,
    workspaceUpdates: FCM_TOPICS.WORKSPACE_UPDATES,
    systemAnnouncements: FCM_TOPICS.SYSTEM_ANNOUNCEMENTS,
    subscriptionAlerts: FCM_TOPICS.SUBSCRIPTION_ALERTS,
  };

  await Promise.all(
    Object.entries(topicMap).map(([pref, topic]) => {
      const enabled = preferences[pref as keyof NotificationPreferences];
      if (enabled) {
        return subscribeToTopic(token, topic);
      } else {
        return unsubscribeFromTopic(token, topic);
      }
    })
  );
}
