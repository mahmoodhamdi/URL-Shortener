/**
 * Paymob Webhook Handler
 *
 * POST /api/payment/webhooks/paymob
 *
 * Handles payment callbacks from Paymob for:
 * - Card payments
 * - Mobile wallet payments
 * - Kiosk payments
 */

import { NextRequest, NextResponse } from 'next/server';
import { PaymobGateway } from '@/lib/payment/providers/paymob';
import {
  recordPayment,
  updatePaymentStatus,
  handleSubscriptionEvent,
  mapPlanId,
} from '@/lib/payment/handlers';
import { PaymentStatus, PaymentProvider } from '@prisma/client';

const gateway = new PaymobGateway();

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const hmac = request.nextUrl.searchParams.get('hmac') || '';

    // Verify webhook signature
    const verification = gateway.verifyWebhook(body, hmac);

    if (!verification.valid) {
      console.error('[Paymob Webhook] Invalid signature:', verification.error);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    const event = verification.event!;
    const data = event.data;

    // Extract user data from Paymob's merchant_order_id
    // Format: {userId}-{timestamp}
    const merchantOrderId = data.order?.merchant_order_id || '';
    const userId = merchantOrderId.split('-')[0];

    if (!userId) {
      console.error('[Paymob Webhook] No user ID in merchant_order_id:', merchantOrderId);
      return NextResponse.json({ received: true });
    }

    // Get plan info from integration ID or custom fields
    const planId = data.payment_key_claims?.billing_data?.last_name || 'STARTER';

    if (event.type === 'payment.success') {
      // Record successful payment
      await recordPayment({
        provider: PaymentProvider.PAYMOB,
        userId,
        amount: data.amount_cents || 0,
        currency: data.currency || 'EGP',
        status: PaymentStatus.COMPLETED,
        providerPaymentId: data.id?.toString(),
        providerOrderId: data.order?.id?.toString(),
        paymentMethod: mapPaymobPaymentMethod(data.source_data?.type, data.source_data?.sub_type),
        last4: data.source_data?.pan,
        brand: data.source_data?.sub_type,
        metadata: {
          integration_id: data.integration_id,
          is_3d_secure: data.is_3d_secure,
          is_refunded: data.is_refunded,
        },
      });

      // Create/update subscription
      await handleSubscriptionEvent({
        provider: PaymentProvider.PAYMOB,
        userId,
        providerSubscriptionId: data.order?.id?.toString() || data.id?.toString(),
        plan: mapPlanId(planId),
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: getNextBillingDate(planId),
      });

      console.log('[Paymob Webhook] Payment succeeded for user:', userId);
    } else if (event.type === 'payment.failed') {
      // Record failed payment
      await recordPayment({
        provider: PaymentProvider.PAYMOB,
        userId,
        amount: data.amount_cents || 0,
        currency: data.currency || 'EGP',
        status: PaymentStatus.FAILED,
        providerPaymentId: data.id?.toString(),
        providerOrderId: data.order?.id?.toString(),
        paymentMethod: mapPaymobPaymentMethod(data.source_data?.type, data.source_data?.sub_type),
        failureReason: data.data_message || 'Payment declined',
        metadata: {
          txn_response_code: data.txn_response_code,
          data_message: data.data_message,
        },
      });

      console.log('[Paymob Webhook] Payment failed for user:', userId);
    } else if (event.type === 'payment.pending') {
      // For kiosk payments - update status to processing
      if (data.source_data?.type === 'AGGREGATOR') {
        await updatePaymentStatus(
          data.order?.id?.toString() || '',
          PaymentProvider.PAYMOB,
          PaymentStatus.PROCESSING
        );
      }

      console.log('[Paymob Webhook] Payment pending for user:', userId);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[Paymob Webhook] Error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

/**
 * Map Paymob payment method types
 */
function mapPaymobPaymentMethod(type?: string, subType?: string): string {
  if (type === 'WALLET') {
    return 'wallet';
  }
  if (type === 'AGGREGATOR') {
    return 'kiosk';
  }
  if (type === 'card') {
    if (subType === 'MADA') {
      return 'mada';
    }
    return 'card';
  }
  return type || 'unknown';
}

/**
 * Get next billing date based on plan (monthly by default)
 */
function getNextBillingDate(planId: string): Date {
  const date = new Date();
  // Check if yearly from plan ID suffix
  if (planId.toLowerCase().includes('yearly')) {
    date.setFullYear(date.getFullYear() + 1);
  } else {
    date.setMonth(date.getMonth() + 1);
  }
  return date;
}
