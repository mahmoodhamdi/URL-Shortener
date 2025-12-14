/**
 * Webhook Management Module
 */

import { prisma } from '@/lib/db/prisma';
import { nanoid } from 'nanoid';
import { generateWebhookSecret } from './signature';
import { sendWebhook } from './sender';
import type { WebhookEvent, WebhookPayload } from './events';

export * from './events';
export * from './signature';
export * from './sender';

// Plan limits for webhooks
export const WEBHOOK_LIMITS: Record<string, number> = {
  FREE: 0,
  STARTER: 1,
  PRO: 5,
  BUSINESS: 20,
  ENTERPRISE: -1, // Unlimited
};

/**
 * Create a new webhook
 */
export async function createWebhook(
  userId: string,
  data: {
    name: string;
    url: string;
    events: WebhookEvent[];
  }
) {
  const secret = generateWebhookSecret();

  const webhook = await prisma.webhook.create({
    data: {
      userId,
      name: data.name,
      url: data.url,
      secret,
      events: data.events,
    },
  });

  return {
    id: webhook.id,
    name: webhook.name,
    url: webhook.url,
    secret: webhook.secret, // Only returned on creation
    events: webhook.events,
    isActive: webhook.isActive,
    createdAt: webhook.createdAt,
  };
}

/**
 * Get webhook by ID (without secret)
 */
export async function getWebhookById(id: string) {
  const webhook = await prisma.webhook.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      url: true,
      events: true,
      isActive: true,
      failCount: true,
      lastError: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return webhook;
}

/**
 * Get all webhooks for a user
 */
export async function getUserWebhooks(userId: string) {
  const webhooks = await prisma.webhook.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
      url: true,
      events: true,
      isActive: true,
      failCount: true,
      lastError: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return webhooks;
}

/**
 * Update webhook
 */
export async function updateWebhook(
  id: string,
  data: {
    name?: string;
    url?: string;
    events?: WebhookEvent[];
    isActive?: boolean;
  }
) {
  const webhook = await prisma.webhook.update({
    where: { id },
    data,
    select: {
      id: true,
      name: true,
      url: true,
      events: true,
      isActive: true,
      failCount: true,
      lastError: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return webhook;
}

/**
 * Delete webhook
 */
export async function deleteWebhook(id: string) {
  await prisma.webhook.delete({
    where: { id },
  });
}

/**
 * Regenerate webhook secret
 */
export async function regenerateWebhookSecret(id: string) {
  const newSecret = generateWebhookSecret();

  const webhook = await prisma.webhook.update({
    where: { id },
    data: { secret: newSecret },
    select: {
      id: true,
      secret: true,
    },
  });

  return { id: webhook.id, secret: webhook.secret };
}

/**
 * Get webhook logs
 */
export async function getWebhookLogs(
  webhookId: string,
  options: {
    limit?: number;
    offset?: number;
  } = {}
) {
  const { limit = 50, offset = 0 } = options;

  const logs = await prisma.webhookLog.findMany({
    where: { webhookId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
    select: {
      id: true,
      event: true,
      statusCode: true,
      success: true,
      duration: true,
      createdAt: true,
    },
  });

  return logs;
}

/**
 * Check webhook limits for user
 */
export async function checkWebhookLimits(userId: string): Promise<{
  allowed: boolean;
  used: number;
  limit: number;
  plan: string;
  message?: string;
}> {
  // Get user's subscription
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  const plan = subscription?.plan || 'FREE';
  const limit = WEBHOOK_LIMITS[plan] ?? 0;

  // Count existing webhooks
  const used = await prisma.webhook.count({
    where: { userId },
  });

  // Unlimited
  if (limit === -1) {
    return { allowed: true, used, limit: -1, plan };
  }

  // Check if allowed
  if (limit === 0) {
    return {
      allowed: false,
      used,
      limit: 0,
      plan,
      message: 'Webhooks are not available on your plan. Please upgrade.',
    };
  }

  if (used >= limit) {
    return {
      allowed: false,
      used,
      limit,
      plan,
      message: `Webhook limit reached (${used}/${limit}). Upgrade your plan for more webhooks.`,
    };
  }

  return {
    allowed: true,
    used,
    limit,
    plan,
  };
}

/**
 * Trigger webhooks for an event
 * This is the main function to call when an event occurs
 */
export async function triggerWebhooks<T>(
  userId: string,
  event: WebhookEvent,
  data: T
) {
  // Get active webhooks for this user that subscribe to this event
  const webhooks = await prisma.webhook.findMany({
    where: {
      userId,
      isActive: true,
      events: { has: event },
    },
    select: {
      id: true,
      url: true,
      secret: true,
    },
  });

  if (webhooks.length === 0) return;

  // Create payload
  const payload: WebhookPayload<T> = {
    id: `evt_${nanoid(16)}`,
    event,
    timestamp: new Date().toISOString(),
    data,
  };

  // Send webhooks in parallel (fire and forget)
  Promise.all(
    webhooks.map(webhook =>
      sendWebhook(webhook.id, webhook.url, webhook.secret, payload).catch(err => {
        console.error(`Failed to send webhook ${webhook.id}:`, err);
      })
    )
  ).catch(err => {
    console.error('Error triggering webhooks:', err);
  });
}

/**
 * Trigger link.created event
 */
export function triggerLinkCreated(
  userId: string,
  link: {
    id: string;
    shortCode: string;
    originalUrl: string;
    customAlias: string | null;
    createdAt: Date;
  }
) {
  return triggerWebhooks(userId, 'link.created', {
    link: {
      ...link,
      createdAt: link.createdAt.toISOString(),
    },
  });
}

/**
 * Trigger link.updated event
 */
export function triggerLinkUpdated(
  userId: string,
  link: {
    id: string;
    shortCode: string;
    originalUrl: string;
    customAlias: string | null;
    updatedAt: Date;
  },
  changes: Record<string, { old: unknown; new: unknown }>
) {
  return triggerWebhooks(userId, 'link.updated', {
    link: {
      ...link,
      updatedAt: link.updatedAt.toISOString(),
    },
    changes,
  });
}

/**
 * Trigger link.deleted event
 */
export function triggerLinkDeleted(
  userId: string,
  linkId: string,
  shortCode: string
) {
  return triggerWebhooks(userId, 'link.deleted', {
    linkId,
    shortCode,
    deletedAt: new Date().toISOString(),
  });
}

/**
 * Trigger link.clicked event
 */
export function triggerLinkClicked(
  userId: string,
  link: {
    id: string;
    shortCode: string;
    originalUrl: string;
  },
  click: {
    id: string;
    ip: string | null;
    country: string | null;
    device: string | null;
    browser: string | null;
    referrer: string | null;
    clickedAt: Date;
  }
) {
  return triggerWebhooks(userId, 'link.clicked', {
    link,
    click: {
      ...click,
      clickedAt: click.clickedAt.toISOString(),
    },
  });
}

/**
 * Trigger link.expired event
 */
export function triggerLinkExpired(
  userId: string,
  link: {
    id: string;
    shortCode: string;
    originalUrl: string;
    expiresAt: Date;
  }
) {
  return triggerWebhooks(userId, 'link.expired', {
    link: {
      ...link,
      expiresAt: link.expiresAt.toISOString(),
    },
  });
}
