/**
 * Unified Payment Gateway Types
 *
 * This module defines the common interfaces for all payment providers.
 * Each provider (Stripe, Paymob, PayTabs, Paddle) implements these interfaces.
 */

// Re-export types from main types file
export type {
  PaymentProvider,
  PaymentStatus,
  PaymentMethod,
  Payment,
  CreatePaymentInput,
  PaymentResult,
} from '@/types';

/**
 * Checkout session parameters
 */
export interface CheckoutParams {
  userId: string;
  email: string;
  planId: string;
  billingCycle: 'monthly' | 'yearly';
  paymentMethod?: string;
  successUrl: string;
  cancelUrl: string;
  currency?: string;
  locale?: 'en' | 'ar';
  metadata?: Record<string, string>;
}

/**
 * Checkout session result
 */
export interface CheckoutResult {
  sessionId: string;
  checkoutUrl: string;
  provider: string;
  expiresAt?: Date;
}

/**
 * Subscription parameters
 */
export interface SubscriptionParams {
  userId: string;
  email: string;
  planId: string;
  billingCycle: 'monthly' | 'yearly';
  paymentMethodId?: string;
  trialDays?: number;
  metadata?: Record<string, string>;
}

/**
 * Subscription result
 */
export interface SubscriptionResult {
  subscriptionId: string;
  customerId: string;
  status: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
}

/**
 * Customer parameters
 */
export interface CustomerParams {
  userId: string;
  email: string;
  name?: string;
  phone?: string;
  metadata?: Record<string, string>;
}

/**
 * Refund parameters
 */
export interface RefundParams {
  paymentId: string;
  amount?: number; // Partial refund if specified
  reason?: string;
}

/**
 * Refund result
 */
export interface RefundResult {
  refundId: string;
  status: string;
  amount: number;
  currency: string;
}

/**
 * Webhook event
 */
export interface WebhookEvent {
  id: string;
  type: string;
  provider: string;
  data: Record<string, unknown>;
  timestamp: Date;
}

/**
 * Webhook verification result
 */
export interface WebhookVerification {
  valid: boolean;
  event?: WebhookEvent;
  error?: string;
}

/**
 * Payment Gateway Interface
 *
 * All payment providers must implement this interface.
 */
export interface PaymentGateway {
  /**
   * Provider name
   */
  readonly provider: string;

  /**
   * Check if the gateway is properly configured
   */
  isConfigured(): boolean;

  /**
   * Create a checkout session for subscription
   */
  createCheckoutSession(params: CheckoutParams): Promise<CheckoutResult>;

  /**
   * Create a subscription directly (if payment method is already saved)
   */
  createSubscription(params: SubscriptionParams): Promise<SubscriptionResult>;

  /**
   * Get subscription details
   */
  getSubscription(subscriptionId: string): Promise<SubscriptionResult | null>;

  /**
   * Cancel a subscription
   */
  cancelSubscription(subscriptionId: string, immediate?: boolean): Promise<void>;

  /**
   * Resume a canceled subscription
   */
  resumeSubscription(subscriptionId: string): Promise<void>;

  /**
   * Create or get a customer
   */
  createCustomer(params: CustomerParams): Promise<string>;

  /**
   * Create a refund
   */
  createRefund(params: RefundParams): Promise<RefundResult>;

  /**
   * Verify webhook signature and parse event
   */
  verifyWebhook(payload: string, signature: string): WebhookVerification;

  /**
   * Handle a webhook event
   */
  handleWebhook(event: WebhookEvent): Promise<void>;
}

/**
 * Paymob-specific types
 */
export interface PaymobOrderParams {
  amountCents: number;
  currency: string;
  orderId: string;
  items?: PaymobItem[];
}

export interface PaymobItem {
  name: string;
  amount_cents: number;
  description?: string;
  quantity: number;
}

export interface PaymobPaymentKeyParams {
  orderId: number;
  amountCents: number;
  currency: string;
  integrationId: string;
  billingData: PaymobBillingData;
  lockOrderWhenPaid?: boolean;
}

export interface PaymobBillingData {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  street?: string;
  building?: string;
  floor?: string;
  apartment?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
}

export interface PaymobWalletParams {
  paymentKey: string;
  phoneNumber: string;
}

export interface PaymobKioskResult {
  billReference: string;
  expiresAt: Date;
  amountEgp: number;
}

export interface PaymobWebhookPayload {
  type: string;
  obj: {
    id: number;
    pending: boolean;
    amount_cents: number;
    success: boolean;
    is_auth: boolean;
    is_capture: boolean;
    is_standalone_payment: boolean;
    is_voided: boolean;
    is_refunded: boolean;
    is_3d_secure: boolean;
    integration_id: number;
    has_parent_transaction: boolean;
    order: {
      id: number;
    };
    created_at: string;
    currency: string;
    error_occured: boolean;
    owner: number;
    source_data: {
      pan: string;
      type: string;
      sub_type: string;
    };
  };
}

/**
 * PayTabs-specific types
 */
export interface PayTabsPaymentParams {
  cartId: string;
  cartDescription: string;
  amount: number;
  currency: string;
  customer: PayTabsCustomer;
  callbackUrl: string;
  returnUrl: string;
  framed?: boolean;
  hideShipping?: boolean;
}

