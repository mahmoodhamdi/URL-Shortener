/**
 * Paddle Webhook Handler
 *
 * POST /api/payment/webhooks/paddle
 *
 * Handles webhook events from Paddle (Merchant of Record).
 * Paddle handles VAT/GST compliance globally.
 */

import { NextRequest, NextResponse } from 'next/server';
import { PaddleGateway } from '@/lib/payment/providers/paddle';
import {
  recordPayment,
  handleSubscriptionEvent,
  handleSubscriptionCancellation,
  mapPlanId,
} from '@/lib/payment/handlers';
import { PaymentStatus, PaymentProvider } from '@prisma/client';

// Type definitions for Paddle webhook data
interface PaddleCustomData {
  user_id?: string;
  plan_id?: string;
  billing_cycle?: string;
}

interface PaddleWebhookData {
  id: string;
  status?: string;
  customer_id?: string;
  currency_code?: string;
  subscription_id?: string;
  invoice_id?: string;
  custom_data?: PaddleCustomData;
  current_billing_period?: {
    starts_at?: string;
    ends_at?: string;
  };
  scheduled_change?: {
    action?: string;
  };
  details?: {
    totals?: {
      total?: string;
    };
  };
  items?: Array<{
    price?: {
      custom_data?: PaddleCustomData;
    };
  }>;
  payments?: Array<{
    method_details?: {
      type?: string;
      card?: {
        last4?: string;
        type?: string;
      };
    };
    error_code?: string;
  }>;
}

