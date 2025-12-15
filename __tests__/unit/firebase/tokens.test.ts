/**
 * FCM Token Management Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma - define inside factory to avoid hoisting issues
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    fCMToken: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Mock FCM functions
vi.mock('@/lib/firebase/fcm', () => ({
  subscribeToTopic: vi.fn().mockResolvedValue({ success: true }),
  unsubscribeFromTopic: vi.fn().mockResolvedValue({ success: true }),
  FCM_TOPICS: {
    LINK_CLICKS: 'link_clicks',
    LINK_MILESTONES: 'link_milestones',
    WORKSPACE_UPDATES: 'workspace_updates',
    SYSTEM_ANNOUNCEMENTS: 'system_announcements',
    SUBSCRIPTION_ALERTS: 'subscription_alerts',
  },
}));

// Import after mocks
import { prisma } from '@/lib/db/prisma';
import { subscribeToTopic, unsubscribeFromTopic } from '@/lib/firebase/fcm';
import {
  registerFCMToken,
  removeFCMToken,
  getUserFCMTokens,
  getUserFCMTokenDetails,
  touchFCMToken,
  cleanupStaleTokens,
  getUserNotificationPreferences,
  updateNotificationPreferences,
} from '@/lib/firebase/tokens';

describe('FCM Token Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('registerFCMToken', () => {
    it('should create new token if not exists', async () => {
      const mockToken = {
        id: 'token-id-1',
        userId: 'user-123',
        token: 'fcm-token-abc',
        deviceType: 'web',
        deviceName: 'Chrome',
        createdAt: new Date(),
        lastUsedAt: new Date(),
      };

      vi.mocked(prisma.fCMToken.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.fCMToken.create).mockResolvedValue(mockToken as never);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ notificationPreferences: null } as never);

      const result = await registerFCMToken('user-123', 'fcm-token-abc', 'web', 'Chrome');

      expect(result).toEqual(mockToken);
      expect(prisma.fCMToken.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          token: 'fcm-token-abc',
          deviceType: 'web',
          deviceName: 'Chrome',
        },
      });
    });

    it('should update existing token', async () => {
      const existingToken = {
        id: 'token-id-1',
        userId: 'old-user',
        token: 'fcm-token-abc',
        deviceType: 'web',
      };

      const updatedToken = {
        ...existingToken,
        userId: 'user-123',
        lastUsedAt: new Date(),
      };

      vi.mocked(prisma.fCMToken.findUnique).mockResolvedValue(existingToken as never);
      vi.mocked(prisma.fCMToken.update).mockResolvedValue(updatedToken as never);

      const result = await registerFCMToken('user-123', 'fcm-token-abc', 'web', 'Chrome');

      expect(result).toEqual(updatedToken);
      expect(prisma.fCMToken.update).toHaveBeenCalled();
    });

    it('should handle registration errors', async () => {
      vi.mocked(prisma.fCMToken.findUnique).mockRejectedValue(new Error('DB error'));

      const result = await registerFCMToken('user-123', 'fcm-token-abc');

      expect(result).toBeNull();
    });
  });

  describe('removeFCMToken', () => {
    it('should remove token and unsubscribe from topics', async () => {
      vi.mocked(prisma.fCMToken.delete).mockResolvedValue({} as never);

      const result = await removeFCMToken('fcm-token-abc');

      expect(result).toBe(true);
      expect(unsubscribeFromTopic).toHaveBeenCalledTimes(5); // All topics
      expect(prisma.fCMToken.delete).toHaveBeenCalledWith({
        where: { token: 'fcm-token-abc' },
      });
    });

    it('should handle removal errors', async () => {
      vi.mocked(prisma.fCMToken.delete).mockRejectedValue(new Error('Not found'));

      const result = await removeFCMToken('nonexistent-token');

      expect(result).toBe(false);
    });
  });

  describe('getUserFCMTokens', () => {
    it('should return user tokens', async () => {
      vi.mocked(prisma.fCMToken.findMany).mockResolvedValue([
        { token: 'token-1' },
        { token: 'token-2' },
      ] as never);

      const result = await getUserFCMTokens('user-123');

      expect(result).toEqual(['token-1', 'token-2']);
      expect(prisma.fCMToken.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        select: { token: true },
      });
    });

    it('should return empty array on error', async () => {
      vi.mocked(prisma.fCMToken.findMany).mockRejectedValue(new Error('DB error'));

      const result = await getUserFCMTokens('user-123');

      expect(result).toEqual([]);
    });
  });

  describe('getUserFCMTokenDetails', () => {
    it('should return detailed token info', async () => {
      const mockTokens = [
        {
          id: 'id-1',
          userId: 'user-123',
          token: 'token-1',
          deviceType: 'web',
          deviceName: 'Chrome',
          createdAt: new Date(),
          lastUsedAt: new Date(),
        },
      ];

      vi.mocked(prisma.fCMToken.findMany).mockResolvedValue(mockTokens as never);

      const result = await getUserFCMTokenDetails('user-123');

      expect(result).toEqual(mockTokens);
      expect(prisma.fCMToken.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        orderBy: { lastUsedAt: 'desc' },
      });
    });
  });

  describe('touchFCMToken', () => {
    it('should update lastUsedAt timestamp', async () => {
      vi.mocked(prisma.fCMToken.update).mockResolvedValue({} as never);

      await touchFCMToken('fcm-token-abc');

      expect(prisma.fCMToken.update).toHaveBeenCalledWith({
        where: { token: 'fcm-token-abc' },
        data: { lastUsedAt: expect.any(Date) },
      });
    });

    it('should not throw on error', async () => {
      vi.mocked(prisma.fCMToken.update).mockRejectedValue(new Error('Not found'));

      await expect(touchFCMToken('nonexistent')).resolves.not.toThrow();
    });
  });

  describe('cleanupStaleTokens', () => {
    it('should delete tokens older than specified days', async () => {
      vi.mocked(prisma.fCMToken.deleteMany).mockResolvedValue({ count: 5 } as never);

      const result = await cleanupStaleTokens(30);

      expect(result).toBe(5);
      expect(prisma.fCMToken.deleteMany).toHaveBeenCalledWith({
        where: {
          lastUsedAt: { lt: expect.any(Date) },
        },
      });
    });

    it('should return 0 on error', async () => {
      vi.mocked(prisma.fCMToken.deleteMany).mockRejectedValue(new Error('DB error'));

      const result = await cleanupStaleTokens();

      expect(result).toBe(0);
    });
  });

  describe('getUserNotificationPreferences', () => {
    it('should return user preferences', async () => {
      const mockPrefs = {
        linkClicks: true,
        linkMilestones: true,
        workspaceUpdates: false,
        systemAnnouncements: true,
        subscriptionAlerts: true,
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        notificationPreferences: mockPrefs,
      } as never);

      const result = await getUserNotificationPreferences('user-123');

      expect(result).toEqual(mockPrefs);
    });

    it('should return defaults when no preferences set', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        notificationPreferences: null,
      } as never);

      const result = await getUserNotificationPreferences('user-123');

      expect(result).toEqual({
        linkClicks: false,
        linkMilestones: true,
        workspaceUpdates: true,
        systemAnnouncements: true,
        subscriptionAlerts: true,
      });
    });
  });

  describe('updateNotificationPreferences', () => {
    it('should update preferences and sync topics', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        notificationPreferences: {
          linkClicks: false,
          linkMilestones: true,
          workspaceUpdates: true,
          systemAnnouncements: true,
          subscriptionAlerts: true,
        },
      } as never);
      vi.mocked(prisma.user.update).mockResolvedValue({} as never);
      vi.mocked(prisma.fCMToken.findMany).mockResolvedValue([
        { token: 'token-1' },
        { token: 'token-2' },
      ] as never);

      const result = await updateNotificationPreferences('user-123', {
        linkClicks: true,
      });

      expect(result).toBe(true);
      expect(prisma.user.update).toHaveBeenCalled();
      // Should sync topic subscriptions for each token
      expect(subscribeToTopic).toHaveBeenCalled();
    });

    it('should return false on error', async () => {
      // getUserNotificationPreferences catches its own errors, so we need to mock the update to fail
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        notificationPreferences: {
          linkClicks: false,
          linkMilestones: true,
          workspaceUpdates: true,
          systemAnnouncements: true,
          subscriptionAlerts: true,
        },
      } as never);
      vi.mocked(prisma.user.update).mockRejectedValue(new Error('DB error'));

      const result = await updateNotificationPreferences('user-123', {
        linkClicks: true,
      });

      expect(result).toBe(false);
    });
  });
});
