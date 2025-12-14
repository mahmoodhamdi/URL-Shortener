/**
 * A/B Testing Module
 *
 * Provides A/B testing functionality for links including:
 * - Creating and managing tests
 * - Variant selection based on weights
 * - Click and conversion tracking
 * - Statistical analysis
 */

import { prisma } from '@/lib/db/prisma';
import { getPlanLimits } from '@/lib/stripe/plans';
import { Plan } from '@/types';
import {
  selectVariant,
  selectVariantDeterministic,
  createVisitorId,
  Variant,
} from './selector';
import { calculateTestStats, TestStats } from './stats';

export * from './selector';
export * from './stats';

export interface CreateABTestInput {
  linkId: string;
  name?: string;
  variants: {
    name: string;
    url: string;
    weight: number;
  }[];
}

export interface UpdateABTestInput {
  name?: string;
  isActive?: boolean;
}

export interface AddVariantInput {
  name: string;
  url: string;
  weight: number;
}

export interface UpdateVariantInput {
  name?: string;
  url?: string;
  weight?: number;
}

/**
 * Checks if user can create more A/B tests based on their plan.
 */
export async function canCreateABTest(
  userId: string,
  plan: Plan
): Promise<{ allowed: boolean; reason?: string }> {
  const limits = getPlanLimits(plan);

  if (limits.abTests === 0) {
    return {
      allowed: false,
      reason: 'A/B testing is not available on your plan',
    };
  }

  if (limits.abTests === -1) {
    return { allowed: true };
  }

  // Count existing A/B tests for the user
  const count = await prisma.aBTest.count({
    where: {
      link: {
        userId,
      },
    },
  });

  if (count >= limits.abTests) {
    return {
      allowed: false,
      reason: `You have reached the limit of ${limits.abTests} A/B tests on your plan`,
    };
  }

  return { allowed: true };
}

/**
 * Checks if user can add more variants to a test based on their plan.
 */
export function canAddVariant(
  currentVariants: number,
  plan: Plan
): { allowed: boolean; reason?: string } {
  const limits = getPlanLimits(plan);

  if (limits.variantsPerTest === -1) {
    return { allowed: true };
  }

  if (currentVariants >= limits.variantsPerTest) {
    return {
      allowed: false,
      reason: `You have reached the limit of ${limits.variantsPerTest} variants per test on your plan`,
    };
  }

  return { allowed: true };
}

/**
 * Creates a new A/B test for a link.
 */
export async function createABTest(input: CreateABTestInput) {
  const { linkId, name, variants } = input;

  // Validate we have at least 2 variants
  if (variants.length < 2) {
    throw new Error('A/B test requires at least 2 variants');
  }

  // Create test with variants in a transaction
  const test = await prisma.aBTest.create({
    data: {
      linkId,
      name,
      variants: {
        create: variants.map(v => ({
          name: v.name,
          url: v.url,
          weight: v.weight,
        })),
      },
    },
    include: {
      variants: true,
    },
  });

  return test;
}

/**
 * Gets an A/B test by ID.
 */
export async function getABTest(testId: string) {
  return prisma.aBTest.findUnique({
    where: { id: testId },
    include: {
      variants: {
        orderBy: { createdAt: 'asc' },
      },
      link: {
        select: {
          id: true,
          shortCode: true,
          originalUrl: true,
        },
      },
    },
  });
}

/**
 * Gets an A/B test by link ID.
 */
