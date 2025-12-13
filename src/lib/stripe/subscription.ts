import { prisma } from '@/lib/db/prisma';
import { stripe } from './client';
import { getPlanByPriceId, PLANS } from './plans';
import { Plan } from '@/types';
import Stripe from 'stripe';

export async function getOrCreateStripeCustomer(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { subscription: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Return existing customer ID
  if (user.subscription?.stripeCustomerId) {
    return user.subscription.stripeCustomerId;
  }

  // Create new Stripe customer
  const customer = await stripe.customers.create({
    email: user.email!,
    name: user.name || undefined,
    metadata: {
      userId: user.id,
    },
  });

  // Update subscription with customer ID
  await prisma.subscription.update({
    where: { userId: user.id },
    data: { stripeCustomerId: customer.id },
  });

  return customer.id;
}

export async function createCheckoutSession({
  userId,
  priceId,
  successUrl,
  cancelUrl,
}: {
  userId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
}) {
  const customerId = await getOrCreateStripeCustomer(userId);

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
    success_url: successUrl,
    cancel_url: cancelUrl,
    subscription_data: {
      metadata: {
        userId,
      },
    },
    metadata: {
      userId,
    },
  });

  return session;
}

export async function createBillingPortalSession({
  userId,
  returnUrl,
}: {
  userId: string;
  returnUrl: string;
}) {
  const customerId = await getOrCreateStripeCustomer(userId);

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return session;
}

export async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  const priceId = subscription.items.data[0]?.price.id;
  const plan = getPlanByPriceId(priceId) || 'FREE';
  const userId = subscription.metadata?.userId;
  const customerId = typeof subscription.customer === 'string'
    ? subscription.customer
    : subscription.customer.id;

  // Extract period dates from subscription (handle different API versions)
  const subData = subscription as unknown as {
    current_period_start?: number;
    current_period_end?: number;
    cancel_at_period_end?: boolean;
  };

  if (!userId) {
    // Find user by customer ID
    const existingSubscription = await prisma.subscription.findFirst({
      where: { stripeCustomerId: customerId },
    });
    if (!existingSubscription) {
      console.error('No user found for subscription:', subscription.id);
      return;
    }
  }

  await prisma.subscription.update({
    where: userId ? { userId } : { stripeCustomerId: customerId },
    data: {
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      plan,
      status: mapStripeStatus(subscription.status),
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

export async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const priceId = subscription.items.data[0]?.price.id;
  const plan = getPlanByPriceId(priceId) || 'FREE';

  // Extract period dates from subscription (handle different API versions)
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
      status: mapStripeStatus(subscription.status),
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

export async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
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

export async function getUserSubscription(userId: string) {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    include: { user: true },
  });

  if (!subscription) {
    // Create default free subscription
    return await prisma.subscription.create({
      data: {
        userId,
        plan: 'FREE',
        status: 'ACTIVE',
      },
      include: { user: true },
    });
  }

  return subscription;
}

export async function cancelSubscription(userId: string) {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (!subscription?.stripeSubscriptionId) {
    throw new Error('No active subscription found');
  }

  await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
    cancel_at_period_end: true,
  });

  await prisma.subscription.update({
    where: { userId },
    data: { cancelAtPeriodEnd: true },
  });
}

export async function resumeSubscription(userId: string) {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (!subscription?.stripeSubscriptionId) {
    throw new Error('No active subscription found');
  }

  await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
    cancel_at_period_end: false,
  });

  await prisma.subscription.update({
    where: { userId },
    data: { cancelAtPeriodEnd: false },
  });
}

function mapStripeStatus(status: string): 'ACTIVE' | 'CANCELED' | 'PAST_DUE' | 'TRIALING' | 'INCOMPLETE' {
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

export function getPlanConfig(plan: Plan) {
  return PLANS[plan];
}

export async function resetMonthlyUsage() {
  // Reset links used this month for all subscriptions
  // This should be called by a cron job at the start of each billing period
  const now = new Date();

  await prisma.subscription.updateMany({
    where: {
      OR: [
        { linksResetAt: { lt: new Date(now.getFullYear(), now.getMonth(), 1) } },
        { currentPeriodEnd: { lt: now } },
      ],
    },
    data: {
      linksUsedThisMonth: 0,
      linksResetAt: now,
    },
  });
}

export async function incrementLinkUsage(userId: string) {
  await prisma.subscription.update({
    where: { userId },
    data: {
      linksUsedThisMonth: { increment: 1 },
    },
  });
}
