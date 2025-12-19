/**
 * PayTabs Webhook Handler
 *
 * POST /api/payment/webhooks/paytabs
 *
 * Handles payment callbacks from PayTabs for MENA region payments.
 */

import { NextRequest, NextResponse } from 'next/server';
import { PayTabsGateway } from '@/lib/payment/providers/paytabs';
import {
  recordPayment,
  handleSubscriptionEvent,
  mapPlanId,
} from '@/lib/payment/handlers';
import { PaymentStatus, PaymentProvider } from '@prisma/client';

// Type definitions for PayTabs webhook data
interface PayTabsUserDefined {
  udf1?: string;
  udf2?: string;
  udf3?: string;
}

interface PayTabsPaymentResult {
  response_status?: string;
  response_code?: string;
  response_message?: string;
}

interface PayTabsPaymentInfo {
  payment_method?: string;
  card_scheme?: string;
  card_type?: string;
}

interface PayTabsCustomerDetails {
  email?: string;
}

interface PayTabsWebhookData {
  cart_id?: string;
  cart_amount?: number;
  cart_currency?: string;
  tran_ref?: string;
  customer_ref?: string;
  user_defined?: PayTabsUserDefined;
  payment_result?: PayTabsPaymentResult;
  payment_info?: PayTabsPaymentInfo;
  customer_details?: PayTabsCustomerDetails;
}

const gateway = new PayTabsGateway();

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('signature') || '';

    // Verify webhook signature
    const verification = gateway.verifyWebhook(body, signature);

    if (!verification.valid) {
      console.error('[PayTabs Webhook] Invalid signature:', verification.error);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    const event = verification.event!;
    const data = event.data as unknown as PayTabsWebhookData;

    // Extract user data from cart_id
    // Format: {userId}-{timestamp}
    const cartId = data.cart_id || '';
    const userId = cartId.split('-')[0];

    if (!userId) {
      console.error('[PayTabs Webhook] No user ID in cart_id:', cartId);
      return NextResponse.json({ received: true });
    }

    // Get plan info from user_defined fields
    const planId = data.user_defined?.udf2 || 'STARTER';
    const billingCycle = data.user_defined?.udf3 || 'monthly';

    // Determine payment status
    const responseStatus = data.payment_result?.response_status;
    const status = mapPayTabsStatus(responseStatus);

    if (status === PaymentStatus.COMPLETED) {
      // Record successful payment
      await recordPayment({
        provider: PaymentProvider.PAYTABS,
        userId,
        amount: Math.round((data.cart_amount || 0) * 100), // Convert to cents
        currency: data.cart_currency || 'SAR',
        status: PaymentStatus.COMPLETED,
        providerPaymentId: data.tran_ref,
        providerOrderId: data.cart_id,
        paymentMethod: mapPayTabsPaymentMethod(data.payment_info?.payment_method),
        last4: data.payment_info?.card_scheme?.slice(-4),
        brand: data.payment_info?.card_type,
        metadata: {
          tran_ref: data.tran_ref,
          customer_email: data.customer_details?.email,
          payment_description: data.payment_result?.response_message,
        },
      });

      // Create/update subscription
      await handleSubscriptionEvent({
        provider: PaymentProvider.PAYTABS,
        userId,
        providerSubscriptionId: data.tran_ref || '',
        providerCustomerId: data.customer_ref,
        plan: mapPlanId(planId),
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: getNextBillingDate(billingCycle),
      });

      console.log('[PayTabs Webhook] Payment succeeded for user:', userId);
    } else if (status === PaymentStatus.FAILED) {
      // Record failed payment
      await recordPayment({
        provider: PaymentProvider.PAYTABS,
        userId,
        amount: Math.round((data.cart_amount || 0) * 100),
        currency: data.cart_currency || 'SAR',
        status: PaymentStatus.FAILED,
        providerPaymentId: data.tran_ref,
        providerOrderId: data.cart_id,
        paymentMethod: mapPayTabsPaymentMethod(data.payment_info?.payment_method),
        failureReason: data.payment_result?.response_message || 'Payment declined',
        metadata: {
          tran_ref: data.tran_ref,
          response_code: data.payment_result?.response_code,
          response_message: data.payment_result?.response_message,
        },
      });

      console.log('[PayTabs Webhook] Payment failed for user:', userId);
    } else if (status === PaymentStatus.PENDING) {
      // Record pending payment
      await recordPayment({
        provider: PaymentProvider.PAYTABS,
        userId,
        amount: Math.round((data.cart_amount || 0) * 100),
        currency: data.cart_currency || 'SAR',
        status: PaymentStatus.PENDING,
        providerPaymentId: data.tran_ref,
        providerOrderId: data.cart_id,
        paymentMethod: mapPayTabsPaymentMethod(data.payment_info?.payment_method),
        metadata: {
          tran_ref: data.tran_ref,
          response_message: data.payment_result?.response_message,
        },
      });

      console.log('[PayTabs Webhook] Payment pending for user:', userId);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[PayTabs Webhook] Error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

/**
 * Map PayTabs response status to PaymentStatus
 */
function mapPayTabsStatus(responseStatus?: string): PaymentStatus {
  switch (responseStatus) {
    case 'A': // Authorized
      return PaymentStatus.COMPLETED;
    case 'H': // Hold
    case 'P': // Pending
      return PaymentStatus.PENDING;
    case 'V': // Voided
      return PaymentStatus.CANCELLED;
    case 'E': // Error
    case 'D': // Declined
    default:
      return PaymentStatus.FAILED;
  }
}

/**
 * Map PayTabs payment method
 */
function mapPayTabsPaymentMethod(method?: string): string {
  if (!method) return 'card';

  const methodLower = method.toLowerCase();
  if (methodLower.includes('mada')) {
    return 'mada';
  }
  if (methodLower.includes('apple')) {
    return 'apple_pay';
  }
  if (methodLower.includes('google')) {
    return 'google_pay';
  }
  return 'card';
}

/**
 * Get next billing date based on billing cycle
 */
function getNextBillingDate(billingCycle: string): Date {
  const date = new Date();
  if (billingCycle === 'yearly') {
    date.setFullYear(date.getFullYear() + 1);
  } else {
    date.setMonth(date.getMonth() + 1);
  }
  return date;
}