const gateway = new PaddleGateway();

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('paddle-signature') || '';

    // Verify webhook signature
    const verification = gateway.verifyWebhook(body, signature);

    if (!verification.valid) {
      console.error('[Paddle Webhook] Invalid signature:', verification.error);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    const event = verification.event!;
    const data = event.data as unknown as PaddleWebhookData;

    // Extract user ID from custom_data
    const userId = data.custom_data?.user_id;

    if (!userId) {
      console.error('[Paddle Webhook] No user ID in custom_data');
      return NextResponse.json({ received: true });
    }

    switch (event.type) {
      case 'subscription.created':
      case 'subscription.activated': {
        const planId = data.custom_data?.plan_id || 'STARTER';
        const billingCycle = data.custom_data?.billing_cycle || 'monthly';

        await handleSubscriptionEvent({
          provider: PaymentProvider.PADDLE,
          userId,
          providerSubscriptionId: data.id,
          providerCustomerId: data.customer_id,
          plan: mapPlanId(planId),
          status: mapPaddleStatus(data.status),
          currentPeriodStart: new Date(data.current_billing_period?.starts_at || Date.now()),
          currentPeriodEnd: new Date(data.current_billing_period?.ends_at || Date.now()),
          cancelAtPeriodEnd: data.scheduled_change?.action === 'cancel',
        });

        console.log('[Paddle Webhook] Subscription created/activated for user:', userId);
        break;
      }

      case 'subscription.updated': {
        const planId = data.custom_data?.plan_id || data.items?.[0]?.price?.custom_data?.plan_id || 'STARTER';

        await handleSubscriptionEvent({
          provider: PaymentProvider.PADDLE,
          userId,
          providerSubscriptionId: data.id,
          providerCustomerId: data.customer_id,
          plan: mapPlanId(planId),
          status: mapPaddleStatus(data.status),
          currentPeriodStart: new Date(data.current_billing_period?.starts_at || Date.now()),
          currentPeriodEnd: new Date(data.current_billing_period?.ends_at || Date.now()),
          cancelAtPeriodEnd: data.scheduled_change?.action === 'cancel',
        });

        console.log('[Paddle Webhook] Subscription updated for user:', userId);
        break;
      }

      case 'subscription.canceled': {
        await handleSubscriptionCancellation(
          PaymentProvider.PADDLE,
          data.id,
          true // Paddle cancellations are immediate when this event fires
        );

        console.log('[Paddle Webhook] Subscription canceled for user:', userId);
        break;
      }

      case 'subscription.paused': {
        // Handle paused subscription
        await handleSubscriptionEvent({
          provider: PaymentProvider.PADDLE,
          userId,
          providerSubscriptionId: data.id,
          providerCustomerId: data.customer_id,
          plan: mapPlanId(data.custom_data?.plan_id || 'STARTER'),
          status: 'past_due',
          currentPeriodStart: new Date(data.current_billing_period?.starts_at || Date.now()),
          currentPeriodEnd: new Date(data.current_billing_period?.ends_at || Date.now()),
        });

        console.log('[Paddle Webhook] Subscription paused for user:', userId);
        break;
      }

      case 'transaction.completed': {
        // Record successful payment
        const amount = data.details?.totals?.total
          ? parseInt(data.details.totals.total)
          : 0;

        await recordPayment({
          provider: PaymentProvider.PADDLE,
          userId,
          amount,
          currency: data.currency_code || 'USD',
          status: PaymentStatus.COMPLETED,
          providerPaymentId: data.id,
          providerOrderId: data.subscription_id,
          paymentMethod: mapPaddlePaymentMethod(data.payments?.[0]?.method_details?.type),
          last4: data.payments?.[0]?.method_details?.card?.last4,
          brand: data.payments?.[0]?.method_details?.card?.type,
          metadata: {
            transaction_id: data.id,
            subscription_id: data.subscription_id,
            invoice_id: data.invoice_id,
          },
        });

        console.log('[Paddle Webhook] Transaction completed for user:', userId);
        break;
      }

      case 'transaction.payment_failed': {
        // Record failed payment
        const amount = data.details?.totals?.total
          ? parseInt(data.details.totals.total)
          : 0;

        await recordPayment({
          provider: PaymentProvider.PADDLE,
          userId,
          amount,
          currency: data.currency_code || 'USD',
          status: PaymentStatus.FAILED,
          providerPaymentId: data.id,
          providerOrderId: data.subscription_id,
          paymentMethod: mapPaddlePaymentMethod(data.payments?.[0]?.method_details?.type),
          failureReason: data.payments?.[0]?.error_code || 'Payment failed',
          metadata: {
            transaction_id: data.id,
            error_code: data.payments?.[0]?.error_code,
          },
        });

        console.log('[Paddle Webhook] Transaction failed for user:', userId);
        break;
      }

      case 'transaction.refunded': {
        // Update payment to refunded
        await recordPayment({
          provider: PaymentProvider.PADDLE,
          userId,
          amount: data.details?.totals?.total
            ? parseInt(data.details.totals.total)
            : 0,
          currency: data.currency_code || 'USD',
          status: PaymentStatus.REFUNDED,
          providerPaymentId: data.id,
          providerOrderId: data.subscription_id,
          metadata: {
            original_transaction_id: data.id,
            refund_reason: 'Refunded',
          },
        });

        console.log('[Paddle Webhook] Transaction refunded for user:', userId);
        break;
      }

      default:
        console.log(`[Paddle Webhook] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[Paddle Webhook] Error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

/**
 * Map Paddle subscription status
 */
function mapPaddleStatus(status?: string): 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete' {
  switch (status) {
    case 'active':
      return 'active';
    case 'canceled':
      return 'canceled';
    case 'past_due':
      return 'past_due';
    case 'trialing':
      return 'trialing';
    case 'paused':
      return 'past_due';
    default:
      return 'incomplete';
  }
}

/**
 * Map Paddle payment method type
 */
function mapPaddlePaymentMethod(type?: string): string {
  switch (type) {
    case 'card':
      return 'card';
    case 'paypal':
      return 'paypal';
    case 'apple_pay':
      return 'apple_pay';
    case 'google_pay':
      return 'google_pay';
    case 'wire_transfer':
      return 'bank_transfer';
    default:
      return type || 'unknown';
  }
}
