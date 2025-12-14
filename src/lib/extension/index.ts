import { prisma } from '@/lib/db/prisma';
import { nanoid } from 'nanoid';
import type { Plan } from '@prisma/client';

/**
 * Extension token limits per plan
 */
export const EXTENSION_LIMITS: Record<Plan, number> = {
  FREE: 1,
  STARTER: 3,
  PRO: 10,
  BUSINESS: -1, // Unlimited
  ENTERPRISE: -1, // Unlimited
};

/**
 * Check if extension is available for a plan
 */
export function isExtensionAvailable(plan: Plan): boolean {
  return EXTENSION_LIMITS[plan] !== 0;
}

/**
 * Generate a secure extension token
 */
export function generateExtensionToken(): string {
  return `ext_${nanoid(32)}`;
}

/**
 * Check if user can create more extension tokens
 */
export async function canCreateExtensionToken(
  userId: string,
  plan: Plan
): Promise<{
  allowed: boolean;
  limit: number;
  current: number;
  reason?: string;
}> {
  const limit = EXTENSION_LIMITS[plan];

  // Unlimited plan
  if (limit === -1) {
    return { allowed: true, limit: -1, current: 0 };
  }

  // Not available
  if (limit === 0) {
    return {
      allowed: false,
      limit: 0,
      current: 0,
      reason: 'Extension tokens are not available for free plans',
    };
  }

  const current = await prisma.extensionToken.count({
    where: { userId },
  });

  if (current >= limit) {
    return {
      allowed: false,
      limit,
      current,
      reason: `You have reached your limit of ${limit} extension token(s). Upgrade your plan for more.`,
    };
  }

  return { allowed: true, limit, current };
}

/**
 * Create a new extension token
 */
export async function createExtensionToken(
  userId: string,
  options?: {
    name?: string;
    deviceInfo?: string;
    expiresAt?: Date;
  }
) {
  const token = generateExtensionToken();

  return prisma.extensionToken.create({
    data: {
      userId,
      token,
      name: options?.name || 'Browser Extension',
      deviceInfo: options?.deviceInfo,
      expiresAt: options?.expiresAt,
    },
  });
}

/**
 * Validate an extension token
 */
export async function validateExtensionToken(token: string) {
  const extensionToken = await prisma.extensionToken.findUnique({
    where: { token },
    include: {
      user: {
        include: {
          subscription: true,
        },
      },
    },
  });

  if (!extensionToken) {
    return { valid: false, error: 'Invalid token' };
  }

  // Check expiration
  if (extensionToken.expiresAt && extensionToken.expiresAt < new Date()) {
    return { valid: false, error: 'Token has expired' };
  }

  // Update last used
  await prisma.extensionToken.update({
    where: { id: extensionToken.id },
    data: { lastUsedAt: new Date() },
  });

  return {
    valid: true,
    token: extensionToken,
    user: extensionToken.user,
    plan: extensionToken.user.subscription?.plan || 'FREE',
  };
}

/**
 * Get all extension tokens for a user
 */
export async function getExtensionTokens(userId: string) {
  return prisma.extensionToken.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Delete an extension token
 */
export async function deleteExtensionToken(tokenId: string, userId: string) {
  return prisma.extensionToken.deleteMany({
    where: {
      id: tokenId,
      userId,
    },
  });
}

/**
 * Get extension statistics for a user
 */
export async function getExtensionStats(
  userId: string,
  plan: Plan
): Promise<{
  tokens: number;
  limit: number;
  remaining: number;
  isUnlimited: boolean;
}> {
  const limit = EXTENSION_LIMITS[plan];
  const tokens = await prisma.extensionToken.count({
    where: { userId },
  });

  return {
    tokens,
    limit,
    remaining: limit === -1 ? -1 : Math.max(0, limit - tokens),
    isUnlimited: limit === -1,
  };
}

/**
 * Revoke all extension tokens for a user
 */
export async function revokeAllExtensionTokens(userId: string) {
  return prisma.extensionToken.deleteMany({
    where: { userId },
  });
}

/**
 * Clean up expired tokens
 */
export async function cleanupExpiredTokens() {
  return prisma.extensionToken.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  });
}
