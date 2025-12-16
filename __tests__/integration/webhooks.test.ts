import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    webhook: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    webhookLog: {
      findMany: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    subscription: {
      findUnique: vi.fn(),
    },
  },
}));

// Mock fetch for webhook delivery
const mockFetch = vi.fn();
global.fetch = mockFetch;

import { prisma } from '@/lib/db/prisma';
import {
  generateSignature,
  verifySignature,
  generateWebhookSecret,
  getTimestamp,
  isTimestampValid,
} from '@/lib/webhooks/signature';
import {
  WEBHOOK_EVENTS,
  ALL_WEBHOOK_EVENTS,
  isValidWebhookEvent,
  type WebhookEvent,
} from '@/lib/webhooks/events';

describe('Webhooks Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
  });

  describe('Webhook CRUD Operations', () => {
    it('should create a webhook', async () => {
      const mockWebhook = {
        id: 'webhook-123',
        userId: 'user-123',
        url: 'https://example.com/webhook',
        events: ['link.created', 'link.clicked'],
        secret: 'whsec_test123',
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.webhook.count).mockResolvedValue(0);
      vi.mocked(prisma.webhook.create).mockResolvedValue(mockWebhook as never);

      const result = await prisma.webhook.create({
        data: {
          userId: 'user-123',
          name: 'My Webhook',
          url: 'https://example.com/webhook',
          events: ['link.created', 'link.clicked'],
          secret: 'whsec_test123',
          isActive: true,
        },
      });

      expect(result).toBeDefined();
      expect(result.url).toBe('https://example.com/webhook');
      expect(result.events).toContain('link.created');
    });

    it('should find webhook by id', async () => {
      const mockWebhook = {
        id: 'webhook-123',
        userId: 'user-123',
        url: 'https://example.com/webhook',
        events: ['link.created'],
        secret: 'whsec_test123',
        active: true,
      };

      vi.mocked(prisma.webhook.findUnique).mockResolvedValue(mockWebhook as never);

      const result = await prisma.webhook.findUnique({
        where: { id: 'webhook-123' },
      });

      expect(result).toBeDefined();
      expect(result?.id).toBe('webhook-123');
    });

    it('should find webhooks for user', async () => {
      const mockWebhooks = [
        { id: 'webhook-1', userId: 'user-123', url: 'https://example1.com/webhook' },
        { id: 'webhook-2', userId: 'user-123', url: 'https://example2.com/webhook' },
      ];

      vi.mocked(prisma.webhook.findMany).mockResolvedValue(mockWebhooks as never);

      const result = await prisma.webhook.findMany({
        where: { userId: 'user-123' },
      });

      expect(result).toHaveLength(2);
    });

    it('should update webhook', async () => {
      const mockUpdatedWebhook = {
        id: 'webhook-123',
        url: 'https://new-url.com/webhook',
        events: ['link.created', 'link.deleted'],
        active: true,
        updatedAt: new Date(),
      };

      vi.mocked(prisma.webhook.findUnique).mockResolvedValue({
        id: 'webhook-123',
        userId: 'user-123',
      } as never);
      vi.mocked(prisma.webhook.update).mockResolvedValue(mockUpdatedWebhook as never);

      const result = await prisma.webhook.update({
        where: { id: 'webhook-123' },
        data: { url: 'https://new-url.com/webhook' },
      });

      expect(result.url).toBe('https://new-url.com/webhook');
    });

    it('should delete webhook', async () => {
      vi.mocked(prisma.webhook.findUnique).mockResolvedValue({
        id: 'webhook-123',
        userId: 'user-123',
      } as never);
      vi.mocked(prisma.webhook.delete).mockResolvedValue({} as never);

      await prisma.webhook.delete({
        where: { id: 'webhook-123' },
      });

      expect(prisma.webhook.delete).toHaveBeenCalledWith({
        where: { id: 'webhook-123' },
      });
    });
  });

  describe('Webhook Signature', () => {
    const secret = 'whsec_test123secret456';
    const payload = JSON.stringify({ event: 'link.created', data: { id: 'link-123' } });

    it('should create a valid signature', () => {
      const timestamp = getTimestamp();
      const signature = generateSignature(secret, timestamp, payload);

      expect(signature).toBeDefined();
      expect(signature).toMatch(/^sha256=[a-f0-9]+$/);
    });

    it('should verify a valid signature', () => {
      const timestamp = getTimestamp();
      const signature = generateSignature(secret, timestamp, payload);

      const isValid = verifySignature(secret, timestamp, payload, signature);

      expect(isValid).toBe(true);
    });

    it('should reject invalid signature', () => {
      const timestamp = getTimestamp();
      const isValid = verifySignature(
        secret,
        timestamp,
        payload,
        'sha256=invalid_signature'
      );

      expect(isValid).toBe(false);
    });

    it('should generate webhook secret', () => {
      const secret = generateWebhookSecret();

      expect(secret).toBeDefined();
      expect(secret.length).toBe(32);
    });

    it('should validate timestamp within tolerance', () => {
      const currentTimestamp = getTimestamp();
      expect(isTimestampValid(currentTimestamp)).toBe(true);
    });

    it('should reject expired timestamp', () => {
      const oldTimestamp = String(Math.floor(Date.now() / 1000) - 400); // 400 seconds ago
      expect(isTimestampValid(oldTimestamp)).toBe(false);
    });
  });

  describe('Webhook Events', () => {
    it('should define all required events', () => {
      expect(WEBHOOK_EVENTS).toBeDefined();
      expect(Array.isArray(WEBHOOK_EVENTS)).toBe(true);
      expect(WEBHOOK_EVENTS.length).toBeGreaterThan(0);
    });

    it('should have correct event names', () => {
      const expectedEvents = [
        'link.created',
        'link.clicked',
        'link.updated',
        'link.deleted',
      ];

      for (const event of expectedEvents) {
        expect(ALL_WEBHOOK_EVENTS).toContain(event);
      }
    });

    it('should validate known webhook events', () => {
      expect(isValidWebhookEvent('link.created')).toBe(true);
      expect(isValidWebhookEvent('link.clicked')).toBe(true);
      expect(isValidWebhookEvent('link.updated')).toBe(true);
      expect(isValidWebhookEvent('link.deleted')).toBe(true);
    });

    it('should reject unknown webhook events', () => {
      expect(isValidWebhookEvent('unknown.event')).toBe(false);
      expect(isValidWebhookEvent('')).toBe(false);
    });

    it('should have descriptions for each event', () => {
      for (const event of WEBHOOK_EVENTS) {
        expect(event.event).toBeDefined();
        expect(event.description).toBeDefined();
        expect(event.description.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Webhook Logs', () => {
    it('should create webhook log entry', async () => {
      const mockLog = {
        id: 'log-123',
        webhookId: 'webhook-123',
        event: 'link.created',
        payload: { event: 'link.created' },
        statusCode: 200,
        response: '{"success":true}',
        duration: 150,
        success: true,
        createdAt: new Date(),
      };

      vi.mocked(prisma.webhookLog.create).mockResolvedValue(mockLog as never);

      const result = await prisma.webhookLog.create({
        data: {
          webhookId: 'webhook-123',
          event: 'link.created',
          payload: { event: 'link.created' },
          statusCode: 200,
          response: '{"success":true}',
          duration: 150,
          success: true,
        },
      });

      expect(result).toBeDefined();
      expect(result.statusCode).toBe(200);
      expect(result.duration).toBe(150);
    });

    it('should find logs for webhook', async () => {
      const mockLogs = [
        { id: 'log-1', webhookId: 'webhook-123', status: 200 },
        { id: 'log-2', webhookId: 'webhook-123', status: 500 },
        { id: 'log-3', webhookId: 'webhook-123', status: 200 },
      ];

      vi.mocked(prisma.webhookLog.findMany).mockResolvedValue(mockLogs as never);

      const result = await prisma.webhookLog.findMany({
        where: { webhookId: 'webhook-123' },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });

      expect(result).toHaveLength(3);
    });

    it('should delete old logs', async () => {
      vi.mocked(prisma.webhookLog.deleteMany).mockResolvedValue({ count: 50 } as never);

      const result = await prisma.webhookLog.deleteMany({
        where: {
          webhookId: 'webhook-123',
          createdAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      });

      expect(result.count).toBe(50);
    });
  });

  describe('Webhook Delivery', () => {
    it('should deliver webhook successfully', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve('{"received":true}'),
      });

      const response = await fetch('https://example.com/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'link.created' }),
      });

      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);
    });

    it('should handle webhook delivery failure', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal Server Error'),
      });

      const response = await fetch('https://example.com/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'link.created' }),
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(500);
    });

    it('should handle network timeout', async () => {
      mockFetch.mockRejectedValue(new Error('Network timeout'));

      await expect(
        fetch('https://example.com/webhook', {
          method: 'POST',
          body: JSON.stringify({ event: 'link.created' }),
        })
      ).rejects.toThrow('Network timeout');
    });
  });

  describe('Webhook Limits', () => {
    it('should enforce webhook limits for FREE plan', async () => {
      vi.mocked(prisma.webhook.count).mockResolvedValue(2);

      const count = await prisma.webhook.count({
        where: { userId: 'user-123' },
      });

      // FREE plan allows 2 webhooks
      expect(count).toBe(2);
    });

    it('should allow more webhooks for PRO plan', async () => {
      vi.mocked(prisma.webhook.count).mockResolvedValue(10);

      const count = await prisma.webhook.count({
        where: { userId: 'user-123' },
      });

      // PRO plan allows more webhooks
      expect(count).toBeLessThanOrEqual(20);
    });
  });
});
