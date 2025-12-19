/**
 * Stripe Payment Gateway Implementation
 *
 * This module implements the PaymentGateway interface for Stripe.
 * It wraps the existing Stripe implementation.
 */

import Stripe from 'stripe';
import { prisma } from '@/lib/db/prisma';
import { getPlanByPriceId, PLANS } from '@/lib/stripe/plans';
import type { Plan } from '@/types';
import type {
  PaymentGateway,
  CheckoutParams,
  CheckoutResult,
  SubscriptionParams,
  SubscriptionResult,
  CustomerParams,
  RefundParams,
  RefundResult,
  WebhookEvent,
  WebhookVerification,
} from '../../types';

let stripeInstance: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripeInstance) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    stripeInstance = new Stripe(secretKey, {
      apiVersion: '2025-11-17.clover',
      typescript: true,
    });
  }
  return stripeInstance;
}

export class StripeGateway implements PaymentGateway {
  readonly provider = 'stripe';

  isConfigured(): boolean {
    return !!(
      process.env.STRIPE_SECRET_KEY &&
      process.env.STRIPE_WEBHOOK_SECRET &&
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    );
  }

  async createCheckoutSession(params: CheckoutParams): Promise<CheckoutResult> {
    const stripe = getStripe();

    // Get customer ID or create new customer
    const customerId = await this.getOrCreateCustomer(params.userId, params.email);

    // Get price ID from plan
    const plan = params.planId.toUpperCase() as Plan;
    const planConfig = PLANS[plan];

    if (!planConfig) {
      throw new Error(`Invalid plan: ${params.planId}`);
    }

    const priceId =
      params.billingCycle === 'yearly'
        ? planConfig.stripePriceIdYearly
        : planConfig.stripePriceIdMonthly;

    if (!priceId) {
      throw new Error(`Price not configured for ${params.planId} (${params.billingCycle})`);
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      subscription_data: {
        metadata: {
          userId: params.userId,
          ...params.metadata,
        },
      },
      metadata: {
        userId: params.userId,
        ...params.metadata,
      },
      locale: params.locale === 'ar' ? 'ar' : 'en',
    });

