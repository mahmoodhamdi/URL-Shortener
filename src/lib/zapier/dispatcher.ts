/**
 * Zapier Integration - Event Dispatcher
 * Sends events to subscribed Zapier webhooks
 */

import { prisma } from '@/lib/db/prisma';
import { ZapierEventType, ZapierEventPayloadMap } from './events';

interface DispatchResult {
  subscriptionId: string;
  hookUrl: string;
  success: boolean;
  statusCode?: number;
  error?: string;
}

interface DispatchSummary {
  event: ZapierEventType;
  totalSubscriptions: number;
  successful: number;
  failed: number;
  results: DispatchResult[];
}

/**
 * Dispatch an event to all subscribed Zapier webhooks for a user
 */
export async function dispatchZapierEvent<T extends ZapierEventType>(
  userId: string,
  event: T,
  payload: ZapierEventPayloadMap[T]
): Promise<DispatchSummary> {
  // Get all active subscriptions for this user and event
  const subscriptions = await prisma.zapierSubscription.findMany({
    where: {
      userId,
      event,
      isActive: true,
    },
  });

  const results: DispatchResult[] = [];

  // Send to each webhook
  for (const subscription of subscriptions) {
    const result = await sendToWebhook(subscription.id, subscription.hookUrl, event, payload);
    results.push(result);
  }

  return {
    event,
    totalSubscriptions: subscriptions.length,
    successful: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    results,
  };
}

/**
 * Send payload to a Zapier webhook URL
 */
async function sendToWebhook<T extends ZapierEventType>(
  subscriptionId: string,
  hookUrl: string,
  event: T,
  payload: ZapierEventPayloadMap[T]
): Promise<DispatchResult> {
  try {
    const response = await fetch(hookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'URLShortener-Zapier/1.0',
      },
      body: JSON.stringify({
        event,
        timestamp: new Date().toISOString(),
        data: payload,
      }),
    });

    return {
      subscriptionId,
      hookUrl,
      success: response.ok,
      statusCode: response.status,
    };
  } catch (error) {
    return {
      subscriptionId,
      hookUrl,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Dispatch event to all users who have subscriptions for this event
 * Used for global events that affect multiple users
 */
export async function dispatchGlobalZapierEvent<T extends ZapierEventType>(
  event: T,
  payload: ZapierEventPayloadMap[T]
): Promise<DispatchSummary> {
  // Get all active subscriptions for this event
  const subscriptions = await prisma.zapierSubscription.findMany({
    where: {
      event,
      isActive: true,
    },
  });

  const results: DispatchResult[] = [];

  // Send to each webhook
  for (const subscription of subscriptions) {
    const result = await sendToWebhook(subscription.id, subscription.hookUrl, event, payload);
    results.push(result);
  }

  return {
    event,
    totalSubscriptions: subscriptions.length,
    successful: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    results,
  };
}

/**
 * Validate a webhook URL
 * Must be HTTPS for security
 */
export function validateWebhookUrl(url: string): { valid: boolean; error?: string } {
  try {
    const parsed = new URL(url);

    if (parsed.protocol !== 'https:') {
      return {
        valid: false,
        error: 'Webhook URL must use HTTPS',
      };
    }

    // Check for valid Zapier domain patterns
    const validDomains = [
      'hooks.zapier.com',
      'hooks.zapier.dev',
    ];

    const isZapierDomain = validDomains.some(
      (domain) => parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`)
    );

    if (!isZapierDomain) {
      // Allow other HTTPS URLs for testing, but warn
      return {
        valid: true,
      };
    }

    return { valid: true };
  } catch {
    return {
      valid: false,
      error: 'Invalid URL format',
    };
  }
}

/**
 * Deactivate a subscription after too many failures
 */
export async function deactivateSubscription(subscriptionId: string): Promise<void> {
  await prisma.zapierSubscription.update({
    where: { id: subscriptionId },
    data: { isActive: false },
  });
}
