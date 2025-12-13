/**
 * Link Targeting Module
 * Provides device, geo, and browser-based URL targeting
 */

export * from './detector';
export * from './matcher';

import { prisma } from '@/lib/db/prisma';
import { detectAll, type DetectedInfo } from './detector';
import { findMatchingTarget, type Target } from './matcher';

// Plan limits for targeting rules
export const TARGETING_LIMITS: Record<string, number> = {
  FREE: 0,
  STARTER: 2,
  PRO: 5,
  BUSINESS: 20,
  ENTERPRISE: -1, // Unlimited
};

/**
 * Get all targets for a link
 */
export async function getLinkTargets(linkId: string): Promise<Target[]> {
  const targets = await prisma.linkTarget.findMany({
    where: { linkId },
    orderBy: { priority: 'desc' },
  });

  return targets.map(t => ({
    id: t.id,
    type: t.type as Target['type'],
    value: t.value,
    targetUrl: t.targetUrl,
    priority: t.priority,
    isActive: t.isActive,
  }));
}

/**
 * Create a new target for a link
 */
export async function createLinkTarget(
  linkId: string,
  data: {
    type: Target['type'];
    value: string;
    targetUrl: string;
    priority?: number;
    isActive?: boolean;
  }
): Promise<Target> {
  const target = await prisma.linkTarget.create({
    data: {
      linkId,
      type: data.type,
      value: data.value,
      targetUrl: data.targetUrl,
      priority: data.priority ?? 0,
      isActive: data.isActive ?? true,
    },
  });

  return {
    id: target.id,
    type: target.type as Target['type'],
    value: target.value,
    targetUrl: target.targetUrl,
    priority: target.priority,
    isActive: target.isActive,
  };
}

/**
 * Update a target
 */
export async function updateLinkTarget(
  targetId: string,
  data: {
    targetUrl?: string;
    priority?: number;
    isActive?: boolean;
  }
): Promise<Target> {
  const target = await prisma.linkTarget.update({
    where: { id: targetId },
    data,
  });

  return {
    id: target.id,
    type: target.type as Target['type'],
    value: target.value,
    targetUrl: target.targetUrl,
    priority: target.priority,
    isActive: target.isActive,
  };
}

/**
 * Delete a target
 */
export async function deleteLinkTarget(targetId: string): Promise<void> {
  await prisma.linkTarget.delete({
    where: { id: targetId },
  });
}

/**
 * Get target count for a link
 */
export async function getLinkTargetCount(linkId: string): Promise<number> {
  return prisma.linkTarget.count({
    where: { linkId },
  });
}

/**
 * Check if user can add more targets based on their plan
 */
export async function checkTargetingLimit(
  userId: string,
  linkId: string
): Promise<{
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
  const limit = TARGETING_LIMITS[plan] ?? 0;

  // Count existing targets for this link
  const used = await getLinkTargetCount(linkId);

  // Unlimited (-1) means always allowed
  if (limit === -1) {
    return {
      allowed: true,
      used,
      limit: -1,
      plan,
    };
  }

  // Check if limit is reached
  if (limit === 0) {
    return {
      allowed: false,
      used,
      limit,
      plan,
      message: 'Targeting rules are not available on your plan. Please upgrade to use this feature.',
    };
  }

  if (used >= limit) {
    return {
      allowed: false,
      used,
      limit,
      plan,
      message: `Target rule limit reached (${used}/${limit}). Upgrade your plan for more rules.`,
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
 * Resolve target URL for a link based on request
 * This is the main function called during redirect
 */
export async function resolveTargetUrl(
  link: {
    id: string;
    originalUrl: string;
  },
  request: Request
): Promise<string> {
  // Get targets for this link
  const targets = await getLinkTargets(link.id);

  // If no targets, return original URL
  if (targets.length === 0) {
    return link.originalUrl;
  }

  // Detect user info
  const userAgent = request.headers.get('user-agent');
  const detected: DetectedInfo = detectAll(userAgent, request.headers);

  // Find matching target
  const matchedTarget = findMatchingTarget(targets, detected);

  return matchedTarget ? matchedTarget.targetUrl : link.originalUrl;
}
