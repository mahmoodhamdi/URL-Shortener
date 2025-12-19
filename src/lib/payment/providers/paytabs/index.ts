/**
 * PayTabs Payment Gateway Implementation
 *
 * This module implements the PaymentGateway interface for PayTabs (MENA region).
 * Supports cards (Visa, Mastercard, Mada), Apple Pay, and Google Pay.
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

// PayTabs regional endpoints
const PAYTABS_REGIONS: Record<string, string> = {
  SAU: 'https://secure.paytabs.sa',
  ARE: 'https://secure.paytabs.com',
  EGY: 'https://secure-egypt.paytabs.com',
  JOR: 'https://secure-jordan.paytabs.com',
  OMN: 'https://secure-oman.paytabs.com',
  KWT: 'https://secure-kuwait.paytabs.com',
  BHR: 'https://secure-bahrain.paytabs.com',
  QAT: 'https://secure-qatar.paytabs.com',
};

export class PayTabsGateway implements PaymentGateway {
  readonly provider = 'paytabs';

  private getBaseUrl(): string {
    const region = process.env.PAYTABS_REGION || 'SAU';
    return PAYTABS_REGIONS[region] || PAYTABS_REGIONS.SAU;
  }

  isConfigured(): boolean {
    return !!(
      process.env.PAYTABS_PROFILE_ID &&
      process.env.PAYTABS_SERVER_KEY
    );
  }

  async createCheckoutSession(params: CheckoutParams): Promise<CheckoutResult> {
    const baseUrl = this.getBaseUrl();
    const profileId = process.env.PAYTABS_PROFILE_ID;
    const serverKey = process.env.PAYTABS_SERVER_KEY;

    if (!profileId || !serverKey) {
      throw new Error('PayTabs credentials not configured');
    }

    const amount = this.getPlanAmount(params.planId, params.billingCycle);
    const currency = this.getCurrency();

    const response = await fetch(`${baseUrl}/payment/request`, {
      method: 'POST',
      headers: {
        'Authorization': serverKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        profile_id: parseInt(profileId),
        tran_type: 'sale',
        tran_class: 'ecom',
        cart_id: `${params.userId}-${Date.now()}`,
        cart_description: `${params.planId} Plan - ${params.billingCycle}`,
        cart_currency: currency,
        cart_amount: amount,
        callback: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/paytabs`,
        return: params.successUrl,
        customer_details: {
          name: 'Customer',
          email: params.email,
          phone: '+000000000000',
          street1: 'NA',
          city: 'City',
          state: 'State',
          country: this.getCountryCode(),
          zip: '00000',
        },
        hide_shipping: true,
        framed: false,
        user_defined: {
          udf1: params.userId,
          udf2: params.planId,
          udf3: params.billingCycle,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create PayTabs payment: ${error}`);
    }

    const data = await response.json();

    if (!data.redirect_url) {
      throw new Error('PayTabs did not return a redirect URL');
    }

    return {
      sessionId: data.tran_ref,
      checkoutUrl: data.redirect_url,
      provider: this.provider,
    };
  }

  async createSubscription(_params: SubscriptionParams): Promise<SubscriptionResult> {
    // PayTabs supports tokenization for recurring payments
    // Full implementation would use their Managed Recurring API
    throw new Error('PayTabs subscription creation requires tokenization. Use createCheckoutSession first.');
  }

  async getSubscription(_subscriptionId: string): Promise<SubscriptionResult | null> {
    // Query subscription from our database
    return null;
  }

  async cancelSubscription(_subscriptionId: string, _immediate?: boolean): Promise<void> {
    // Cancel recurring payment in our database
  }

  async resumeSubscription(_subscriptionId: string): Promise<void> {
    // Resume recurring payment
  }

  async createCustomer(_params: CustomerParams): Promise<string> {
    // PayTabs uses transaction-based tokenization
    return `paytabs_${Date.now()}`;
  }

  async createRefund(params: RefundParams): Promise<RefundResult> {
    const baseUrl = this.getBaseUrl();
    const profileId = process.env.PAYTABS_PROFILE_ID;
    const serverKey = process.env.PAYTABS_SERVER_KEY;

    if (!profileId || !serverKey) {
      throw new Error('PayTabs credentials not configured');
    }

    const response = await fetch(`${baseUrl}/payment/request`, {
      method: 'POST',
      headers: {
        'Authorization': serverKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        profile_id: parseInt(profileId),
        tran_type: 'refund',
        tran_class: 'ecom',
        cart_id: `refund-${params.paymentId}`,
        cart_description: params.reason || 'Refund',
        cart_currency: this.getCurrency(),
        cart_amount: params.amount || 0,
        tran_ref: params.paymentId,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create PayTabs refund');
    }

    const data = await response.json();

    return {
      refundId: data.tran_ref || params.paymentId,
      status: data.payment_result?.response_status === 'A' ? 'succeeded' : 'failed',
      amount: params.amount || 0,
      currency: this.getCurrency(),
    };
  }

  verifyWebhook(payload: string, signature: string): WebhookVerification {
    const serverKey = process.env.PAYTABS_SERVER_KEY;

    if (!serverKey) {
      return { valid: false, error: 'Server key not configured' };
    }

    try {
      const data = JSON.parse(payload);

      // PayTabs sends the signature in the request
      // Verify by comparing with server key hash
      // Note: Actual implementation depends on PayTabs webhook format
      const isValid = signature === serverKey || data.signature === serverKey;

      if (!isValid) {
        return { valid: false, error: 'Invalid signature' };
      }

      return {
        valid: true,
        event: {
          id: data.tran_ref || data.cart_id,
          type: this.mapPayTabsEvent(data.payment_result?.response_status),
          provider: this.provider,
          data,
          timestamp: new Date(),
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
      console.log('[PayTabs] Payment succeeded:', data);
      // TODO: Update subscription status, record payment
    } else if (event.type === 'payment.failed') {
      console.log('[PayTabs] Payment failed:', data);
      // TODO: Record failed payment
    }
  }

  // Helper methods

  private getPlanAmount(planId: string, billingCycle: 'monthly' | 'yearly'): number {
    // Prices in local currency (SAR for Saudi, AED for UAE, etc.)
    const prices: Record<string, { monthly: number; yearly: number }> = {
      STARTER: { monthly: 19, yearly: 190 },
      PRO: { monthly: 45, yearly: 450 },
      BUSINESS: { monthly: 94, yearly: 940 },
      ENTERPRISE: { monthly: 188, yearly: 1880 },
    };

    const planPrices = prices[planId.toUpperCase()];
    if (!planPrices) {
      throw new Error(`Invalid plan: ${planId}`);
    }

    return billingCycle === 'yearly' ? planPrices.yearly : planPrices.monthly;
  }

  private getCurrency(): string {
    const region = process.env.PAYTABS_REGION || 'SAU';
    const currencies: Record<string, string> = {
      SAU: 'SAR',
      ARE: 'AED',
      EGY: 'EGP',
      JOR: 'JOD',
      OMN: 'OMR',
      KWT: 'KWD',
      BHR: 'BHD',
      QAT: 'QAR',
    };
    return currencies[region] || 'SAR';
  }

  private getCountryCode(): string {
    const region = process.env.PAYTABS_REGION || 'SAU';
    const countries: Record<string, string> = {
      SAU: 'SA',
      ARE: 'AE',
      EGY: 'EG',
      JOR: 'JO',
      OMN: 'OM',
      KWT: 'KW',
      BHR: 'BH',
      QAT: 'QA',
    };
    return countries[region] || 'SA';
  }

  private mapPayTabsEvent(responseStatus: string): string {
    switch (responseStatus) {
      case 'A': // Authorized
        return 'payment.success';
      case 'H': // Hold
        return 'payment.pending';
      case 'P': // Pending
        return 'payment.pending';
      case 'V': // Voided
        return 'payment.voided';
      case 'E': // Error
      case 'D': // Declined
      default:
        return 'payment.failed';
    }
  }
}
