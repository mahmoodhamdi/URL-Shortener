/**
 * Bio Page Module
 *
 * Provides functionality for creating and managing link-in-bio pages.
 */

import { prisma } from '@/lib/db/prisma';
import { getPlanLimits } from '@/lib/stripe/plans';
import { Plan } from '@/types';
import { BioPageTheme } from './themes';

export * from './themes';

export interface CreateBioPageInput {
  slug: string;
  title: string;
  bio?: string;
  avatar?: string;
  theme?: BioPageTheme;
  socialLinks?: Record<string, string>;
}

export interface UpdateBioPageInput {
  title?: string;
  bio?: string;
  avatar?: string;
  theme?: BioPageTheme;
  customCss?: string;
  socialLinks?: Record<string, string>;
  isActive?: boolean;
}

export interface CreateBioLinkInput {
  title: string;
  url: string;
  icon?: string;
  thumbnail?: string;
  position?: number;
}

export interface UpdateBioLinkInput {
  title?: string;
  url?: string;
  icon?: string;
  thumbnail?: string;
  position?: number;
  isActive?: boolean;
}

/**
 * Validates a slug format (alphanumeric, hyphens, underscores).
 */
export function isValidSlug(slug: string): boolean {
  const slugRegex = /^[a-zA-Z0-9_-]{3,30}$/;
  return slugRegex.test(slug);
}

/**
 * Checks if a slug is available.
 */
export async function isSlugAvailable(slug: string): Promise<boolean> {
  const existing = await prisma.bioPage.findUnique({
    where: { slug },
    select: { id: true },
  });
  return !existing;
}

/**
 * Checks if user can create more bio pages based on their plan.
 */
export async function canCreateBioPage(
  userId: string,
  plan: Plan
): Promise<{ allowed: boolean; reason?: string }> {
  const limits = getPlanLimits(plan);

  if (limits.bioPages === -1) {
    return { allowed: true };
  }

  const count = await prisma.bioPage.count({
    where: { userId },
  });

  if (count >= limits.bioPages) {
    return {
      allowed: false,
      reason: `You have reached the limit of ${limits.bioPages} bio pages on your plan`,
    };
  }

  return { allowed: true };
}

/**
 * Checks if user can add more links to a bio page based on their plan.
 */
export function canAddBioLink(
  currentLinks: number,
  plan: Plan
): { allowed: boolean; reason?: string } {
  const limits = getPlanLimits(plan);

  if (limits.linksPerBioPage === -1) {
    return { allowed: true };
  }

  if (currentLinks >= limits.linksPerBioPage) {
    return {
      allowed: false,
      reason: `You have reached the limit of ${limits.linksPerBioPage} links per bio page on your plan`,
    };
  }

  return { allowed: true };
}

/**
 * Creates a new bio page.
 */
export async function createBioPage(userId: string, input: CreateBioPageInput) {
  const { slug, title, bio, avatar, theme, socialLinks } = input;

  // Validate slug
  if (!isValidSlug(slug)) {
    throw new Error('Invalid slug format. Use 3-30 alphanumeric characters, hyphens, or underscores.');
  }

  // Check slug availability
  const available = await isSlugAvailable(slug);
  if (!available) {
    throw new Error('This slug is already taken');
  }

  return prisma.bioPage.create({
    data: {
      userId,
      slug,
      title,
      bio,
      avatar,
      theme: theme || 'DEFAULT',
      socialLinks: socialLinks || {},
    },
    include: {
      links: {
        orderBy: { position: 'asc' },
      },
    },
  });
}

/**
 * Gets a bio page by slug.
 */
