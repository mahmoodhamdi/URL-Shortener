import { Plan } from '@/types';

export interface PlanConfig {
  name: string;
  description: string;
  price: number; // monthly price in USD
  yearlyPrice: number; // yearly price in USD (discounted)
  stripePriceIdMonthly?: string;
  stripePriceIdYearly?: string;
  limits: {
    linksPerMonth: number;
    clicksTracked: number;
    customDomains: number;
    teamMembers: number;
    apiRequestsPerDay: number;
    analyticsRetentionDays: number;
    bulkShortenLimit: number;
    abTests: number;
    variantsPerTest: number;
    bioPages: number;
    linksPerBioPage: number;
    retargetingPixels: number;
    linksWithPixels: number;
    zapierSubscriptions: number;
    zapierEventsPerDay: number;
  };
  features: string[];
  popular?: boolean;
}

export const PLANS: Record<Plan, PlanConfig> = {
  FREE: {
    name: 'Free',
    description: 'Perfect for personal use',
    price: 0,
    yearlyPrice: 0,
    limits: {
      linksPerMonth: 100,
      clicksTracked: 10000,
      customDomains: 0,
      teamMembers: 1,
      apiRequestsPerDay: 100,
      analyticsRetentionDays: 30,
      bulkShortenLimit: 10,
      abTests: 0,
      variantsPerTest: 0,
      bioPages: 1,
      linksPerBioPage: 5,
      retargetingPixels: 0,
      linksWithPixels: 0,
      zapierSubscriptions: 0,
      zapierEventsPerDay: 0,
    },
    features: [
      'Basic Analytics',
      'QR Codes',
      'Custom Alias',
      'Password Protection',
      'Link Expiration',
      '30-day Analytics History',
    ],
  },
  STARTER: {
    name: 'Starter',
    description: 'Great for small businesses',
    price: 5,
    yearlyPrice: 48, // $4/month billed yearly
    stripePriceIdMonthly: process.env.STRIPE_STARTER_MONTHLY_PRICE_ID,
    stripePriceIdYearly: process.env.STRIPE_STARTER_YEARLY_PRICE_ID,
    limits: {
      linksPerMonth: 1000,
      clicksTracked: 50000,
      customDomains: 1,
      teamMembers: 1,
      apiRequestsPerDay: 1000,
      analyticsRetentionDays: 90,
      bulkShortenLimit: 50,
      abTests: 1,
      variantsPerTest: 2,
      bioPages: 2,
      linksPerBioPage: 10,
      retargetingPixels: 1,
      linksWithPixels: 10,
      zapierSubscriptions: 2,
      zapierEventsPerDay: 100,
    },
    features: [
      'Everything in Free',
      'Advanced Analytics',
      'API Access',
      'No Branding',
      '1 Custom Domain',
      '90-day Analytics History',
      'UTM Builder',
      'Tags & Folders',
      '1 Retargeting Pixel',
      '2 Zapier Integrations',
    ],
  },
  PRO: {
    name: 'Pro',
    description: 'For growing teams',
    price: 12,
    yearlyPrice: 120, // $10/month billed yearly
    stripePriceIdMonthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
    stripePriceIdYearly: process.env.STRIPE_PRO_YEARLY_PRICE_ID,
    popular: true,
    limits: {
      linksPerMonth: 5000,
      clicksTracked: 250000,
      customDomains: 3,
      teamMembers: 5,
      apiRequestsPerDay: 5000,
      analyticsRetentionDays: 180,
      bulkShortenLimit: 100,
      abTests: 5,
      variantsPerTest: 4,
      bioPages: 5,
      linksPerBioPage: 20,
      retargetingPixels: 5,
      linksWithPixels: 50,
      zapierSubscriptions: 10,
      zapierEventsPerDay: 1000,
    },
    features: [
      'Everything in Starter',
      '3 Custom Domains',
      '5 Team Members',
      'Device Targeting',
      'Geo Targeting',
      '180-day Analytics History',
      'Priority Support',
      'Webhooks',
      '5 Retargeting Pixels',
      '10 Zapier Integrations',
    ],
  },
  BUSINESS: {
    name: 'Business',
    description: 'For larger organizations',
    price: 25,
    yearlyPrice: 240, // $20/month billed yearly
    stripePriceIdMonthly: process.env.STRIPE_BUSINESS_MONTHLY_PRICE_ID,
    stripePriceIdYearly: process.env.STRIPE_BUSINESS_YEARLY_PRICE_ID,
    limits: {
      linksPerMonth: 25000,
      clicksTracked: 1000000,
      customDomains: 10,
      teamMembers: 20,
      apiRequestsPerDay: 25000,
      analyticsRetentionDays: 365,
      bulkShortenLimit: 500,
      abTests: 20,
      variantsPerTest: 6,
      bioPages: 20,
      linksPerBioPage: -1, // unlimited
      retargetingPixels: 20,
      linksWithPixels: -1, // unlimited
      zapierSubscriptions: 50,
      zapierEventsPerDay: 10000,
    },
    features: [
      'Everything in Pro',
      '10 Custom Domains',
      '20 Team Members',
      'A/B Testing',
      '1-year Analytics History',
      'Custom Branding',
      'SSO (SAML)',
      'Dedicated Support',
      '20 Retargeting Pixels',
      '50 Zapier Integrations',
    ],
  },
  ENTERPRISE: {
    name: 'Enterprise',
    description: 'Custom solutions for large enterprises',
    price: 50,
    yearlyPrice: 480, // $40/month billed yearly
    stripePriceIdMonthly: process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID,
    stripePriceIdYearly: process.env.STRIPE_ENTERPRISE_YEARLY_PRICE_ID,
    limits: {
      linksPerMonth: -1, // unlimited
      clicksTracked: -1, // unlimited
      customDomains: -1, // unlimited
      teamMembers: -1, // unlimited
      apiRequestsPerDay: -1, // unlimited
      analyticsRetentionDays: -1, // unlimited
      bulkShortenLimit: -1, // unlimited
      abTests: -1, // unlimited
      variantsPerTest: -1, // unlimited
      bioPages: -1, // unlimited
      linksPerBioPage: -1, // unlimited
      retargetingPixels: -1, // unlimited
      linksWithPixels: -1, // unlimited
      zapierSubscriptions: -1, // unlimited
      zapierEventsPerDay: -1, // unlimited
    },
    features: [
      'Everything in Business',
      'Unlimited Links',
      'Unlimited Team Members',
      'Unlimited Custom Domains',
      'Unlimited Analytics History',
      'Custom Integrations',
      'SLA',
      'Dedicated Account Manager',
      'Unlimited Retargeting Pixels',
      'Unlimited Zapier Integrations',
    ],
  },
};

export function getPlanByPriceId(priceId: string): Plan | null {
  for (const [plan, config] of Object.entries(PLANS)) {
    if (
      config.stripePriceIdMonthly === priceId ||
      config.stripePriceIdYearly === priceId
    ) {
      return plan as Plan;
    }
  }
  return null;
}

export function getPlanLimits(plan: Plan) {
  return PLANS[plan].limits;
}

export function getPlanFeatures(plan: Plan) {
  return PLANS[plan].features;
}

export function isFeatureAvailable(plan: Plan, feature: string): boolean {
  // Feature hierarchy: Enterprise > Business > Pro > Starter > Free
  const planOrder: Plan[] = ['FREE', 'STARTER', 'PRO', 'BUSINESS', 'ENTERPRISE'];
  const planIndex = planOrder.indexOf(plan);

  for (let i = 0; i <= planIndex; i++) {
    if (PLANS[planOrder[i]].features.includes(feature)) {
      return true;
    }
  }

  return false;
}

export function formatPrice(price: number, yearly = false): string {
  if (price === 0) return 'Free';
  if (yearly) {
    return `$${Math.round(price / 12)}/mo`;
  }
  return `$${price}/mo`;
}
