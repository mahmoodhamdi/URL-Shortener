/**
 * Link Cloaking
 * Hide destination URLs from visitors
 */

import { prisma } from '@/lib/db/prisma';
import type { Plan, CloakingType } from '@prisma/client';

// Re-export templates
export * from './templates';

// Plan limits for cloaked links
export const CLOAKING_LIMITS: Record<Plan, number> = {
  FREE: 0,
  STARTER: 10,
  PRO: 50,
  BUSINESS: -1, // Unlimited
  ENTERPRISE: -1, // Unlimited
};

/**
 * Check if cloaking is available for a plan
 */
export function isCloakingAvailable(plan: Plan): boolean {
  return CLOAKING_LIMITS[plan] !== 0;
}

/**
 * Check if a user can enable cloaking on a link
 */
export async function canEnableCloaking(
  userId: string,
  plan: Plan
): Promise<{ allowed: boolean; limit: number; current: number; reason?: string }> {
  const limit = CLOAKING_LIMITS[plan];

  // Check if plan allows cloaking
  if (limit === 0) {
    return {
      allowed: false,
      limit: 0,
      current: 0,
      reason: 'Link cloaking is not available on your current plan',
    };
  }

  // Unlimited
  if (limit === -1) {
    const current = await prisma.link.count({
      where: { userId, cloakingEnabled: true },
    });
    return { allowed: true, limit: -1, current };
  }

  // Count current cloaked links
  const current = await prisma.link.count({
    where: { userId, cloakingEnabled: true },
  });

  if (current >= limit) {
    return {
      allowed: false,
      limit,
      current,
      reason: `You have reached your cloaked links limit (${limit})`,
    };
  }

  return { allowed: true, limit, current };
}

/**
 * Get all cloaked links for a user
 */
export async function getCloakedLinks(userId: string) {
  return prisma.link.findMany({
    where: {
      userId,
      cloakingEnabled: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Enable cloaking on a link
 */
export async function enableCloaking(
  linkId: string,
  userId: string,
  options: {
    type: CloakingType;
    title?: string;
    favicon?: string;
  }
) {
  return prisma.link.updateMany({
    where: {
      id: linkId,
      userId,
    },
    data: {
      cloakingEnabled: true,
      cloakingType: options.type,
      cloakingTitle: options.title || null,
      cloakingFavicon: options.favicon || null,
    },
  });
}

/**
 * Disable cloaking on a link
 */
export async function disableCloaking(linkId: string, userId: string) {
  return prisma.link.updateMany({
    where: {
      id: linkId,
      userId,
    },
    data: {
      cloakingEnabled: false,
      cloakingType: null,
      cloakingTitle: null,
      cloakingFavicon: null,
    },
  });
}

/**
 * Update cloaking settings on a link
 */
export async function updateCloakingSettings(
  linkId: string,
  userId: string,
  options: {
    type?: CloakingType;
    title?: string | null;
    favicon?: string | null;
  }
) {
  const updateData: Record<string, unknown> = {};

  if (options.type !== undefined) {
    updateData.cloakingType = options.type;
  }
  if (options.title !== undefined) {
    updateData.cloakingTitle = options.title;
  }
  if (options.favicon !== undefined) {
    updateData.cloakingFavicon = options.favicon;
  }

  return prisma.link.updateMany({
    where: {
      id: linkId,
      userId,
    },
    data: updateData,
  });
}

/**
 * Get cloaking stats for a user
 */
export async function getCloakingStats(userId: string, plan: Plan) {
  const limit = CLOAKING_LIMITS[plan];
  const current = await prisma.link.count({
    where: { userId, cloakingEnabled: true },
  });

  return {
    enabled: current,
    limit,
    remaining: limit === -1 ? -1 : Math.max(0, limit - current),
    isUnlimited: limit === -1,
  };
}

/**
 * Validate cloaking settings
 */
export function validateCloakingSettings(options: {
  type?: string;
  title?: string;
  favicon?: string;
}): { valid: boolean; error?: string } {
  // Validate type
  if (options.type) {
    const validTypes = ['IFRAME', 'JAVASCRIPT', 'META_REFRESH'];
    if (!validTypes.includes(options.type)) {
      return {
        valid: false,
        error: `Invalid cloaking type. Must be one of: ${validTypes.join(', ')}`,
      };
    }
  }

  // Validate title length
  if (options.title && options.title.length > 100) {
    return {
      valid: false,
      error: 'Cloaking title must be 100 characters or less',
    };
  }

  // Validate favicon URL
  if (options.favicon) {
    try {
      new URL(options.favicon);
    } catch {
      return {
        valid: false,
        error: 'Cloaking favicon must be a valid URL',
      };
    }
  }

  return { valid: true };
}
