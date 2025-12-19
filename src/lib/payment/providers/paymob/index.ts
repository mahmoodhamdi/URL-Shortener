/**
 * Paymob Payment Gateway Implementation
 *
 * This module implements the PaymentGateway interface for Paymob (Egyptian market).
 * Supports cards, mobile wallets (Vodafone Cash, etc.), and kiosk payments.
 */

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

// Paymob API base URL
const PAYMOB_API_URL = 'https://accept.paymob.com/api';

export class PaymobGateway implements PaymentGateway {
  readonly provider = 'paymob';

  private authToken: string | null = null;
  private tokenExpiry: Date | null = null;

  isConfigured(): boolean {
    return !!(
      process.env.PAYMOB_API_KEY &&
      process.env.PAYMOB_INTEGRATION_ID_CARD &&
      process.env.PAYMOB_HMAC_SECRET
    );
  }

  /**
   * Get authentication token from Paymob
   * Token is valid for 1 hour
   */
  private async getAuthToken(): Promise<string> {
    // Return cached token if still valid
    if (this.authToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return this.authToken;
    }

    const response = await fetch(`${PAYMOB_API_URL}/auth/tokens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: process.env.PAYMOB_API_KEY }),
    });

    if (!response.ok) {
      throw new Error('Failed to authenticate with Paymob');
    }

    const data = await response.json();
    this.authToken = data.token;
    this.tokenExpiry = new Date(Date.now() + 55 * 60 * 1000); // 55 minutes

    return this.authToken!;
  }

  async createCheckoutSession(params: CheckoutParams): Promise<CheckoutResult> {
    const token = await this.getAuthToken();

    // Step 1: Create order
    const orderResponse = await fetch(`${PAYMOB_API_URL}/ecommerce/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        auth_token: token,
        delivery_needed: false,
        amount_cents: this.getPlanAmountCents(params.planId, params.billingCycle),
        currency: params.currency || 'EGP',
        items: [],
        merchant_order_id: `${params.userId}-${Date.now()}`,
      }),
    });

    if (!orderResponse.ok) {
      throw new Error('Failed to create Paymob order');
    }

    const order = await orderResponse.json();

    // Step 2: Create payment key
    const paymentKeyResponse = await fetch(`${PAYMOB_API_URL}/acceptance/payment_keys`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        auth_token: token,
        amount_cents: this.getPlanAmountCents(params.planId, params.billingCycle),
        expiration: 3600,
        order_id: order.id,
        billing_data: {
          first_name: 'Customer',
          last_name: params.userId,
          email: params.email,
          phone_number: '+201000000000', // Required by Paymob
          street: 'NA',
          building: 'NA',
          floor: 'NA',
          apartment: 'NA',
          city: 'Cairo',
          state: 'Cairo',
          country: 'EG',
          postal_code: '00000',
        },
        currency: params.currency || 'EGP',
        integration_id: parseInt(process.env.PAYMOB_INTEGRATION_ID_CARD || '0'),
      }),
    });

    if (!paymentKeyResponse.ok) {
      throw new Error('Failed to create Paymob payment key');
    }

    const paymentKey = await paymentKeyResponse.json();
    const iframeId = process.env.PAYMOB_IFRAME_ID;

    return {
      sessionId: order.id.toString(),
      checkoutUrl: `https://accept.paymob.com/api/acceptance/iframes/${iframeId}?payment_token=${paymentKey.token}`,
      provider: this.provider,
    };
  }

  async createSubscription(_params: SubscriptionParams): Promise<SubscriptionResult> {
    // Paymob doesn't have native subscription support
    // We'll handle recurring payments via webhooks
    throw new Error('Paymob does not support native subscriptions. Use createCheckoutSession instead.');
  }

  async getSubscription(_subscriptionId: string): Promise<SubscriptionResult | null> {
    // Subscriptions are managed in our database for Paymob
    return null;
  }

  async cancelSubscription(_subscriptionId: string, _immediate?: boolean): Promise<void> {
    // No-op for Paymob - subscriptions are managed in our database
  }

  async resumeSubscription(_subscriptionId: string): Promise<void> {
    // No-op for Paymob
  }

  async createCustomer(_params: CustomerParams): Promise<string> {
    // Paymob doesn't have a customer concept like Stripe
    // Return a generated ID
    return `paymob_${Date.now()}`;
  }

  async createRefund(params: RefundParams): Promise<RefundResult> {
    const token = await this.getAuthToken();

    const response = await fetch(`${PAYMOB_API_URL}/acceptance/void_refund/refund`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        auth_token: token,
        transaction_id: params.paymentId,
        amount_cents: params.amount,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create Paymob refund');
    }

    const data = await response.json();

    return {
      refundId: data.id?.toString() || params.paymentId,
      status: data.success ? 'succeeded' : 'failed',
      amount: params.amount || 0,
      currency: 'EGP',
    };
  }

  verifyWebhook(payload: string, signature: string): WebhookVerification {
    const crypto = require('crypto');
    const hmacSecret = process.env.PAYMOB_HMAC_SECRET;

    if (!hmacSecret) {
      return { valid: false, error: 'HMAC secret not configured' };
    }

    try {
      const data = JSON.parse(payload);
      const obj = data.obj;

      // Paymob HMAC calculation
      const concatenatedString = [
        obj.amount_cents,
        obj.created_at,
        obj.currency,
        obj.error_occured,
        obj.has_parent_transaction,
        obj.id,
        obj.integration_id,
        obj.is_3d_secure,
        obj.is_auth,
        obj.is_capture,
        obj.is_refunded,
        obj.is_standalone_payment,
        obj.is_voided,
        obj.order.id,
        obj.owner,
        obj.pending,
        obj.source_data.pan,
        obj.source_data.sub_type,
        obj.source_data.type,
        obj.success,
      ].join('');

      const calculatedHmac = crypto
        .createHmac('sha512', hmacSecret)
        .update(concatenatedString)
        .digest('hex');

      if (calculatedHmac !== signature) {
        return { valid: false, error: 'Invalid HMAC signature' };
      }

      return {
        valid: true,
        event: {
          id: obj.id.toString(),
          type: obj.success ? 'payment.success' : 'payment.failed',
          provider: this.provider,
          data: obj,
          timestamp: new Date(obj.created_at),
        },
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Invalid webhook payload',
      };
    }
  }

  async handleWebhook(event: WebhookEvent): Promise<void> {
    const data = event.data;

    if (event.type === 'payment.success') {
      // Handle successful payment
      console.log('[Paymob] Payment succeeded:', data);
      // TODO: Update subscription status, record payment
    } else if (event.type === 'payment.failed') {
      // Handle failed payment
      console.log('[Paymob] Payment failed:', data);
      // TODO: Record failed payment
    }
  }

  // Helper methods

  private getPlanAmountCents(planId: string, billingCycle: 'monthly' | 'yearly'): number {
    // Convert USD prices to EGP cents (approximate exchange rate)
    // This should be replaced with actual plan configuration
    const prices: Record<string, { monthly: number; yearly: number }> = {
      STARTER: { monthly: 25000, yearly: 240000 }, // ~250 EGP/month
      PRO: { monthly: 60000, yearly: 600000 }, // ~600 EGP/month
      BUSINESS: { monthly: 125000, yearly: 1200000 }, // ~1250 EGP/month
      ENTERPRISE: { monthly: 250000, yearly: 2400000 }, // ~2500 EGP/month
    };

    const planPrices = prices[planId.toUpperCase()];
    if (!planPrices) {
      throw new Error(`Invalid plan: ${planId}`);
    }

    return billingCycle === 'yearly' ? planPrices.yearly : planPrices.monthly;
  }
}

// Export additional Paymob-specific functions

/**
 * Create a mobile wallet payment
 */
export async function createWalletPayment(
  paymentKey: string,
  phoneNumber: string
): Promise<{ redirectUrl?: string; pendingMessage?: string }> {
  const response = await fetch(`${PAYMOB_API_URL}/acceptance/payments/pay`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      source: {
        identifier: phoneNumber,
        subtype: 'WALLET',
      },
      payment_token: paymentKey,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to create wallet payment');
  }

  const data = await response.json();
  return {
    redirectUrl: data.redirect_url,
    pendingMessage: data.pending ? 'Payment request sent to your phone' : undefined,
  };
}

/**
 * Create a kiosk payment (Aman, Masary)
 */
export async function createKioskPayment(
  paymentKey: string
): Promise<{ billReference: string; expiresAt: Date }> {
  const response = await fetch(`${PAYMOB_API_URL}/acceptance/payments/pay`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      source: {
        identifier: 'AGGREGATOR',
        subtype: 'AGGREGATOR',
      },
      payment_token: paymentKey,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to create kiosk payment');
  }

  const data = await response.json();
  return {
    billReference: data.bill_reference || data.id?.toString(),
    expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours
  };
}
