/**
 * Retargeting Pixels Module
 * Main exports for retargeting pixel functionality
 */

import { prisma } from '@/lib/db/prisma';
import type { Plan } from '@prisma/client';
import type { PixelType, PixelConfig } from './pixels';
import {
  validatePixelId,
  generatePixelScript,
  generateAllPixelScripts,
  getPixelTypeName,
  getPixelTypeIcon,
} from './pixels';

// Re-export pixel utilities
export type { PixelType, PixelConfig };
export {
  validatePixelId,
  generatePixelScript,
  generateAllPixelScripts,
  getPixelTypeName,
  getPixelTypeIcon,
};

// Plan limits for retargeting pixels
export const PIXEL_LIMITS: Record<Plan, { pixels: number; linksWithPixels: number }> = {
  FREE: { pixels: 0, linksWithPixels: 0 },
  STARTER: { pixels: 1, linksWithPixels: 10 },
  PRO: { pixels: 5, linksWithPixels: 50 },
  BUSINESS: { pixels: 20, linksWithPixels: -1 }, // -1 = unlimited
  ENTERPRISE: { pixels: -1, linksWithPixels: -1 },
};

/**
 * Check if user can create a new pixel
 */
export async function canCreatePixel(
  userId: string,
  plan: Plan
): Promise<{ allowed: boolean; reason?: string; current: number; limit: number }> {
  const limits = PIXEL_LIMITS[plan];

  // Unlimited for ENTERPRISE
  if (limits.pixels === -1) {
    return { allowed: true, current: 0, limit: -1 };
  }

  // Count current pixels
  const currentCount = await prisma.retargetingPixel.count({
    where: { userId },
  });

  const allowed = currentCount < limits.pixels;

  return {
    allowed,
    reason: allowed ? undefined : `You have reached your limit of ${limits.pixels} retargeting pixels for your ${plan} plan`,
    current: currentCount,
    limit: limits.pixels,
  };
}

/**
 * Check if user can add a pixel to a link
 */
export async function canAddPixelToLink(
  userId: string,
  plan: Plan
): Promise<{ allowed: boolean; reason?: string; current: number; limit: number }> {
  const limits = PIXEL_LIMITS[plan];

  // Unlimited for BUSINESS and ENTERPRISE
  if (limits.linksWithPixels === -1) {
    return { allowed: true, current: 0, limit: -1 };
  }

  // Count links with pixels
  const currentCount = await prisma.linkPixel.count({
    where: {
      link: { userId },
    },
  });

  // Group by linkId to get unique links
  const uniqueLinksWithPixels = await prisma.linkPixel.groupBy({
    by: ['linkId'],
    where: {
      link: { userId },
    },
  });

  const uniqueCount = uniqueLinksWithPixels.length;
  const allowed = uniqueCount < limits.linksWithPixels;

  return {
    allowed,
    reason: allowed ? undefined : `You have reached your limit of ${limits.linksWithPixels} links with pixels for your ${plan} plan`,
    current: uniqueCount,
    limit: limits.linksWithPixels,
  };
}

/**
 * Check if retargeting pixels feature is available for plan
 */
export function isPixelsAvailable(plan: Plan): boolean {
  return PIXEL_LIMITS[plan].pixels !== 0;
}

/**
 * Get pixels for a link (for redirect page)
 */
export async function getPixelsForLink(linkId: string): Promise<PixelConfig[]> {
  const linkPixels = await prisma.linkPixel.findMany({
    where: { linkId },
    include: {
      pixel: {
        select: {
          type: true,
          pixelId: true,
          isActive: true,
        },
      },
    },
  });

  return linkPixels
    .filter((lp) => lp.pixel.isActive)
    .map((lp) => ({
      type: lp.pixel.type as PixelType,
      pixelId: lp.pixel.pixelId,
    }));
}

/**
 * Create a new retargeting pixel
 */
export async function createPixel(
  userId: string,
  data: {
    name: string;
    type: PixelType;
    pixelId: string;
  }
) {
  // Validate pixel ID format
  const validation = validatePixelId(data.type, data.pixelId);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  return prisma.retargetingPixel.create({
    data: {
      userId,
      name: data.name,
      type: data.type,
      pixelId: data.pixelId.trim(),
    },
  });
}

/**
 * Update a retargeting pixel
 */
export async function updatePixel(
  pixelId: string,
  userId: string,
  data: {
    name?: string;
    pixelId?: string;
    isActive?: boolean;
  }
) {
  // Verify ownership
  const pixel = await prisma.retargetingPixel.findFirst({
    where: { id: pixelId, userId },
  });

  if (!pixel) {
    throw new Error('Pixel not found');
  }

  // Validate new pixel ID if provided
  if (data.pixelId) {
    const validation = validatePixelId(pixel.type as PixelType, data.pixelId);
    if (!validation.valid) {
      throw new Error(validation.error);
    }
  }

  return prisma.retargetingPixel.update({
    where: { id: pixelId },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.pixelId && { pixelId: data.pixelId.trim() }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
  });
}

/**
 * Delete a retargeting pixel
 */
export async function deletePixel(pixelId: string, userId: string) {
  // Verify ownership
  const pixel = await prisma.retargetingPixel.findFirst({
    where: { id: pixelId, userId },
  });

  if (!pixel) {
    throw new Error('Pixel not found');
  }

  return prisma.retargetingPixel.delete({
    where: { id: pixelId },
  });
}

/**
 * Add pixel to a link
 */
export async function addPixelToLink(linkId: string, pixelId: string, userId: string) {
  // Verify link ownership
  const link = await prisma.link.findFirst({
    where: { id: linkId, userId },
  });

  if (!link) {
    throw new Error('Link not found');
  }

  // Verify pixel ownership
  const pixel = await prisma.retargetingPixel.findFirst({
    where: { id: pixelId, userId },
  });

  if (!pixel) {
    throw new Error('Pixel not found');
  }

  return prisma.linkPixel.create({
    data: {
      linkId,
      pixelId,
    },
  });
}

/**
 * Remove pixel from a link
 */
export async function removePixelFromLink(linkId: string, pixelId: string, userId: string) {
  // Verify link ownership
  const link = await prisma.link.findFirst({
    where: { id: linkId, userId },
  });

  if (!link) {
    throw new Error('Link not found');
  }

  const linkPixel = await prisma.linkPixel.findUnique({
    where: {
      linkId_pixelId: { linkId, pixelId },
    },
  });

  if (!linkPixel) {
    throw new Error('Pixel not attached to link');
  }

  return prisma.linkPixel.delete({
    where: { id: linkPixel.id },
  });
}

/**
 * Get all pixels for a user
 */
export async function getUserPixels(userId: string) {
  return prisma.retargetingPixel.findMany({
    where: { userId },
    include: {
      _count: {
        select: { links: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Get pixel by ID
 */
export async function getPixelById(pixelId: string, userId: string) {
  return prisma.retargetingPixel.findFirst({
    where: { id: pixelId, userId },
    include: {
      links: {
        include: {
          link: {
            select: {
              id: true,
              shortCode: true,
              title: true,
              originalUrl: true,
            },
          },
        },
      },
    },
  });
}
