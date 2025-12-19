/**
 * Payment Event Handlers
 *
 * Shared handlers for processing payment events from all providers.
 * These handlers update the database when payment events occur.
 */

import { prisma } from '@/lib/db/prisma';
import { PaymentProvider, PaymentStatus, Plan } from '@prisma/client';

export interface PaymentEventData {
  provider: PaymentProvider;
  userId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  providerPaymentId?: string;
  providerOrderId?: string;
  subscriptionId?: string;
  paymentMethod?: string;
  last4?: string;
  brand?: string;
  kioskBillRef?: string;
  kioskExpiry?: Date;
  metadata?: Record<string, unknown>;
  failureReason?: string;
}

export interface SubscriptionEventData {
  provider: PaymentProvider;
  userId: string;
  providerSubscriptionId: string;
  providerCustomerId?: string;
  plan: Plan;
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd?: boolean;
}

/**
 * Record a payment in the database
 */
export async function recordPayment(data: PaymentEventData): Promise<string> {
  // Find subscription if not provided
  let subscriptionId = data.subscriptionId;

  if (!subscriptionId && data.userId) {
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: data.userId,
        paymentProvider: data.provider,
      },
    });
    subscriptionId = subscription?.id;
  }

  const payment = await prisma.payment.create({
    data: {
      subscriptionId,
      userId: data.userId,
      provider: data.provider,
      amount: data.amount,
      currency: data.currency,
      status: data.status,
      providerPaymentId: data.providerPaymentId,
      providerOrderId: data.providerOrderId,
      paymentMethod: data.paymentMethod,
      last4: data.last4,
      brand: data.brand,
      kioskBillRef: data.kioskBillRef,
      kioskExpiry: data.kioskExpiry,
      metadata: data.metadata as object,
      failureReason: data.failureReason,
    },
  });

  console.log(`[Payment] Recorded payment ${payment.id} for user ${data.userId}`);
  return payment.id;
}

/**
 * Update payment status
 */
export async function updatePaymentStatus(
  providerPaymentId: string,
  provider: PaymentProvider,
  status: PaymentStatus,
  failureReason?: string
): Promise<void> {
  await prisma.payment.updateMany({
    where: {
      providerPaymentId,
      provider,
    },
    data: {
      status,
      failureReason,
    },
  });

  console.log(`[Payment] Updated payment ${providerPaymentId} to ${status}`);
}

/**
 * Create or update subscription from payment provider event
 */
export async function handleSubscriptionEvent(data: SubscriptionEventData): Promise<void> {
  const { provider, userId, providerSubscriptionId, providerCustomerId, plan, status, currentPeriodStart, currentPeriodEnd, cancelAtPeriodEnd } = data;

  // Map status to subscription fields
  const subscriptionData = {
    plan,
    currentPeriodStart,
    currentPeriodEnd,
    cancelAtPeriodEnd: cancelAtPeriodEnd ?? false,
    paymentProvider: provider,
    updatedAt: new Date(),
  };

  // Add provider-specific IDs
  const providerIds = getProviderIds(provider, providerSubscriptionId, providerCustomerId);

  // Check if subscription exists
  const existingSubscription = await prisma.subscription.findFirst({
    where: {
      userId,
      paymentProvider: provider,
    },
  });

  if (existingSubscription) {
    await prisma.subscription.update({
      where: { id: existingSubscription.id },
      data: {
        ...subscriptionData,
        ...providerIds,
      },
    });
    console.log(`[Subscription] Updated subscription ${existingSubscription.id} for user ${userId}`);
  } else {
    // Create new subscription
    await prisma.subscription.create({
      data: {
        userId,
        ...subscriptionData,
        ...providerIds,
        stripeSubscriptionId: provider === 'STRIPE' ? providerSubscriptionId : null,
        stripeCustomerId: provider === 'STRIPE' ? providerCustomerId || null : null,
      },
    });
    console.log(`[Subscription] Created new subscription for user ${userId}`);
  }

  // Log successful subscription update
  if (status === 'active') {
    console.log(`[Subscription] User ${userId} subscribed to plan ${plan}`);
  }
}

