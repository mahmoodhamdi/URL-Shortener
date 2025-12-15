/**
 * FCM Push Notifications Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock firebase admin
const mockSend = vi.fn();
const mockSendEachForMulticast = vi.fn();
const mockSubscribeToTopic = vi.fn();
const mockUnsubscribeFromTopic = vi.fn();

vi.mock('@/lib/firebase/admin', () => ({
  isFirebaseConfigured: vi.fn(() => true),
  getFirebaseMessaging: vi.fn(() => ({
    send: mockSend,
    sendEachForMulticast: mockSendEachForMulticast,
    subscribeToTopic: mockSubscribeToTopic,
    unsubscribeFromTopic: mockUnsubscribeFromTopic,
  })),
}));

import {
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
} from '@/lib/firebase/fcm';

describe('FCM Push Notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('FCM_TOPICS', () => {
    it('should define all required topics', () => {
      expect(FCM_TOPICS.LINK_CLICKS).toBe('link_clicks');
      expect(FCM_TOPICS.LINK_MILESTONES).toBe('link_milestones');
      expect(FCM_TOPICS.WORKSPACE_UPDATES).toBe('workspace_updates');
      expect(FCM_TOPICS.SYSTEM_ANNOUNCEMENTS).toBe('system_announcements');
      expect(FCM_TOPICS.SUBSCRIPTION_ALERTS).toBe('subscription_alerts');
    });
  });

  describe('sendNotification', () => {
    it('should send notification to single device', async () => {
      mockSend.mockResolvedValue('message-id-123');

      const result = await sendNotification('test-token', {
        title: 'Test Title',
        body: 'Test Body',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('message-id-123');
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          token: 'test-token',
          notification: expect.objectContaining({
            title: 'Test Title',
            body: 'Test Body',
          }),
        })
      );
    });

    it('should include data payload when provided', async () => {
      mockSend.mockResolvedValue('message-id-123');

      await sendNotification('test-token', {
        title: 'Test',
        body: 'Test',
        data: { key: 'value' },
      });

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { key: 'value' },
        })
      );
    });

    it('should handle send errors', async () => {
      mockSend.mockRejectedValue(new Error('Token expired'));

      const result = await sendNotification('invalid-token', {
        title: 'Test',
        body: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Token expired');
    });
  });

  describe('sendMulticastNotification', () => {
    it('should send notification to multiple devices', async () => {
      mockSendEachForMulticast.mockResolvedValue({
        successCount: 3,
        failureCount: 0,
      });

      const result = await sendMulticastNotification(
        ['token1', 'token2', 'token3'],
        { title: 'Test', body: 'Test' }
      );

      expect(result.success).toBe(true);
      expect(result.successCount).toBe(3);
      expect(result.failureCount).toBe(0);
    });

    it('should handle partial failures', async () => {
      mockSendEachForMulticast.mockResolvedValue({
        successCount: 2,
        failureCount: 1,
      });

      const result = await sendMulticastNotification(
        ['token1', 'token2', 'token3'],
        { title: 'Test', body: 'Test' }
      );

      expect(result.success).toBe(false);
      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(1);
    });

    it('should return success for empty token array', async () => {
      const result = await sendMulticastNotification([], {
        title: 'Test',
        body: 'Test',
      });

      expect(result.success).toBe(true);
      expect(result.successCount).toBe(0);
      expect(mockSendEachForMulticast).not.toHaveBeenCalled();
    });
  });

  describe('sendTopicNotification', () => {
    it('should send notification to topic', async () => {
      mockSend.mockResolvedValue('message-id-topic');

      const result = await sendTopicNotification(FCM_TOPICS.SYSTEM_ANNOUNCEMENTS, {
        title: 'System Update',
        body: 'New features available!',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('message-id-topic');
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          topic: 'system_announcements',
        })
      );
    });
  });

  describe('subscribeToTopic', () => {
    it('should subscribe single token to topic', async () => {
      mockSubscribeToTopic.mockResolvedValue({});

      const result = await subscribeToTopic('test-token', FCM_TOPICS.LINK_MILESTONES);

      expect(result.success).toBe(true);
      expect(mockSubscribeToTopic).toHaveBeenCalledWith(
        ['test-token'],
        'link_milestones'
      );
    });

    it('should subscribe multiple tokens to topic', async () => {
      mockSubscribeToTopic.mockResolvedValue({});

      const result = await subscribeToTopic(
        ['token1', 'token2'],
        FCM_TOPICS.WORKSPACE_UPDATES
      );

      expect(result.success).toBe(true);
      expect(mockSubscribeToTopic).toHaveBeenCalledWith(
        ['token1', 'token2'],
        'workspace_updates'
      );
    });
  });

  describe('unsubscribeFromTopic', () => {
    it('should unsubscribe token from topic', async () => {
      mockUnsubscribeFromTopic.mockResolvedValue({});

      const result = await unsubscribeFromTopic('test-token', FCM_TOPICS.LINK_CLICKS);

      expect(result.success).toBe(true);
      expect(mockUnsubscribeFromTopic).toHaveBeenCalledWith(
        ['test-token'],
        'link_clicks'
      );
    });
  });

  describe('Notification Templates', () => {
    beforeEach(() => {
      mockSend.mockResolvedValue('message-id');
    });

    it('should send link milestone notification', async () => {
      await notifyLinkMilestone('token', 'My Link', 'abc123', 1000);

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          notification: expect.objectContaining({
            body: expect.stringContaining('1,000 clicks'),
          }),
          data: expect.objectContaining({
            type: 'link_milestone',
            shortCode: 'abc123',
            milestone: '1000',
          }),
        })
      );
    });

    it('should send link click notification', async () => {
      await notifyLinkClick('token', 'My Link', 'abc123', 'US', 'Desktop');

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          notification: expect.objectContaining({
            body: expect.stringContaining('from US'),
          }),
          data: expect.objectContaining({
            type: 'link_click',
            shortCode: 'abc123',
            country: 'US',
            device: 'Desktop',
          }),
        })
      );
    });

    it('should send workspace invitation notification', async () => {
      await notifyWorkspaceInvitation('token', 'My Workspace', 'John', 'inv-123');

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          notification: expect.objectContaining({
            body: expect.stringContaining('John invited you'),
          }),
          data: expect.objectContaining({
            type: 'workspace_invitation',
            workspaceName: 'My Workspace',
            inviterName: 'John',
            invitationToken: 'inv-123',
          }),
        })
      );
    });

    it('should send subscription alert notification', async () => {
      await notifySubscriptionAlert('token', 'expiring', 'Your plan expires in 3 days');

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          notification: expect.objectContaining({
            title: expect.stringContaining('Expiring'),
          }),
          data: expect.objectContaining({
            type: 'subscription_alert',
            alertType: 'expiring',
          }),
        })
      );
    });

    it('should send A/B test complete notification', async () => {
      await notifyABTestComplete('token', 'Homepage Test', 'Variant B', 15);

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          notification: expect.objectContaining({
            body: expect.stringContaining('15% improvement'),
          }),
          data: expect.objectContaining({
            type: 'ab_test_complete',
            testName: 'Homepage Test',
            winningVariant: 'Variant B',
            improvement: '15',
          }),
        })
      );
    });
  });
});