export async function getBioPageBySlug(slug: string) {
  return prisma.bioPage.findUnique({
    where: { slug },
    include: {
      links: {
        where: { isActive: true },
        orderBy: { position: 'asc' },
      },
      user: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
}

/**
 * Gets a bio page by ID.
 */
export async function getBioPage(id: string) {
  return prisma.bioPage.findUnique({
    where: { id },
    include: {
      links: {
        orderBy: { position: 'asc' },
      },
    },
  });
}

/**
 * Gets all bio pages for a user.
 */
export async function getUserBioPages(userId: string) {
  return prisma.bioPage.findMany({
    where: { userId },
    include: {
      links: {
        orderBy: { position: 'asc' },
      },
      _count: {
        select: { links: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Updates a bio page.
 */
export async function updateBioPage(id: string, input: UpdateBioPageInput) {
  return prisma.bioPage.update({
    where: { id },
    data: {
      title: input.title,
      bio: input.bio,
      avatar: input.avatar,
      theme: input.theme,
      customCss: input.customCss,
      socialLinks: input.socialLinks,
      isActive: input.isActive,
    },
    include: {
      links: {
        orderBy: { position: 'asc' },
      },
    },
  });
}

/**
 * Updates the slug for a bio page.
 */
export async function updateBioPageSlug(id: string, newSlug: string) {
  // Validate slug
  if (!isValidSlug(newSlug)) {
    throw new Error('Invalid slug format');
  }

  // Check availability
  const available = await isSlugAvailable(newSlug);
  if (!available) {
    throw new Error('This slug is already taken');
  }

  return prisma.bioPage.update({
    where: { id },
    data: { slug: newSlug },
  });
}

/**
 * Deletes a bio page.
 */
export async function deleteBioPage(id: string) {
  return prisma.bioPage.delete({
    where: { id },
  });
}

/**
 * Increments the view count for a bio page.
 */
export async function incrementBioPageViews(id: string) {
  return prisma.bioPage.update({
    where: { id },
    data: { views: { increment: 1 } },
  });
}

/**
 * Adds a link to a bio page.
 */
export async function addBioLink(bioPageId: string, input: CreateBioLinkInput) {
  // Get the highest position
  const lastLink = await prisma.bioLink.findFirst({
    where: { bioPageId },
    orderBy: { position: 'desc' },
    select: { position: true },
  });

  const position = input.position ?? (lastLink?.position ?? 0) + 1;

  return prisma.bioLink.create({
    data: {
      bioPageId,
      title: input.title,
      url: input.url,
      icon: input.icon,
      thumbnail: input.thumbnail,
      position,
    },
  });
}

/**
 * Updates a bio link.
 */
export async function updateBioLink(id: string, input: UpdateBioLinkInput) {
  return prisma.bioLink.update({
    where: { id },
    data: {
      title: input.title,
      url: input.url,
      icon: input.icon,
      thumbnail: input.thumbnail,
      position: input.position,
      isActive: input.isActive,
    },
  });
}

/**
 * Deletes a bio link.
 */
export async function deleteBioLink(id: string) {
  return prisma.bioLink.delete({
    where: { id },
  });
}

/**
 * Reorders bio links.
 */
export async function reorderBioLinks(
  bioPageId: string,
  linkIds: string[]
) {
  const updates = linkIds.map((id, index) =>
    prisma.bioLink.update({
      where: { id },
      data: { position: index },
    })
  );

  return prisma.$transaction(updates);
}

/**
 * Increments the click count for a bio link.
 */
export async function incrementBioLinkClicks(id: string) {
  return prisma.bioLink.update({
    where: { id },
    data: { clicks: { increment: 1 } },
  });
}

/**
 * Gets statistics for a bio page.
 */
export async function getBioPageStats(id: string) {
  const bioPage = await prisma.bioPage.findUnique({
    where: { id },
    include: {
      links: {
        select: {
          id: true,
          title: true,
          clicks: true,
        },
        orderBy: { clicks: 'desc' },
      },
    },
  });

  if (!bioPage) return null;

  const totalClicks = bioPage.links.reduce((sum, link) => sum + link.clicks, 0);

  return {
    views: bioPage.views,
    totalClicks,
    clickThroughRate: bioPage.views > 0 ? (totalClicks / bioPage.views) * 100 : 0,
    topLinks: bioPage.links.slice(0, 5),
  };
}