/**
 * Handle subscription cancellation
 */
export async function handleSubscriptionCancellation(
  provider: PaymentProvider,
  providerSubscriptionId: string,
  immediate: boolean = false
): Promise<void> {
  const whereClause = getSubscriptionWhereClause(provider, providerSubscriptionId);

  const subscription = await prisma.subscription.findFirst({
    where: whereClause,
  });

  if (!subscription) {
    console.warn(`[Subscription] Subscription not found for cancellation: ${providerSubscriptionId}`);
    return;
  }

  if (immediate) {
    // Immediate cancellation - downgrade subscription to FREE
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        plan: 'FREE',
        cancelAtPeriodEnd: false,
      },
    });

    console.log(`[Subscription] Immediately cancelled subscription ${subscription.id}`);
  } else {
    // Cancel at period end
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        cancelAtPeriodEnd: true,
      },
    });

    console.log(`[Subscription] Scheduled cancellation for subscription ${subscription.id}`);
  }
}

/**
 * Get provider-specific ID fields for subscription
 */
function getProviderIds(
  provider: PaymentProvider,
  subscriptionId: string,
  customerId?: string
): Record<string, string | null> {
  switch (provider) {
    case 'STRIPE':
      return {
        stripeSubscriptionId: subscriptionId,
        stripeCustomerId: customerId || null,
      };
    case 'PAYMOB':
      return {
        paymobOrderId: subscriptionId,
        paymobTransactionId: customerId || null,
      };
    case 'PAYTABS':
      return {
        paytabsCustomerRef: customerId || null,
        paytabsTransactionRef: subscriptionId,
      };
    case 'PADDLE':
      return {
        paddleSubscriptionId: subscriptionId,
        paddleCustomerId: customerId || null,
      };
    default:
      return {};
  }
}

/**
 * Get where clause for finding subscription by provider ID
 */
function getSubscriptionWhereClause(
  provider: PaymentProvider,
  providerSubscriptionId: string
): Record<string, unknown> {
  switch (provider) {
    case 'STRIPE':
      return { stripeSubscriptionId: providerSubscriptionId };
    case 'PAYMOB':
      return { paymobOrderId: providerSubscriptionId };
    case 'PAYTABS':
      return { paytabsTransactionRef: providerSubscriptionId };
    case 'PADDLE':
      return { paddleSubscriptionId: providerSubscriptionId };
    default:
      return {};
  }
}

/**
 * Map plan ID string to Plan enum
 */
export function mapPlanId(planId: string): Plan {
  const planMap: Record<string, Plan> = {
    STARTER: 'STARTER',
    PRO: 'PRO',
    BUSINESS: 'BUSINESS',
    ENTERPRISE: 'ENTERPRISE',
    FREE: 'FREE',
  };
  return planMap[planId.toUpperCase()] || 'FREE';
}

/**
 * Handle kiosk payment creation (for Paymob)
 */
export async function createKioskPaymentRecord(data: {
  userId: string;
  amount: number;
  currency: string;
  billReference: string;
  expiresAt: Date;
  providerOrderId: string;
  metadata?: Record<string, unknown>;
}): Promise<string> {
  const payment = await prisma.payment.create({
    data: {
      userId: data.userId,
      provider: 'PAYMOB',
      amount: data.amount,
      currency: data.currency,
      status: 'PENDING',
      providerOrderId: data.providerOrderId,
      kioskBillRef: data.billReference,
      kioskExpiry: data.expiresAt,
      paymentMethod: 'kiosk',
      metadata: data.metadata as object,
    },
  });

  console.log(`[Payment] Created kiosk payment ${payment.id} with bill ref ${data.billReference}`);
  return payment.id;
}

/**
 * Get pending kiosk payment by bill reference
 */
export async function getKioskPaymentByBillRef(billReference: string) {
  return prisma.payment.findFirst({
    where: {
      kioskBillRef: billReference,
      status: 'PENDING',
      kioskExpiry: {
        gt: new Date(),
      },
    },
  });
}
