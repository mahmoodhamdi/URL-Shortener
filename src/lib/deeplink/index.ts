/**
 * Deep linking library - Main exports and CRUD functions
 */

export * from './detector';
export * from './templates';

import { prisma } from '@/lib/db/prisma';
import { Prisma } from '@prisma/client';
import {
  DeepLinkConfig,
  validateDeepLinkConfig,
  generateIOSDeepLinkPage,
  generateAndroidDeepLinkPage,
  generateDesktopFallbackPage,
  DeepLinkPageOptions,
} from './templates';
import { getDeviceInfo, DeviceInfo } from './detector';

/**
 * Plan limits for deep links
 */
export const DEEP_LINK_LIMITS = {
  FREE: 0,
  STARTER: 5,
  PRO: 50,
  BUSINESS: 500,
  ENTERPRISE: Infinity,
} as const;

export type Plan = keyof typeof DEEP_LINK_LIMITS;

/**
 * Check if user can create deep links based on their plan
 */
export async function canUseDeepLinks(userId: string): Promise<{
  allowed: boolean;
  limit: number;
  used: number;
  remaining: number;
  plan: Plan;
}> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  const plan = (subscription?.plan || 'FREE') as Plan;
  const limit = DEEP_LINK_LIMITS[plan];

  // Count existing deep links
  const used = await prisma.link.count({
    where: {
      userId,
      deepLinkEnabled: true,
    },
  });

  const remaining = Math.max(0, limit - used);
  const allowed = limit === Infinity || used < limit;

  return {
    allowed,
    limit: limit === Infinity ? -1 : limit,
    used,
    remaining: limit === Infinity ? -1 : remaining,
    plan,
  };
}

/**
 * Enable deep linking for a link
 */
export async function enableDeepLink(
  linkId: string,
  userId: string,
  config: DeepLinkConfig
): Promise<{ success: boolean; error?: string }> {
  // Validate config
  const validation = validateDeepLinkConfig(config);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  // Check plan limits
  const limits = await canUseDeepLinks(userId);

  // Check if this link already has deep linking (update vs new)
  const existingLink = await prisma.link.findFirst({
    where: { id: linkId, userId },
  });

  if (!existingLink) {
    return { success: false, error: 'Link not found' };
  }

  // If enabling for first time, check limits
  if (!existingLink.deepLinkEnabled && !limits.allowed) {
    return {
      success: false,
      error: `Deep link limit reached (${limits.used}/${limits.limit}). Upgrade your plan for more.`
    };
  }

  // Update link
  await prisma.link.update({
    where: { id: linkId },
    data: {
      deepLinkEnabled: true,
      deepLinkConfig: config as object,
    },
  });

  return { success: true };
}

/**
 * Disable deep linking for a link
 */
export async function disableDeepLink(
  linkId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const link = await prisma.link.findFirst({
    where: { id: linkId, userId },
  });

  if (!link) {
    return { success: false, error: 'Link not found' };
  }

  await prisma.link.update({
    where: { id: linkId },
    data: {
      deepLinkEnabled: false,
      deepLinkConfig: Prisma.JsonNull,
    },
  });

  return { success: true };
}

/**
 * Get deep link config for a link
 */
export async function getDeepLinkConfig(
  linkId: string
): Promise<DeepLinkConfig | null> {
  const link = await prisma.link.findUnique({
    where: { id: linkId },
    select: {
      deepLinkEnabled: true,
      deepLinkConfig: true,
    },
  });

  if (!link?.deepLinkEnabled || !link.deepLinkConfig) {
    return null;
  }

  return link.deepLinkConfig as unknown as DeepLinkConfig;
}

/**
 * Generate the appropriate deep link page based on device
 */
export function generateDeepLinkPage(
  config: DeepLinkConfig,
  userAgent: string,
  path?: string,
  title?: string
): { html: string; deviceInfo: DeviceInfo } {
  const deviceInfo = getDeviceInfo(userAgent);
  const options: DeepLinkPageOptions = {
    config,
    path,
    title,
  };

  let html: string;

  if (deviceInfo.isIOS && config.ios) {
    html = generateIOSDeepLinkPage(options);
  } else if (deviceInfo.isAndroid && config.android) {
    html = generateAndroidDeepLinkPage(options);
  } else {
    html = generateDesktopFallbackPage(options);
  }

  return { html, deviceInfo };
}

/**
 * Check if deep linking should be used for this request
 */
export function shouldUseDeepLink(
  link: { deepLinkEnabled: boolean; deepLinkConfig: unknown },
  userAgent: string
): boolean {
  if (!link.deepLinkEnabled || !link.deepLinkConfig) {
    return false;
  }

  const deviceInfo = getDeviceInfo(userAgent);
  const config = link.deepLinkConfig as DeepLinkConfig;

  // Only use deep linking for mobile devices with configured platform
  if (deviceInfo.isIOS && config.ios) {
    return Boolean(config.ios.scheme || config.ios.universalLink);
  }

  if (deviceInfo.isAndroid && config.android) {
    return Boolean(config.android.scheme || config.android.package);
  }

  return false;
}
