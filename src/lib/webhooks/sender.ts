/**
 * Webhook HTTP Sender with Retry Logic
 */

import { prisma } from '@/lib/db/prisma';
import { generateSignature, getTimestamp } from './signature';
import type { WebhookPayload } from './events';

const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 5000, 30000]; // 1s, 5s, 30s
const TIMEOUT_MS = 10000; // 10 seconds
const MAX_CONSECUTIVE_FAILURES = 10;

interface SendResult {
  success: boolean;
  statusCode?: number;
  response?: string;
  duration?: number;
  error?: string;
}

/**
 * Send webhook with retry logic
 */
export async function sendWebhook(
  webhookId: string,
  url: string,
  secret: string,
  payload: WebhookPayload
): Promise<SendResult> {
  const payloadString = JSON.stringify(payload);
  const timestamp = getTimestamp();
  const signature = generateSignature(secret, timestamp, payloadString);

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Timestamp': timestamp,
          'X-Webhook-Event': payload.event,
          'User-Agent': 'URL-Shortener-Webhook/1.0',
        },
        body: payloadString,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;
      const responseText = await response.text();

      const result: SendResult = {
        success: response.ok,
        statusCode: response.status,
        response: responseText.slice(0, 1000), // Limit response size
        duration,
      };

      // Log the attempt
      await logWebhookAttempt(webhookId, payload.event, payload, result);

      // Update webhook status
      if (result.success) {
        await resetWebhookFailCount(webhookId);
      } else {
        await incrementWebhookFailCount(webhookId, result.error || `HTTP ${result.statusCode}`);
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // If this is the last attempt, log and return failure
      if (attempt === MAX_RETRIES) {
        const result: SendResult = {
          success: false,
          error: errorMessage,
          duration,
        };

        await logWebhookAttempt(webhookId, payload.event, payload, result);
        await incrementWebhookFailCount(webhookId, errorMessage);

        return result;
      }

      // Wait before retry
      await sleep(RETRY_DELAYS[attempt] || RETRY_DELAYS[RETRY_DELAYS.length - 1]);
    }
  }

  return { success: false, error: 'Max retries exceeded' };
}

/**
 * Log webhook attempt to database
 */
async function logWebhookAttempt(
  webhookId: string,
  event: string,
  payload: WebhookPayload,
  result: SendResult
) {
  try {
    await prisma.webhookLog.create({
      data: {
        webhookId,
        event,
        payload: payload as object,
        statusCode: result.statusCode,
        response: result.response,
        duration: result.duration,
        success: result.success,
      },
    });
  } catch (error) {
    console.error('Failed to log webhook attempt:', error);
  }
}

/**
 * Reset webhook fail count on success
 */
async function resetWebhookFailCount(webhookId: string) {
  try {
    await prisma.webhook.update({
      where: { id: webhookId },
      data: {
        failCount: 0,
        lastError: null,
      },
    });
  } catch (error) {
    console.error('Failed to reset webhook fail count:', error);
  }
}

/**
 * Increment webhook fail count and potentially disable
 */
async function incrementWebhookFailCount(webhookId: string, error: string) {
  try {
    const webhook = await prisma.webhook.findUnique({
      where: { id: webhookId },
      select: { failCount: true },
    });

    const newFailCount = (webhook?.failCount || 0) + 1;

    await prisma.webhook.update({
      where: { id: webhookId },
      data: {
        failCount: newFailCount,
        lastError: error,
        // Disable if too many consecutive failures
        isActive: newFailCount < MAX_CONSECUTIVE_FAILURES,
      },
    });
  } catch (err) {
    console.error('Failed to update webhook fail count:', err);
  }
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Send test webhook
 */
export async function sendTestWebhook(
  url: string,
  secret: string
): Promise<SendResult> {
  const testPayload: WebhookPayload = {
    id: `test_${Date.now()}`,
    event: 'link.created',
    timestamp: new Date().toISOString(),
    data: {
      message: 'This is a test webhook',
      link: {
        id: 'test_link_id',
        shortCode: 'test123',
        originalUrl: 'https://example.com',
        customAlias: null,
        createdAt: new Date().toISOString(),
      },
    },
  };

  const payloadString = JSON.stringify(testPayload);
  const timestamp = getTimestamp();
  const signature = generateSignature(secret, timestamp, payloadString);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const startTime = Date.now();
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Timestamp': timestamp,
        'X-Webhook-Event': 'link.created',
        'User-Agent': 'URL-Shortener-Webhook/1.0 (Test)',
      },
      body: payloadString,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const duration = Date.now() - startTime;
    const responseText = await response.text();

    return {
      success: response.ok,
      statusCode: response.status,
      response: responseText.slice(0, 1000),
      duration,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
