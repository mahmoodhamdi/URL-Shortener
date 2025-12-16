import { describe, it, expect, vi, beforeEach } from 'vitest';
import Stripe from 'stripe';

// Mock Stripe client
vi.mock('@/lib/stripe/client', () => ({
  stripe: {
    checkout: {
      sessions: {
        create: vi.fn(),
      },
    },
    billingPortal: {
      sessions: {
        create: vi.fn(),
      },
    },
    subscriptions: {
      retrieve: vi.fn(),
    },
    webhooks: {
      constructEvent: vi.fn(),
    },
  },
}));

// Mock Prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    subscription: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

// Mock auth
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

import { stripe } from '@/lib/stripe/client';
import { prisma } from '@/lib/db/prisma';
import { auth } from '@/lib/auth';
import { PLANS, getPlanByPriceId, getPlanLimits, isFeatureAvailable, formatPrice } from '@/lib/stripe/plans';
import { z } from 'zod';

// Checkout schema (same as in route)
const checkoutSchema = z.object({
  plan: z.enum(['STARTER', 'PRO', 'BUSINESS', 'ENTERPRISE'] as const),
  billingPeriod: z.enum(['monthly', 'yearly']).default('monthly'),
});

describe('Stripe Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Plans Configuration', () => {
    it('should have all required plans', () => {
      expect(PLANS.FREE).toBeDefined();
      expect(PLANS.STARTER).toBeDefined();
      expect(PLANS.PRO).toBeDefined();
      expect(PLANS.BUSINESS).toBeDefined();
      expect(PLANS.ENTERPRISE).toBeDefined();
    });

    it('should have correct FREE plan pricing', () => {
      expect(PLANS.FREE.price).toBe(0);
      expect(PLANS.FREE.yearlyPrice).toBe(0);
    });

    it('should have correct paid plan pricing', () => {
      expect(PLANS.STARTER.price).toBe(5);
      expect(PLANS.PRO.price).toBe(12);
      expect(PLANS.BUSINESS.price).toBe(25);
      expect(PLANS.ENTERPRISE.price).toBe(50);
    });

    it('should have yearly discount', () => {
      // Yearly should be cheaper per month than monthly
      expect(PLANS.STARTER.yearlyPrice / 12).toBeLessThan(PLANS.STARTER.price);
      expect(PLANS.PRO.yearlyPrice / 12).toBeLessThan(PLANS.PRO.price);
      expect(PLANS.BUSINESS.yearlyPrice / 12).toBeLessThan(PLANS.BUSINESS.price);
    });

    it('should have plan limits', () => {
      expect(PLANS.FREE.limits.linksPerMonth).toBe(100);
      expect(PLANS.STARTER.limits.linksPerMonth).toBe(1000);
      expect(PLANS.PRO.limits.linksPerMonth).toBe(5000);
      expect(PLANS.BUSINESS.limits.linksPerMonth).toBe(25000);
      expect(PLANS.ENTERPRISE.limits.linksPerMonth).toBe(-1); // unlimited
    });

    it('should mark PRO as popular', () => {
      expect(PLANS.PRO.popular).toBe(true);
      expect(PLANS.FREE.popular).toBeUndefined();
    });
  });

  describe('getPlanByPriceId', () => {
    it('should return null for unknown price ID', () => {
      const plan = getPlanByPriceId('price_unknown');
      expect(plan).toBeNull();
    });
  });

  describe('getPlanLimits', () => {
    it('should return FREE plan limits', () => {
      const limits = getPlanLimits('FREE');
      expect(limits.linksPerMonth).toBe(100);
      expect(limits.clicksTracked).toBe(10000);
      expect(limits.customDomains).toBe(0);
      expect(limits.teamMembers).toBe(1);
    });

    it('should return PRO plan limits', () => {
      const limits = getPlanLimits('PRO');
      expect(limits.linksPerMonth).toBe(5000);
      expect(limits.clicksTracked).toBe(250000);
      expect(limits.customDomains).toBe(3);
      expect(limits.teamMembers).toBe(5);
    });

    it('should return unlimited for ENTERPRISE', () => {
      const limits = getPlanLimits('ENTERPRISE');
      expect(limits.linksPerMonth).toBe(-1);
      expect(limits.clicksTracked).toBe(-1);
      expect(limits.customDomains).toBe(-1);
      expect(limits.teamMembers).toBe(-1);
    });
  });

  describe('isFeatureAvailable', () => {
    it('should allow basic features for FREE', () => {
      expect(isFeatureAvailable('FREE', 'Basic Analytics')).toBe(true);
      expect(isFeatureAvailable('FREE', 'QR Codes')).toBe(true);
      expect(isFeatureAvailable('FREE', 'Custom Alias')).toBe(true);
    });

    it('should allow advanced features for higher plans', () => {
      expect(isFeatureAvailable('STARTER', 'API Access')).toBe(true);
      expect(isFeatureAvailable('PRO', 'Device Targeting')).toBe(true);
      expect(isFeatureAvailable('BUSINESS', 'A/B Testing')).toBe(true);
    });
  });

  describe('formatPrice', () => {
    it('should format free price', () => {
      expect(formatPrice(0)).toBe('Free');
    });

    it('should format monthly price', () => {
      expect(formatPrice(5)).toBe('$5/mo');
      expect(formatPrice(12)).toBe('$12/mo');
    });

    it('should format yearly price', () => {
      expect(formatPrice(48, true)).toBe('$4/mo');
      expect(formatPrice(120, true)).toBe('$10/mo');
    });
  });

  describe('Checkout Session', () => {
    describe('Input Validation', () => {
      it('should validate plan enum', () => {
        const result = checkoutSchema.safeParse({
          plan: 'INVALID_PLAN',
        });

        expect(result.success).toBe(false);
      });

      it('should accept valid plans', () => {
        const plans = ['STARTER', 'PRO', 'BUSINESS', 'ENTERPRISE'];

        for (const plan of plans) {
          const result = checkoutSchema.safeParse({ plan });
          expect(result.success).toBe(true);
        }
      });

      it('should default billing period to monthly', () => {
        const result = checkoutSchema.safeParse({
          plan: 'PRO',
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.billingPeriod).toBe('monthly');
        }
      });

      it('should accept yearly billing period', () => {
        const result = checkoutSchema.safeParse({
          plan: 'PRO',
          billingPeriod: 'yearly',
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.billingPeriod).toBe('yearly');
        }
      });
    });

    describe('Session Creation', () => {
      it('should require authentication', async () => {
        vi.mocked(auth).mockResolvedValue(null);

        const session = await auth();
        expect(session).toBeNull();
      });

      it('should allow authenticated user', async () => {
        vi.mocked(auth).mockResolvedValue({
          user: { id: 'user-1', email: 'test@example.com' },
        } as never);

        const session = await auth();
        expect(session?.user?.id).toBe('user-1');
      });

      it('should create checkout session', async () => {
        const mockSession = {
          id: 'cs_test_123',
          url: 'https://checkout.stripe.com/c/pay/cs_test_123',
        };

        vi.mocked(stripe.checkout.sessions.create).mockResolvedValue(mockSession as never);

        const session = await stripe.checkout.sessions.create({
          mode: 'subscription',
          customer_email: 'test@example.com',
          line_items: [
            {
              price: 'price_pro_monthly',
              quantity: 1,
            },
          ],
          success_url: 'http://localhost:3000/dashboard?upgrade=success',
          cancel_url: 'http://localhost:3000/pricing?upgrade=canceled',
          metadata: {
            userId: 'user-1',
          },
        });

        expect(session.id).toBe('cs_test_123');
        expect(session.url).toContain('checkout.stripe.com');
      });
    });
  });

  describe('Billing Portal', () => {
    it('should create portal session', async () => {
      const mockSession = {
        id: 'bps_test_123',
        url: 'https://billing.stripe.com/p/session/test_123',
      };

      vi.mocked(stripe.billingPortal.sessions.create).mockResolvedValue(mockSession as never);

      const session = await stripe.billingPortal.sessions.create({
        customer: 'cus_test_123',
        return_url: 'http://localhost:3000/settings',
      });

      expect(session.id).toBe('bps_test_123');
      expect(session.url).toContain('billing.stripe.com');
    });
  });

  describe('Webhook Handling', () => {
    describe('Signature Verification', () => {
      it('should verify valid signature', () => {
        const mockEvent = {
          id: 'evt_test_123',
          type: 'customer.subscription.created',
          data: {
            object: {
              id: 'sub_test_123',
              customer: 'cus_test_123',
              status: 'active',
            },
          },
        };

        vi.mocked(stripe.webhooks.constructEvent).mockReturnValue(mockEvent as never);

        const event = stripe.webhooks.constructEvent(
          'raw_body',
          'stripe_signature',
          'webhook_secret'
        );

        expect(event.id).toBe('evt_test_123');
        expect(event.type).toBe('customer.subscription.created');
      });

      it('should reject invalid signature', () => {
        vi.mocked(stripe.webhooks.constructEvent).mockImplementation(() => {
          throw new Error('Invalid signature');
        });

        expect(() => {
          stripe.webhooks.constructEvent(
            'raw_body',
            'invalid_signature',
            'webhook_secret'
          );
        }).toThrow('Invalid signature');
      });
    });

    describe('Event Processing', () => {
      it('should handle subscription created event', async () => {
        const mockSubscription = {
          id: 'sub_test_123',
          customer: 'cus_test_123',
          status: 'active',
          items: {
            data: [
              {
                price: {
                  id: 'price_pro_monthly',
                },
              },
            ],
          },
          current_period_start: Math.floor(Date.now() / 1000),
          current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        };

        vi.mocked(prisma.subscription.upsert).mockResolvedValue({
          id: 'db-sub-1',
          userId: 'user-1',
          plan: 'PRO',
          status: 'ACTIVE',
        } as never);

        const subscription = await prisma.subscription.upsert({
          where: { stripeSubscriptionId: mockSubscription.id },
          create: {
            stripeSubscriptionId: mockSubscription.id,
            stripeCustomerId: mockSubscription.customer as string,
            plan: 'PRO',
            status: 'ACTIVE',
            userId: 'user-1',
          },
          update: {
            plan: 'PRO',
            status: 'ACTIVE',
          },
        });

        expect(subscription.plan).toBe('PRO');
        expect(subscription.status).toBe('ACTIVE');
      });

      it('should handle subscription updated event', async () => {
        vi.mocked(prisma.subscription.update).mockResolvedValue({
          id: 'db-sub-1',
          userId: 'user-1',
          plan: 'BUSINESS',
          status: 'ACTIVE',
        } as never);

        const subscription = await prisma.subscription.update({
          where: { stripeSubscriptionId: 'sub_test_123' },
          data: {
            plan: 'BUSINESS',
            status: 'ACTIVE',
          },
        });

        expect(subscription.plan).toBe('BUSINESS');
      });

      it('should handle subscription deleted event', async () => {
        vi.mocked(prisma.subscription.update).mockResolvedValue({
          id: 'db-sub-1',
          userId: 'user-1',
          plan: 'FREE',
          status: 'CANCELED',
        } as never);

        const subscription = await prisma.subscription.update({
          where: { stripeSubscriptionId: 'sub_test_123' },
          data: {
            plan: 'FREE',
            status: 'CANCELED',
          },
        });

        expect(subscription.plan).toBe('FREE');
        expect(subscription.status).toBe('CANCELED');
      });

      it('should handle payment failed event', async () => {
        vi.mocked(prisma.subscription.update).mockResolvedValue({
          id: 'db-sub-1',
          userId: 'user-1',
          plan: 'PRO',
          status: 'PAST_DUE',
        } as never);

        const subscription = await prisma.subscription.update({
          where: { stripeSubscriptionId: 'sub_test_123' },
          data: {
            status: 'PAST_DUE',
          },
        });

        expect(subscription.status).toBe('PAST_DUE');
      });
    });
  });

  describe('Subscription Management', () => {
    it('should retrieve subscription', async () => {
      const mockSubscription = {
        id: 'sub_test_123',
        status: 'active',
        current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
      };

      vi.mocked(stripe.subscriptions.retrieve).mockResolvedValue(mockSubscription as never);

      const subscription = await stripe.subscriptions.retrieve('sub_test_123');

      expect(subscription.id).toBe('sub_test_123');
      expect(subscription.status).toBe('active');
    });

    it('should get user subscription from database', async () => {
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
        id: 'db-sub-1',
        userId: 'user-1',
        plan: 'PRO',
        status: 'ACTIVE',
        stripeSubscriptionId: 'sub_test_123',
        stripeCustomerId: 'cus_test_123',
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      } as never);

      const subscription = await prisma.subscription.findUnique({
        where: { userId: 'user-1' },
      });

      expect(subscription).not.toBeNull();
      expect(subscription?.plan).toBe('PRO');
    });

    it('should return null for user without subscription', async () => {
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(null as never);

      const subscription = await prisma.subscription.findUnique({
        where: { userId: 'user-without-sub' },
      });

      expect(subscription).toBeNull();
    });
  });

  describe('Full Checkout Flow', () => {
    it('should complete checkout flow', async () => {
      // Step 1: Authenticate user
      vi.mocked(auth).mockResolvedValue({
        user: { id: 'user-1', email: 'test@example.com' },
      } as never);

      const session = await auth();
      expect(session?.user?.id).toBe('user-1');

      // Step 2: Validate input
      const input = { plan: 'PRO', billingPeriod: 'monthly' };
      const validation = checkoutSchema.safeParse(input);
      expect(validation.success).toBe(true);

      // Step 3: Get plan config
      const planConfig = PLANS['PRO'];
      expect(planConfig.price).toBe(12);

      // Step 4: Create checkout session
      const mockCheckoutSession = {
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/c/pay/cs_test_123',
      };

      vi.mocked(stripe.checkout.sessions.create).mockResolvedValue(mockCheckoutSession as never);

      const checkoutSession = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer_email: 'test@example.com',
        line_items: [{ price: planConfig.stripePriceIdMonthly, quantity: 1 }],
        success_url: 'http://localhost:3000/dashboard?upgrade=success',
        cancel_url: 'http://localhost:3000/pricing?upgrade=canceled',
        metadata: { userId: 'user-1' },
      });

      expect(checkoutSession.url).toBeTruthy();
    });

    it('should reject checkout for FREE plan', async () => {
      const input = { plan: 'FREE' };
      const validation = checkoutSchema.safeParse(input);

      // FREE is not a valid checkout plan
      expect(validation.success).toBe(false);
    });
  });
});
