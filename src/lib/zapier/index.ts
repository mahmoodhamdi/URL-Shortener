/**
 * Zapier Integration
 * Main module for Zapier webhook subscriptions and event dispatching
 */

import { prisma } from '@/lib/db/prisma';
import type { Plan, ZapierEvent } from '@prisma/client';

// Re-export sub-modules
export * from './events';
export * from './dispatcher';

// Plan limits for Zapier subscriptions
export const ZAPIER_LIMITS: Record<Plan, { subscriptions: number; eventsPerDay: number }> = {
  FREE: { subscriptions: 0, eventsPerDay: 0 },
  STARTER: { subscriptions: 2, eventsPerDay: 100 },
  PRO: { subscriptions: 10, eventsPerDay: 1000 },
  BUSINESS: { subscriptions: 50, eventsPerDay: 10000 },
  ENTERPRISE: { subscriptions: -1, eventsPerDay: -1 }, // Unlimited
};

/**
 * Check if Zapier is available for a plan
 */
export function isZapierAvailable(plan: Plan): boolean {
  return ZAPIER_LIMITS[plan].subscriptions !== 0;
}

/**
 * Check if a user can create a new subscription
 */
export async function canCreateSubscription(
  userId: string,
  plan: Plan
): Promise<{ allowed: boolean; limit: number; current: number; reason?: string }> {
  const limit = ZAPIER_LIMITS[plan].subscriptions;

  // Check if plan allows Zapier
  if (limit === 0) {
    return {
      allowed: false,
      limit: 0,
      current: 0,
      reason: 'Zapier integration is not available on your current plan',
    };
  }

  // Unlimited
  if (limit === -1) {
    const current = await prisma.zapierSubscription.count({ where: { userId } });
    return { allowed: true, limit: -1, current };
  }

  // Count current subscriptions
  const current = await prisma.zapierSubscription.count({ where: { userId } });

  if (current >= limit) {
    return {
      allowed: false,
      limit,
      current,
      reason: `You have reached your subscription limit (${limit})`,
    };
  }

  return { allowed: true, limit, current };
}

/**
 * Create a new Zapier subscription
 */
export async function createSubscription(
  userId: string,
  hookUrl: string,
  event: ZapierEvent
) {
  return prisma.zapierSubscription.create({
    data: {
      userId,
      hookUrl,
      event,
      isActive: true,
    },
  });
}

/**
 * Delete a Zapier subscription
 */
export async function deleteSubscription(subscriptionId: string, userId: string) {
  return prisma.zapierSubscription.deleteMany({
    where: {
      id: subscriptionId,
      userId, // Ensure user owns the subscription
    },
  });
}

/**
 * List all subscriptions for a user
 */
export async function listSubscriptions(userId: string) {
  return prisma.zapierSubscription.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Get a subscription by ID
 */
export async function getSubscription(subscriptionId: string, userId: string) {
  return prisma.zapierSubscription.findFirst({
    where: {
      id: subscriptionId,
      userId,
    },
  });
}

/**
 * Update subscription status
 */
export async function updateSubscriptionStatus(
  subscriptionId: string,
  userId: string,
  isActive: boolean
) {
  return prisma.zapierSubscription.updateMany({
    where: {
      id: subscriptionId,
      userId,
    },
    data: { isActive },
  });
}

/**
 * Check if a subscription already exists
 */
export async function subscriptionExists(
  userId: string,
  hookUrl: string,
  event: ZapierEvent
): Promise<boolean> {
  const existing = await prisma.zapierSubscription.findFirst({
    where: {
      userId,
      hookUrl,
      event,
    },
  });
  return !!existing;
}

/**
 * Get subscriptions count by event type for a user
 */
export async function getSubscriptionsByEvent(userId: string) {
  const subscriptions = await prisma.zapierSubscription.groupBy({
    by: ['event'],
    where: { userId },
    _count: { event: true },
  });

  return subscriptions.reduce(
    (acc, sub) => {
      acc[sub.event] = sub._count.event;
      return acc;
    },
    {} as Record<string, number>
  );
}
