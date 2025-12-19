/**
 * Payment Gateway Factory
 *
 * This module provides a factory function to get the appropriate payment gateway
 * based on provider name or user's region.
 */

import type { PaymentGateway } from './types';
import { getPreferredGateway } from './types';

// Gateway instances (lazy loaded)
let stripeGateway: PaymentGateway | null = null;
let paymobGateway: PaymentGateway | null = null;
let paytabsGateway: PaymentGateway | null = null;
let paddleGateway: PaymentGateway | null = null;

/**
 * Get a payment gateway by provider name
 */
export async function getPaymentGateway(provider: string): Promise<PaymentGateway> {
  switch (provider.toLowerCase()) {
    case 'stripe':
      if (!stripeGateway) {
        const { StripeGateway } = await import('./providers/stripe');
        stripeGateway = new StripeGateway();
      }
      return stripeGateway;

    case 'paymob':
      if (!paymobGateway) {
        const { PaymobGateway } = await import('./providers/paymob');
        paymobGateway = new PaymobGateway();
      }
      return paymobGateway;

    case 'paytabs':
      if (!paytabsGateway) {
        const { PayTabsGateway } = await import('./providers/paytabs');
        paytabsGateway = new PayTabsGateway();
      }
      return paytabsGateway;

    case 'paddle':
      if (!paddleGateway) {
        const { PaddleGateway } = await import('./providers/paddle');
        paddleGateway = new PaddleGateway();
      }
      return paddleGateway;

    default:
      throw new Error(`Unknown payment provider: ${provider}`);
  }
}

/**
 * Get the best payment gateway for a region
 *
 * @param countryCode - ISO 3166-1 alpha-2 country code
 * @returns The preferred payment gateway for the region
 */
export async function getGatewayForRegion(countryCode: string): Promise<PaymentGateway> {
  const preferredProvider = getPreferredGateway(countryCode);

  try {
    const gateway = await getPaymentGateway(preferredProvider);

    // Check if the gateway is configured
    if (!gateway.isConfigured()) {
      // Fall back to Stripe if preferred gateway is not configured
      console.warn(
        `[Payment] ${preferredProvider} not configured for ${countryCode}, falling back to Stripe`
      );
      return getPaymentGateway('stripe');
    }

    return gateway;
  } catch {
    // Fall back to Stripe on error
    console.warn(
      `[Payment] Error loading ${preferredProvider} for ${countryCode}, falling back to Stripe`
    );
    return getPaymentGateway('stripe');
  }
}

/**
 * Get all configured payment gateways
 */
export async function getConfiguredGateways(): Promise<PaymentGateway[]> {
  const providers = ['stripe', 'paymob', 'paytabs', 'paddle'];
  const gateways: PaymentGateway[] = [];

  for (const provider of providers) {
    try {
      const gateway = await getPaymentGateway(provider);
      if (gateway.isConfigured()) {
        gateways.push(gateway);
      }
    } catch {
      // Skip unconfigured gateways
    }
  }

  return gateways;
}

/**
 * Check if a provider is configured
 */
export async function isProviderConfigured(provider: string): Promise<boolean> {
  try {
    const gateway = await getPaymentGateway(provider);
    return gateway.isConfigured();
  } catch {
    return false;
  }
}

/**
 * Get available payment methods for a region
 */
export function getAvailablePaymentMethods(countryCode: string): string[] {
  const code = countryCode.toUpperCase();

  // Egypt - cards, mobile wallets, kiosk
  if (code === 'EG') {
    return ['card', 'wallet', 'kiosk'];
  }

  // Saudi Arabia - cards, Mada, Apple Pay, Google Pay
  if (code === 'SA') {
    return ['card', 'mada', 'apple_pay', 'google_pay'];
  }

  // Other GCC - cards, Apple Pay, Google Pay
  if (['AE', 'KW', 'BH', 'OM', 'QA'].includes(code)) {
    return ['card', 'apple_pay', 'google_pay'];
  }

  // Europe/Global - cards, Apple Pay, Google Pay
  return ['card', 'apple_pay', 'google_pay'];
}

/**
 * Get preferred payment gateways for a region in order of preference
 */
export function getPreferredGateways(countryCode: string): string[] {
  const code = countryCode.toUpperCase();

  // Egypt - Paymob first, then Stripe
  if (code === 'EG') {
    return ['paymob', 'stripe'];
  }

  // MENA region - PayTabs first, then Paddle, then Stripe
  if (['SA', 'AE', 'KW', 'BH', 'OM', 'QA', 'JO'].includes(code)) {
    return ['paytabs', 'paddle', 'stripe'];
  }

  // Europe - Paddle for VAT compliance, then Stripe
  if (['GB', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'CH', 'SE', 'NO', 'DK', 'FI', 'IE', 'PT', 'PL', 'CZ', 'HU', 'RO', 'BG', 'HR', 'SK', 'SI', 'LT', 'LV', 'EE'].includes(code)) {
    return ['paddle', 'stripe'];
  }

  // Default - Stripe
  return ['stripe', 'paddle'];
}

/**
 * Reset all gateway instances (useful for testing)
 */
export function resetGateways(): void {
  stripeGateway = null;
  paymobGateway = null;
  paytabsGateway = null;
  paddleGateway = null;
}
