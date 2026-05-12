import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockFetch = vi.fn();
global.fetch = mockFetch;

vi.mock('@/lib/webhooks/signature', () => ({
  generateSignature: vi.fn(() => 'sig'),
  getTimestamp: vi.fn(() => 'ts'),
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    webhookLog: { create: vi.fn() },
    webhook: { findUnique: vi.fn(), update: vi.fn() },
  },
}));

import { sendWebhook } from '@/lib/webhooks/sender';
import { prisma } from '@/lib/db/prisma';

const p = prisma as unknown as {
  webhookLog: { create: ReturnType<typeof vi.fn> };
  webhook: {
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
};

const payload = {
  id: 'evt_1',
  event: 'link.created' as const,
  timestamp: '2026-01-01T00:00:00Z',
  data: { link: { id: 'L1', shortCode: 'abc' } },
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  p.webhookLog.create.mockResolvedValue({});
  p.webhook.findUnique.mockResolvedValue({ failCount: 0 });
  p.webhook.update.mockResolvedValue({});
});

afterEach(() => {
  vi.useRealTimers();
});

describe('sendWebhook (retry path)', () => {
  it('succeeds on the first attempt and resets the fail counter', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: () => Promise.resolve('ok'),
    });

    const promise = sendWebhook('w1', 'https://hooks.example.com', 'secret', payload as never);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.success).toBe(true);
    expect(result.statusCode).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Reset call: failCount=0, lastError=null
    const updateCall = p.webhook.update.mock.calls[0][0];
    expect(updateCall.data).toMatchObject({ failCount: 0, lastError: null });
  });

  it('retries on network errors using the documented backoff and eventually fails', async () => {
    mockFetch.mockRejectedValue(new Error('ECONNRESET'));

    const promise = sendWebhook('w1', 'https://hooks.example.com', 'secret', payload as never);
    // 4 attempts total (initial + 3 retries) with 1s, 5s, 30s sleeps between.
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(5000);
    await vi.advanceTimersByTimeAsync(30_000);
    const result = await promise;

    expect(result.success).toBe(false);
    expect(result.error).toBe('ECONNRESET');
    expect(mockFetch).toHaveBeenCalledTimes(4);
    // Final attempt logs once and increments fail count.
    expect(p.webhookLog.create).toHaveBeenCalledTimes(1);
    expect(p.webhook.update).toHaveBeenCalledTimes(1);
  });

  it('logs every HTTP response, even non-2xx, and increments the fail counter', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
      text: () => Promise.resolve('upstream down'),
    });

    const promise = sendWebhook('w1', 'https://hooks.example.com', 'secret', payload as never);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(503);
    expect(p.webhookLog.create).toHaveBeenCalledTimes(1);
    const logCall = p.webhookLog.create.mock.calls[0][0];
    expect(logCall.data.success).toBe(false);
    expect(logCall.data.statusCode).toBe(503);
  });

  it('disables the webhook once the failure budget is exceeded', async () => {
    p.webhook.findUnique.mockResolvedValue({ failCount: 9 });
    mockFetch.mockRejectedValue(new Error('timeout'));

    const promise = sendWebhook('w1', 'https://hooks.example.com', 'secret', payload as never);
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(5000);
    await vi.advanceTimersByTimeAsync(30_000);
    await promise;

    const updateCall = p.webhook.update.mock.calls[0][0];
    expect(updateCall.data.failCount).toBe(10);
    expect(updateCall.data.isActive).toBe(false);
  });

  it('truncates very long response bodies to 1000 chars', async () => {
    const longBody = 'A'.repeat(5000);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: () => Promise.resolve(longBody),
    });

    const promise = sendWebhook('w1', 'https://hooks.example.com', 'secret', payload as never);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.response?.length).toBe(1000);
  });

  it('sends the documented webhook headers', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: () => Promise.resolve(''),
    });

    const promise = sendWebhook('w1', 'https://hooks.example.com', 'secret', payload as never);
    await vi.runAllTimersAsync();
    await promise;

    const headers = mockFetch.mock.calls[0][1].headers as Record<string, string>;
    expect(headers['Content-Type']).toBe('application/json');
    expect(headers['X-Webhook-Signature']).toBe('sig');
    expect(headers['X-Webhook-Timestamp']).toBe('ts');
    expect(headers['X-Webhook-Event']).toBe('link.created');
    expect(headers['User-Agent']).toMatch(/URL-Shortener-Webhook/);
  });
});
