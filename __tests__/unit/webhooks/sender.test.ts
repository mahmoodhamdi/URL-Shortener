import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sendTestWebhook } from '@/lib/webhooks/sender';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock the signature module
vi.mock('@/lib/webhooks/signature', () => ({
  generateSignature: vi.fn(() => 'mock-signature-12345'),
  getTimestamp: vi.fn(() => '1702641600'),
}));

describe('Webhook Sender', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('sendTestWebhook', () => {
    it('should send a test webhook successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve('OK'),
      });

      const result = await sendTestWebhook('https://webhook.example.com/receive', 'secret123');

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(result.response).toBe('OK');
      expect(result.duration).toBeDefined();
    });

    it('should return failure for non-ok response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: () => Promise.resolve('Not Found'),
      });

      const result = await sendTestWebhook('https://webhook.example.com/receive', 'secret123');

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(404);
      expect(result.response).toBe('Not Found');
    });

    it('should include proper headers in request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve('OK'),
      });

      await sendTestWebhook('https://webhook.example.com/receive', 'secret123');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://webhook.example.com/receive',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-Webhook-Signature': 'mock-signature-12345',
            'X-Webhook-Timestamp': '1702641600',
            'X-Webhook-Event': 'link.created',
            'User-Agent': expect.stringContaining('URL-Shortener-Webhook'),
          }),
        })
      );
    });

    it('should send valid JSON payload', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve('OK'),
      });

      await sendTestWebhook('https://webhook.example.com/receive', 'secret123');

      const callArgs = mockFetch.mock.calls[0][1];
      const payload = JSON.parse(callArgs.body);

      expect(payload).toHaveProperty('id');
      expect(payload).toHaveProperty('event', 'link.created');
      expect(payload).toHaveProperty('timestamp');
      expect(payload).toHaveProperty('data');
      expect(payload.data).toHaveProperty('message', 'This is a test webhook');
      expect(payload.data.link).toHaveProperty('shortCode', 'test123');
    });

    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await sendTestWebhook('https://webhook.example.com/receive', 'secret123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('should handle timeout errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('The operation was aborted'));

      const result = await sendTestWebhook('https://webhook.example.com/receive', 'secret123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('aborted');
    });

    it('should handle non-Error thrown objects', async () => {
      mockFetch.mockRejectedValueOnce('String error');

      const result = await sendTestWebhook('https://webhook.example.com/receive', 'secret123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error');
    });

    it('should truncate long responses', async () => {
      const longResponse = 'A'.repeat(2000);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(longResponse),
      });

      const result = await sendTestWebhook('https://webhook.example.com/receive', 'secret123');

      expect(result.response?.length).toBeLessThanOrEqual(1000);
    });

    it('should handle empty response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        text: () => Promise.resolve(''),
      });

      const result = await sendTestWebhook('https://webhook.example.com/receive', 'secret123');

      expect(result.success).toBe(true);
      expect(result.response).toBe('');
    });

    it('should handle various HTTP status codes', async () => {
      // 500 Internal Server Error
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal Server Error'),
      });

      const result500 = await sendTestWebhook('https://webhook.example.com/receive', 'secret123');
      expect(result500.success).toBe(false);
      expect(result500.statusCode).toBe(500);

      // 201 Created
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        text: () => Promise.resolve('Created'),
      });

      const result201 = await sendTestWebhook('https://webhook.example.com/receive', 'secret123');
      expect(result201.success).toBe(true);
      expect(result201.statusCode).toBe(201);
    });

    it('should calculate duration correctly', async () => {
      mockFetch.mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve({
              ok: true,
              status: 200,
              text: () => Promise.resolve('OK'),
            });
          }, 100);
        });
      });

      const resultPromise = sendTestWebhook('https://webhook.example.com/receive', 'secret123');

      // Advance timers
      await vi.advanceTimersByTimeAsync(100);

      const result = await resultPromise;

      expect(result.duration).toBeDefined();
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });
  });
});
