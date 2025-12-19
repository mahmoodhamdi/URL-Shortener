/**
 * Paddle Payment Gateway Implementation
 *
 * This module implements the PaymentGateway interface for Paddle (Global MoR).
 * Paddle handles VAT/GST and tax compliance globally.
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
import crypto from 'crypto';

// Paddle API endpoints
const PADDLE_API_URL = {
  sandbox: 'https://sandbox-api.paddle.com',
  production: 'https://api.paddle.com',
};

export class PaddleGateway implements PaymentGateway {
  readonly provider = 'paddle';

  private getBaseUrl(): string {
    const environment = process.env.PADDLE_ENVIRONMENT || 'sandbox';
    return environment === 'production' ? PADDLE_API_URL.production : PADDLE_API_URL.sandbox;
  }

  isConfigured(): boolean {
    return !!(
      process.env.PADDLE_API_KEY &&
      process.env.PADDLE_VENDOR_ID &&
      process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN
    );
  }

  async createCheckoutSession(params: CheckoutParams): Promise<CheckoutResult> {
    const baseUrl = this.getBaseUrl();
    const apiKey = process.env.PADDLE_API_KEY;

    if (!apiKey) {
      throw new Error('Paddle API key not configured');
    }

    const priceId = this.getPlanPriceId(params.planId, params.billingCycle);

    // Create a transaction (Paddle's checkout)
    const response = await fetch(`${baseUrl}/transactions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: [
          {
            price_id: priceId,
            quantity: 1,
          },
        ],
        customer_id: params.metadata?.paddleCustomerId,
        custom_data: {
          user_id: params.userId,
          plan_id: params.planId,
          billing_cycle: params.billingCycle,
        },
        checkout: {
          url: params.successUrl,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to create Paddle transaction: ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    const transaction = data.data;

    // Build checkout URL using Paddle.js overlay
    // The actual checkout URL will be rendered client-side using Paddle.js
    const checkoutUrl = `${process.env.NEXT_PUBLIC_APP_URL}/checkout/paddle?transaction_id=${transaction.id}`;

    return {
      sessionId: transaction.id,
      checkoutUrl,
      provider: this.provider,
    };
  }

  async createSubscription(params: SubscriptionParams): Promise<SubscriptionResult> {
    const baseUrl = this.getBaseUrl();
    const apiKey = process.env.PADDLE_API_KEY;

    if (!apiKey) {
      throw new Error('Paddle API key not configured');
    }

    const priceId = this.getPlanPriceId(params.planId, params.billingCycle);

    // Create subscription
    const response = await fetch(`${baseUrl}/subscriptions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customer_id: params.metadata?.paddleCustomerId,
        items: [
          {
            price_id: priceId,
            quantity: 1,
          },
        ],
        custom_data: {
          user_id: params.userId,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to create Paddle subscription: ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    const subscription = data.data;

    return {
      subscriptionId: subscription.id,
      customerId: subscription.customer_id,
      status: subscription.status,
      currentPeriodStart: new Date(subscription.current_billing_period?.starts_at || Date.now()),
      currentPeriodEnd: new Date(subscription.current_billing_period?.ends_at || Date.now()),
      cancelAtPeriodEnd: subscription.scheduled_change?.action === 'cancel',
    };
  }

  async getSubscription(subscriptionId: string): Promise<SubscriptionResult | null> {
    const baseUrl = this.getBaseUrl();
    const apiKey = process.env.PADDLE_API_KEY;

    if (!apiKey) {
      throw new Error('Paddle API key not configured');
    }

    try {
      const response = await fetch(`${baseUrl}/subscriptions/${subscriptionId}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      const subscription = data.data;

      return {
        subscriptionId: subscription.id,
        customerId: subscription.customer_id,
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_billing_period?.starts_at || Date.now()),
        currentPeriodEnd: new Date(subscription.current_billing_period?.ends_at || Date.now()),
        cancelAtPeriodEnd: subscription.scheduled_change?.action === 'cancel',
      };
    } catch {
      return null;
    }
  }

  async cancelSubscription(subscriptionId: string, immediate = false): Promise<void> {
    const baseUrl = this.getBaseUrl();
    const apiKey = process.env.PADDLE_API_KEY;

    if (!apiKey) {
      throw new Error('Paddle API key not configured');
    }

    const response = await fetch(`${baseUrl}/subscriptions/${subscriptionId}/cancel`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        effective_from: immediate ? 'immediately' : 'next_billing_period',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to cancel Paddle subscription: ${JSON.stringify(error)}`);
    }
  }

  async resumeSubscription(subscriptionId: string): Promise<void> {
    const baseUrl = this.getBaseUrl();
    const apiKey = process.env.PADDLE_API_KEY;

    if (!apiKey) {
      throw new Error('Paddle API key not configured');
    }

    // Resume by removing scheduled cancellation
    const response = await fetch(`${baseUrl}/subscriptions/${subscriptionId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        scheduled_change: null,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to resume Paddle subscription: ${JSON.stringify(error)}`);
    }
  }

  async createCustomer(params: CustomerParams): Promise<string> {
    const baseUrl = this.getBaseUrl();
    const apiKey = process.env.PADDLE_API_KEY;

    if (!apiKey) {
      throw new Error('Paddle API key not configured');
    }

    // Check if customer exists
    const searchResponse = await fetch(`${baseUrl}/customers?email=${encodeURIComponent(params.email)}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (searchResponse.ok) {
      const searchData = await searchResponse.json();
      if (searchData.data?.length > 0) {
        return searchData.data[0].id;
      }
    }

    // Create new customer
    const response = await fetch(`${baseUrl}/customers`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: params.email,
        name: params.name,
        custom_data: {
          user_id: params.userId,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to create Paddle customer: ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    return data.data.id;
  }

  async createRefund(params: RefundParams): Promise<RefundResult> {
    const baseUrl = this.getBaseUrl();
    const apiKey = process.env.PADDLE_API_KEY;

    if (!apiKey) {
      throw new Error('Paddle API key not configured');
    }

    // Create adjustment (Paddle's refund)
    const response = await fetch(`${baseUrl}/adjustments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'refund',
        transaction_id: params.paymentId,
        reason: params.reason || 'Requested by customer',
        items: params.amount
          ? [
              {
                type: 'partial',
                amount: params.amount.toString(),
              },
            ]
          : undefined,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to create Paddle refund: ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    const adjustment = data.data;

    return {
      refundId: adjustment.id,
      status: adjustment.status,
      amount: parseInt(adjustment.totals?.total || '0'),
      currency: adjustment.currency_code || 'USD',
    };
  }

  verifyWebhook(payload: string, signature: string): WebhookVerification {
    const publicKey = process.env.PADDLE_PUBLIC_KEY;

    if (!publicKey) {
      return { valid: false, error: 'Paddle public key not configured' };
    }

    try {
      // Paddle webhook signature verification
      // The signature is in the format: ts=...,h1=...
      const parts = signature.split(';').reduce(
        (acc, part) => {
          const [key, value] = part.split('=');
          acc[key] = value;
          return acc;
        },
        {} as Record<string, string>
      );

      const timestamp = parts['ts'];
      const h1 = parts['h1'];

      if (!timestamp || !h1) {
        return { valid: false, error: 'Invalid signature format' };
      }

      // Create the signed payload
      const signedPayload = `${timestamp}:${payload}`;

      // Verify using public key
      const verifier = crypto.createVerify('sha256');
      verifier.update(signedPayload);

      const isValid = verifier.verify(publicKey, h1, 'base64');

      if (!isValid) {
        return { valid: false, error: 'Invalid signature' };
      }

      const data = JSON.parse(payload);

      return {
        valid: true,
        event: {
          id: data.event_id,
          type: data.event_type,
          provider: this.provider,
          data: data.data,
          timestamp: new Date(data.occurred_at),
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
    switch (event.type) {
      case 'subscription.created':
        console.log('[Paddle] Subscription created:', event.data);
        // TODO: Update database
        break;

      case 'subscription.updated':
        console.log('[Paddle] Subscription updated:', event.data);
        // TODO: Update database
        break;

      case 'subscription.canceled':
        console.log('[Paddle] Subscription canceled:', event.data);
        // TODO: Update database
        break;

      case 'transaction.completed':
        console.log('[Paddle] Transaction completed:', event.data);
        // TODO: Record payment
        break;

      case 'transaction.payment_failed':
        console.log('[Paddle] Transaction failed:', event.data);
        // TODO: Record failed payment
        break;

      default:
        console.log(`[Paddle] Unhandled event type: ${event.type}`);
    }
  }

  // Helper methods

  private getPlanPriceId(planId: string, billingCycle: 'monthly' | 'yearly'): string {
    // Map plan IDs to Paddle price IDs
    const priceIds: Record<string, { monthly: string; yearly: string }> = {
      STARTER: {
        monthly: process.env.PADDLE_PRICE_STARTER_MONTHLY || '',
        yearly: process.env.PADDLE_PRICE_STARTER_YEARLY || '',
      },
      PRO: {
        monthly: process.env.PADDLE_PRICE_PRO_MONTHLY || '',
        yearly: process.env.PADDLE_PRICE_PRO_YEARLY || '',
      },
      BUSINESS: {
        monthly: process.env.PADDLE_PRICE_BUSINESS_MONTHLY || '',
        yearly: process.env.PADDLE_PRICE_BUSINESS_YEARLY || '',
      },
      ENTERPRISE: {
        monthly: process.env.PADDLE_PRICE_ENTERPRISE_MONTHLY || '',
        yearly: process.env.PADDLE_PRICE_ENTERPRISE_YEARLY || '',
      },
    };

    const planPrices = priceIds[planId.toUpperCase()];
    if (!planPrices) {
      throw new Error(`Invalid plan: ${planId}`);
    }

    const priceId = billingCycle === 'yearly' ? planPrices.yearly : planPrices.monthly;
    if (!priceId) {
      throw new Error(`Paddle price not configured for ${planId} (${billingCycle})`);
    }

    return priceId;
  }
}