export async function getABTestByLinkId(linkId: string) {
  return prisma.aBTest.findUnique({
    where: { linkId },
    include: {
      variants: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });
}

/**
 * Updates an A/B test.
 */
export async function updateABTest(testId: string, input: UpdateABTestInput) {
  const updateData: { name?: string; isActive?: boolean; endedAt?: Date | null } = {};

  if (input.name !== undefined) {
    updateData.name = input.name;
  }

  if (input.isActive !== undefined) {
    updateData.isActive = input.isActive;
    // Set endedAt when deactivating
    if (!input.isActive) {
      updateData.endedAt = new Date();
    } else {
      updateData.endedAt = null;
    }
  }

  return prisma.aBTest.update({
    where: { id: testId },
    data: updateData,
    include: {
      variants: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });
}

/**
 * Deletes an A/B test.
 */
export async function deleteABTest(testId: string) {
  return prisma.aBTest.delete({
    where: { id: testId },
  });
}

/**
 * Adds a variant to an existing test.
 */
export async function addVariant(testId: string, input: AddVariantInput) {
  return prisma.aBVariant.create({
    data: {
      testId,
      name: input.name,
      url: input.url,
      weight: input.weight,
    },
  });
}

/**
 * Updates a variant.
 */
export async function updateVariant(variantId: string, input: UpdateVariantInput) {
  return prisma.aBVariant.update({
    where: { id: variantId },
    data: {
      name: input.name,
      url: input.url,
      weight: input.weight,
    },
  });
}

/**
 * Deletes a variant.
 */
export async function deleteVariant(variantId: string) {
  // Check if this is the last variant
  const variant = await prisma.aBVariant.findUnique({
    where: { id: variantId },
    include: {
      test: {
        include: {
          _count: {
            select: { variants: true },
          },
        },
      },
    },
  });

  if (!variant) {
    throw new Error('Variant not found');
  }

  if (variant.test._count.variants <= 2) {
    throw new Error('Cannot delete variant: A/B test must have at least 2 variants');
  }

  return prisma.aBVariant.delete({
    where: { id: variantId },
  });
}

/**
 * Selects a variant for a visitor and tracks the click.
 * Uses deterministic selection based on visitor identifier for consistency.
 */
export async function selectAndTrackVariant(
  linkId: string,
  ip: string | null,
  userAgent: string | null
): Promise<string | null> {
  // Get active A/B test for the link
  const test = await prisma.aBTest.findFirst({
    where: {
      linkId,
      isActive: true,
    },
    include: {
      variants: true,
    },
  });

  if (!test || test.variants.length === 0) {
    return null;
  }

  // Convert to Variant format
  const variants: Variant[] = test.variants.map(v => ({
    id: v.id,
    name: v.name,
    url: v.url,
    weight: v.weight,
  }));

  // Create visitor ID for deterministic selection
  const visitorId = createVisitorId(test.id, ip, userAgent);

  // Select variant deterministically
  const result = selectVariantDeterministic(variants, visitorId);

  if (!result) {
    return null;
  }

  // Track the click asynchronously (don't wait)
  prisma.aBVariant.update({
    where: { id: result.variant.id },
    data: { clicks: { increment: 1 } },
  }).catch(console.error);

  return result.variant.url;
}

/**
 * Selects a random variant for testing purposes.
 * Does not use deterministic selection.
 */
export function selectRandomVariant(
  variants: Variant[]
): Variant | null {
  const result = selectVariant(variants);
  return result?.variant || null;
}

/**
 * Tracks a conversion for a variant.
 */
export async function trackConversion(variantId: string) {
  return prisma.aBVariant.update({
    where: { id: variantId },
    data: { conversions: { increment: 1 } },
  });
}

/**
 * Gets statistics for an A/B test.
 */
export async function getTestStatistics(testId: string): Promise<TestStats | null> {
  const test = await prisma.aBTest.findUnique({
    where: { id: testId },
    include: {
      variants: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!test) {
    return null;
  }

  const variantInputs = test.variants.map(v => ({
    id: v.id,
    name: v.name,
    clicks: v.clicks,
    conversions: v.conversions,
  }));

  return calculateTestStats(variantInputs);
}

/**
 * Gets all A/B tests for a user.
 */
export async function getUserABTests(userId: string) {
  return prisma.aBTest.findMany({
    where: {
      link: {
        userId,
      },
    },
    include: {
      variants: {
        orderBy: { createdAt: 'asc' },
      },
      link: {
        select: {
          id: true,
          shortCode: true,
          originalUrl: true,
          title: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Resets statistics for a test (for starting fresh).
 */
export async function resetTestStatistics(testId: string) {
  return prisma.aBVariant.updateMany({
    where: { testId },
    data: {
      clicks: 0,
      conversions: 0,
    },
  });
}
