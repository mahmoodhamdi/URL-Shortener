import { prisma } from '@/lib/db/prisma';
import { PLANS, getPlanLimits } from '@/lib/stripe/plans';
import { Plan } from '@/types';

export interface LimitCheckResult {
  allowed: boolean;
  used: number;
  limit: number;
  remaining: number;
  plan: Plan;
  message?: string;
}

export async function checkLinkLimit(userId: string): Promise<LimitCheckResult> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (!subscription) {
    // No subscription means free tier
    const freeLimit = PLANS.FREE.limits.linksPerMonth;
    const linksThisMonth = await countLinksThisMonth(userId);

    return {
      allowed: linksThisMonth < freeLimit,
      used: linksThisMonth,
      limit: freeLimit,
      remaining: Math.max(0, freeLimit - linksThisMonth),
      plan: 'FREE',
      message: linksThisMonth >= freeLimit ? 'Link limit reached. Upgrade to create more links.' : undefined,
    };
  }

  const limits = getPlanLimits(subscription.plan);
  const limit = limits.linksPerMonth;

  // Unlimited links (-1 means unlimited)
  if (limit === -1) {
    return {
      allowed: true,
      used: subscription.linksUsedThisMonth,
      limit: -1,
      remaining: -1,
      plan: subscription.plan,
    };
  }

  return {
    allowed: subscription.linksUsedThisMonth < limit,
    used: subscription.linksUsedThisMonth,
    limit,
    remaining: Math.max(0, limit - subscription.linksUsedThisMonth),
    plan: subscription.plan,
    message: subscription.linksUsedThisMonth >= limit
      ? 'Link limit reached. Upgrade to create more links.'
      : undefined,
  };
}

export async function checkBulkLimit(userId: string, urlCount: number): Promise<LimitCheckResult> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  const plan = subscription?.plan || 'FREE';
  const limits = getPlanLimits(plan);
  const bulkLimit = limits.bulkShortenLimit;

  // Check bulk shorten limit per request
  if (bulkLimit !== -1 && urlCount > bulkLimit) {
    return {
      allowed: false,
      used: urlCount,
      limit: bulkLimit,
      remaining: 0,
      plan,
      message: `Bulk shorten limit is ${bulkLimit} URLs per request. Upgrade for higher limits.`,
    };
  }

  // Also check total link limit
  const linkCheck = await checkLinkLimit(userId);

  if (!linkCheck.allowed) {
    return linkCheck;
  }

  // Check if bulk would exceed limit
  if (linkCheck.limit !== -1 && linkCheck.used + urlCount > linkCheck.limit) {
    return {
      allowed: false,
      used: linkCheck.used,
      limit: linkCheck.limit,
      remaining: linkCheck.remaining,
      plan,
      message: `Creating ${urlCount} links would exceed your monthly limit. You have ${linkCheck.remaining} links remaining.`,
    };
  }

  return {
    allowed: true,
    used: linkCheck.used,
    limit: linkCheck.limit,
    remaining: linkCheck.remaining,
    plan,
  };
}

export async function checkClickTrackingLimit(userId: string): Promise<LimitCheckResult> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  const plan = subscription?.plan || 'FREE';
  const limits = getPlanLimits(plan);
  const clickLimit = limits.clicksTracked;

  // Unlimited tracking
  if (clickLimit === -1) {
    return {
      allowed: true,
      used: 0,
      limit: -1,
      remaining: -1,
      plan,
    };
  }

  // Count total clicks this month for user's links
  const startOfMonth = getStartOfMonthUTC();

  const clicksCount = await prisma.click.count({
    where: {
      link: {
        userId,
      },
      clickedAt: {
        gte: startOfMonth,
      },
    },
  });

  return {
    allowed: clicksCount < clickLimit,
    used: clicksCount,
    limit: clickLimit,
    remaining: Math.max(0, clickLimit - clicksCount),
    plan,
    message: clicksCount >= clickLimit
      ? 'Click tracking limit reached. Analytics may be incomplete.'
      : undefined,
  };
}

export async function checkCustomDomainLimit(userId: string): Promise<LimitCheckResult> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  const plan = subscription?.plan || 'FREE';
  const limits = getPlanLimits(plan);
  const domainLimit = limits.customDomains;

  // Count existing domains
  const domainCount = await prisma.customDomain.count({
    where: { userId },
  });

  // No custom domains allowed for free
  if (domainLimit === 0) {
    return {
      allowed: false,
      used: domainCount,
      limit: 0,
      remaining: 0,
      plan,
      message: 'Custom domains are not available on the Free plan. Upgrade to add custom domains.',
    };
  }

  // Unlimited domains
  if (domainLimit === -1) {
    return {
      allowed: true,
      used: domainCount,
      limit: -1,
      remaining: -1,
      plan,
    };
  }

  return {
    allowed: domainCount < domainLimit,
    used: domainCount,
    limit: domainLimit,
    remaining: Math.max(0, domainLimit - domainCount),
    plan,
    message: domainCount >= domainLimit
      ? 'Custom domain limit reached. Upgrade to add more domains.'
      : undefined,
  };
}

// Alias for backward compatibility
export const checkDomainLimit = checkCustomDomainLimit;

export async function checkApiRateLimit(userId: string): Promise<LimitCheckResult> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  const plan = subscription?.plan || 'FREE';
  const limits = getPlanLimits(plan);
  const apiLimit = limits.apiRequestsPerDay;

  // Unlimited API requests
  if (apiLimit === -1) {
    return {
      allowed: true,
      used: 0,
      limit: -1,
      remaining: -1,
      plan,
    };
  }

  // API rate limiting is handled separately in the rate-limit module
  return {
    allowed: true,
    used: 0,
    limit: apiLimit,
    remaining: apiLimit,
    plan,
  };
}

/**
 * Get start of current month in UTC
 */
function getStartOfMonthUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
}

async function countLinksThisMonth(userId: string): Promise<number> {
  const startOfMonth = getStartOfMonthUTC();

  return await prisma.link.count({
    where: {
      userId,
      createdAt: {
        gte: startOfMonth,
      },
    },
  });
}

export async function getUsageSummary(userId: string) {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  const plan = subscription?.plan || 'FREE';
  const limits = getPlanLimits(plan);

  // Get current usage (using UTC for consistency)
  const startOfMonth = getStartOfMonthUTC();

  const [linksThisMonth, totalClicks, domainCount] = await Promise.all([
    prisma.link.count({
      where: {
        userId,
        createdAt: { gte: startOfMonth },
      },
    }),
    prisma.click.count({
      where: {
        link: { userId },
        clickedAt: { gte: startOfMonth },
      },
    }),
    prisma.customDomain.count({
      where: { userId },
    }),
  ]);

  return {
    plan,
    links: {
      used: subscription?.linksUsedThisMonth ?? linksThisMonth,
      limit: limits.linksPerMonth,
      percentage: limits.linksPerMonth === -1 ? 0 : Math.round((linksThisMonth / limits.linksPerMonth) * 100),
    },
    clicks: {
      used: totalClicks,
      limit: limits.clicksTracked,
      percentage: limits.clicksTracked === -1 ? 0 : Math.round((totalClicks / limits.clicksTracked) * 100),
    },
    customDomains: {
      used: domainCount,
      limit: limits.customDomains,
      percentage: limits.customDomains === -1 || limits.customDomains === 0 ? 0 : Math.round((domainCount / limits.customDomains) * 100),
    },
    apiRequests: {
      limit: limits.apiRequestsPerDay,
    },
    analyticsRetention: {
      days: limits.analyticsRetentionDays,
    },
  };
}