    return {
      sessionId: session.id,
      checkoutUrl: session.url || '',
      provider: this.provider,
      expiresAt: session.expires_at ? new Date(session.expires_at * 1000) : undefined,
    };
  }

  async createSubscription(params: SubscriptionParams): Promise<SubscriptionResult> {
    const stripe = getStripe();

    // Get or create customer
    const customerId = await this.getOrCreateCustomer(params.userId, params.email);

    // Get price ID from plan
    const plan = params.planId.toUpperCase() as Plan;
    const planConfig = PLANS[plan];

    if (!planConfig) {
      throw new Error(`Invalid plan: ${params.planId}`);
    }

    const priceId =
      params.billingCycle === 'yearly'
        ? planConfig.stripePriceIdYearly
        : planConfig.stripePriceIdMonthly;

    if (!priceId) {
      throw new Error(`Price not configured for ${params.planId} (${params.billingCycle})`);
    }

    const subscriptionParams: Stripe.SubscriptionCreateParams = {
      customer: customerId,
      items: [{ price: priceId }],
      metadata: {
        userId: params.userId,
        ...params.metadata,
      },
    };

    if (params.paymentMethodId) {
      subscriptionParams.default_payment_method = params.paymentMethodId;
    }

    if (params.trialDays) {
      subscriptionParams.trial_period_days = params.trialDays;
    }

    const subscription = await stripe.subscriptions.create(subscriptionParams);

    // Extract period dates
    const subData = subscription as unknown as {
      current_period_start?: number;
      current_period_end?: number;
      cancel_at_period_end?: boolean;
    };

    return {
      subscriptionId: subscription.id,
      customerId,
      status: subscription.status,
      currentPeriodStart: subData.current_period_start
        ? new Date(subData.current_period_start * 1000)
        : new Date(),
      currentPeriodEnd: subData.current_period_end
        ? new Date(subData.current_period_end * 1000)
        : new Date(),
      cancelAtPeriodEnd: subData.cancel_at_period_end || false,
    };
  }

  async getSubscription(subscriptionId: string): Promise<SubscriptionResult | null> {
    const stripe = getStripe();

    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);

      const subData = subscription as unknown as {
        current_period_start?: number;
        current_period_end?: number;
        cancel_at_period_end?: boolean;
      };

      return {
        subscriptionId: subscription.id,
        customerId:
          typeof subscription.customer === 'string'
            ? subscription.customer
            : subscription.customer.id,
        status: subscription.status,
        currentPeriodStart: subData.current_period_start
          ? new Date(subData.current_period_start * 1000)
          : new Date(),
        currentPeriodEnd: subData.current_period_end
          ? new Date(subData.current_period_end * 1000)
          : new Date(),
        cancelAtPeriodEnd: subData.cancel_at_period_end || false,
      };
    } catch {
      return null;
    }
  }

  async cancelSubscription(subscriptionId: string, immediate = false): Promise<void> {
    const stripe = getStripe();

    if (immediate) {
      await stripe.subscriptions.cancel(subscriptionId);
    } else {
      await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
    }
  }

  async resumeSubscription(subscriptionId: string): Promise<void> {
    const stripe = getStripe();

    await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    });
  }

  async createCustomer(params: CustomerParams): Promise<string> {
    return this.getOrCreateCustomer(params.userId, params.email, params.name);
  }

  async createRefund(params: RefundParams): Promise<RefundResult> {
    const stripe = getStripe();

    // Get the payment intent from our database or Stripe
    const payment = await prisma.payment.findFirst({
      where: { providerPaymentId: params.paymentId },
    });

    if (!payment) {
      throw new Error('Payment not found');
    }

    const refundParams: Stripe.RefundCreateParams = {
      payment_intent: params.paymentId,
    };

    if (params.amount) {
      refundParams.amount = params.amount;
    }

    if (params.reason) {
      refundParams.reason = params.reason as Stripe.RefundCreateParams.Reason;
    }

    const refund = await stripe.refunds.create(refundParams);

    // Update payment record
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: params.amount && params.amount < payment.amount ? 'COMPLETED' : 'REFUNDED',
        refundedAt: new Date(),
      },
    });

    return {
      refundId: refund.id,
      status: refund.status || 'succeeded',
      amount: refund.amount,
      currency: refund.currency,
    };
  }

  verifyWebhook(payload: string, signature: string): WebhookVerification {
    const stripe = getStripe();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      return { valid: false, error: 'Webhook secret not configured' };
    }

    try {
      const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);

      return {
        valid: true,
        event: {
          id: event.id,
          type: event.type,
          provider: this.provider,
          data: event.data.object as Record<string, unknown>,
          timestamp: new Date(event.created * 1000),
        },
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Invalid webhook signature',
      };
    }
  }

  async handleWebhook(event: WebhookEvent): Promise<void> {
    switch (event.type) {
      case 'customer.subscription.created':
        await this.handleSubscriptionCreated(event.data as Stripe.Subscription);
        break;

      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await this.handlePaymentSucceeded(event.data);
        break;

      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event.data);
        break;

      case 'checkout.session.completed':
        // Handled via subscription events
        break;

      default:
        console.log(`[Stripe] Unhandled event type: ${event.type}`);
    }
  }

  // Private helper methods

  private async getOrCreateCustomer(
    userId: string,
    email: string,
    name?: string
  ): Promise<string> {
    const stripe = getStripe();

    // Check if customer already exists
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
    });

    if (subscription?.stripeCustomerId) {
      return subscription.stripeCustomerId;
    }

    // Create new customer
    const customer = await stripe.customers.create({
      email,
      name: name || undefined,
      metadata: { userId },
    });

    // Save customer ID
    await prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        stripeCustomerId: customer.id,
        plan: 'FREE',
        status: 'ACTIVE',
        paymentProvider: 'STRIPE',
      },
      update: {
        stripeCustomerId: customer.id,
        paymentProvider: 'STRIPE',
      },
    });

    return customer.id;
  }

  private async handleSubscriptionCreated(subscription: Stripe.Subscription): Promise<void> {
    const priceId = subscription.items.data[0]?.price.id;
    const plan = getPlanByPriceId(priceId) || 'FREE';
    const userId = subscription.metadata?.userId;
    const customerId =
      typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer.id;

    const subData = subscription as unknown as {
      current_period_start?: number;
      current_period_end?: number;
      cancel_at_period_end?: boolean;
    };

    const whereClause = userId ? { userId } : { stripeCustomerId: customerId };

    await prisma.subscription.update({
      where: whereClause,
      data: {
        stripeSubscriptionId: subscription.id,
        stripePriceId: priceId,
        plan,
        status: this.mapStripeStatus(subscription.status),
        paymentProvider: 'STRIPE',
        currentPeriodStart: subData.current_period_start
          ? new Date(subData.current_period_start * 1000)
          : null,
        currentPeriodEnd: subData.current_period_end
          ? new Date(subData.current_period_end * 1000)
          : null,
        cancelAtPeriodEnd: subData.cancel_at_period_end ?? false,
      },
    });
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    const priceId = subscription.items.data[0]?.price.id;
    const plan = getPlanByPriceId(priceId) || 'FREE';

    const subData = subscription as unknown as {
      current_period_start?: number;
      current_period_end?: number;
      cancel_at_period_end?: boolean;
    };

    await prisma.subscription.update({
      where: { stripeSubscriptionId: subscription.id },
      data: {
        stripePriceId: priceId,
        plan,
        status: this.mapStripeStatus(subscription.status),
        currentPeriodStart: subData.current_period_start
          ? new Date(subData.current_period_start * 1000)
          : null,
        currentPeriodEnd: subData.current_period_end
          ? new Date(subData.current_period_end * 1000)
          : null,
        cancelAtPeriodEnd: subData.cancel_at_period_end ?? false,
      },
    });
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    await prisma.subscription.update({
      where: { stripeSubscriptionId: subscription.id },
      data: {
        stripeSubscriptionId: null,
        stripePriceId: null,
        plan: 'FREE',
        status: 'CANCELED',
        currentPeriodStart: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      },
    });
  }

  private async handlePaymentSucceeded(invoice: Record<string, unknown>): Promise<void> {
    const subscriptionId = invoice.subscription as string | null;

    if (subscriptionId) {
      const stripe = getStripe();
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      await this.handleSubscriptionUpdated(subscription);

      // Record the payment
      const dbSubscription = await prisma.subscription.findFirst({
        where: { stripeSubscriptionId: subscriptionId },
      });

      if (dbSubscription) {
        await prisma.payment.create({
          data: {
            subscriptionId: dbSubscription.id,
            userId: dbSubscription.userId,
            provider: 'STRIPE',
            amount: (invoice.amount_paid as number) || 0,
            currency: (invoice.currency as string) || 'usd',
            status: 'COMPLETED',
            providerPaymentId: invoice.payment_intent as string | null,
            providerOrderId: invoice.id as string,
            paymentMethod: 'card',
            paidAt: new Date(),
          },
        });
      }
    }
  }

  private async handlePaymentFailed(invoice: Record<string, unknown>): Promise<void> {
    const subscriptionId = invoice.subscription as string | null;

    if (subscriptionId) {
      // Record the failed payment
      const dbSubscription = await prisma.subscription.findFirst({
        where: { stripeSubscriptionId: subscriptionId },
      });

      if (dbSubscription) {
        await prisma.payment.create({
          data: {
            subscriptionId: dbSubscription.id,
            userId: dbSubscription.userId,
            provider: 'STRIPE',
            amount: (invoice.amount_due as number) || 0,
            currency: (invoice.currency as string) || 'usd',
            status: 'FAILED',
            providerPaymentId: invoice.payment_intent as string | null,
            providerOrderId: invoice.id as string,
            paymentMethod: 'card',
            failureReason: 'Payment failed',
          },
        });
      }
    }
  }

  private mapStripeStatus(
    status: string
  ): 'ACTIVE' | 'CANCELED' | 'PAST_DUE' | 'TRIALING' | 'INCOMPLETE' {
    switch (status) {
      case 'active':
        return 'ACTIVE';
      case 'canceled':
        return 'CANCELED';
      case 'past_due':
        return 'PAST_DUE';
      case 'trialing':
        return 'TRIALING';
      case 'incomplete':
      case 'incomplete_expired':
        return 'INCOMPLETE';
      default:
        return 'ACTIVE';
    }
  }
}