export interface PayTabsCustomer {
  name: string;
  email: string;
  phone: string;
  street1?: string;
  city?: string;
  state?: string;
  country?: string;
  zip?: string;
}

export interface PayTabsPaymentResult {
  tranRef: string;
  cartId: string;
  redirectUrl: string;
}

/**
 * Paddle-specific types
 */
export interface PaddleCheckoutParams {
  priceId: string;
  customerId?: string;
  email: string;
  successUrl: string;
  metadata?: Record<string, string>;
}

export interface PaddleSubscriptionParams {
  customerId: string;
  priceId: string;
  paymentMethodId?: string;
}

/**
 * Currency configuration
 */
export interface CurrencyConfig {
  code: string;
  symbol: string;
  name: string;
  decimals: number;
  smallestUnit: number; // e.g., 100 for cents, 1 for JPY
}

export const CURRENCIES: Record<string, CurrencyConfig> = {
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', decimals: 2, smallestUnit: 100 },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', decimals: 2, smallestUnit: 100 },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound', decimals: 2, smallestUnit: 100 },
  EGP: { code: 'EGP', symbol: 'E£', name: 'Egyptian Pound', decimals: 2, smallestUnit: 100 },
  SAR: { code: 'SAR', symbol: 'SR', name: 'Saudi Riyal', decimals: 2, smallestUnit: 100 },
  AED: { code: 'AED', symbol: 'AED', name: 'UAE Dirham', decimals: 2, smallestUnit: 100 },
  KWD: { code: 'KWD', symbol: 'KD', name: 'Kuwaiti Dinar', decimals: 3, smallestUnit: 1000 },
  BHD: { code: 'BHD', symbol: 'BD', name: 'Bahraini Dinar', decimals: 3, smallestUnit: 1000 },
  OMR: { code: 'OMR', symbol: 'OMR', name: 'Omani Rial', decimals: 3, smallestUnit: 1000 },
  QAR: { code: 'QAR', symbol: 'QR', name: 'Qatari Riyal', decimals: 2, smallestUnit: 100 },
  JOD: { code: 'JOD', symbol: 'JD', name: 'Jordanian Dinar', decimals: 3, smallestUnit: 1000 },
};

/**
 * Convert amount to smallest currency unit
 */
export function toSmallestUnit(amount: number, currency: string): number {
  const config = CURRENCIES[currency] || CURRENCIES.USD;
  return Math.round(amount * config.smallestUnit);
}

/**
 * Convert amount from smallest currency unit
 */
export function fromSmallestUnit(amount: number, currency: string): number {
  const config = CURRENCIES[currency] || CURRENCIES.USD;
  return amount / config.smallestUnit;
}

/**
 * Format currency amount for display
 */
export function formatCurrency(amount: number, currency: string): string {
  const config = CURRENCIES[currency] || CURRENCIES.USD;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: config.code,
    minimumFractionDigits: config.decimals,
    maximumFractionDigits: config.decimals,
  }).format(amount);
}

/**
 * Region to gateway mapping
 */
export const REGION_GATEWAY_MAP: Record<string, string[]> = {
  // Egypt - Paymob first (local wallets support), then Stripe
  EG: ['paymob', 'stripe'],

  // Saudi Arabia - PayTabs first (Mada support), then Stripe
  SA: ['paytabs', 'stripe'],

  // UAE - PayTabs first, then Stripe
  AE: ['paytabs', 'stripe'],

  // Other GCC/MENA - PayTabs then Stripe
  KW: ['paytabs', 'stripe'],
  BH: ['paytabs', 'stripe'],
  OM: ['paytabs', 'stripe'],
  QA: ['paytabs', 'stripe'],
  JO: ['paytabs', 'stripe'],

  // Europe - Paddle (handles VAT), then Stripe
  GB: ['paddle', 'stripe'],
  DE: ['paddle', 'stripe'],
  FR: ['paddle', 'stripe'],
  IT: ['paddle', 'stripe'],
  ES: ['paddle', 'stripe'],
  NL: ['paddle', 'stripe'],
  BE: ['paddle', 'stripe'],
  AT: ['paddle', 'stripe'],
  CH: ['paddle', 'stripe'],
  SE: ['paddle', 'stripe'],
  NO: ['paddle', 'stripe'],
  DK: ['paddle', 'stripe'],
  FI: ['paddle', 'stripe'],
  IE: ['paddle', 'stripe'],
  PT: ['paddle', 'stripe'],
  PL: ['paddle', 'stripe'],
  CZ: ['paddle', 'stripe'],

  // Default - Stripe globally
  DEFAULT: ['stripe', 'paddle'],
};

/**
 * Get preferred gateways for a region
 */
export function getPreferredGateways(countryCode: string): string[] {
  return REGION_GATEWAY_MAP[countryCode.toUpperCase()] || REGION_GATEWAY_MAP.DEFAULT;
}

/**
 * Get the primary preferred gateway for a region
 */
export function getPreferredGateway(countryCode: string): string {
  const gateways = getPreferredGateways(countryCode);
  return gateways[0];
}
