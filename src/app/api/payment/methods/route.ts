/**
 * Payment Methods API
 *
 * GET /api/payment/methods
 *
 * Returns available payment methods and gateways for the user's region.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getAvailablePaymentMethods,
  getPreferredGateways,
  getConfiguredGateways,
} from '@/lib/payment';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get country code from query params or headers
    const { searchParams } = new URL(request.url);
    const countryCode = searchParams.get('country') ||
      request.headers.get('cf-ipcountry') || // Cloudflare
      request.headers.get('x-vercel-ip-country') || // Vercel
      'US'; // Default

    // Get available payment methods for the region
    const paymentMethods = getAvailablePaymentMethods(countryCode);

    // Get preferred gateways for the region
    const preferredGateways = getPreferredGateways(countryCode);

    // Get configured gateways
    const configuredGateways = await getConfiguredGateways();
    const configuredProviders = configuredGateways.map(g => g.provider);

    // Filter preferred gateways to only configured ones
    const availableGateways = preferredGateways.filter(g =>
      configuredProviders.includes(g)
    );

    // Build payment method info
    const methodInfo = paymentMethods.map(method => ({
      id: method,
      name: getPaymentMethodName(method),
      icon: getPaymentMethodIcon(method),
      description: getPaymentMethodDescription(method),
    }));

    return NextResponse.json({
      countryCode,
      paymentMethods: methodInfo,
      availableGateways,
      preferredGateway: availableGateways[0] || 'stripe',
    });
  } catch (error) {
    console.error('[Payment] Methods error:', error);
    return NextResponse.json(
      { error: 'Failed to get payment methods' },
      { status: 500 }
    );
  }
}

function getPaymentMethodName(method: string): string {
  const names: Record<string, string> = {
    card: 'Credit/Debit Card',
    wallet: 'Mobile Wallet',
    kiosk: 'Pay at Kiosk',
    apple_pay: 'Apple Pay',
    google_pay: 'Google Pay',
    mada: 'Mada Card',
    bank_transfer: 'Bank Transfer',
  };
  return names[method] || method;
}

function getPaymentMethodIcon(method: string): string {
  const icons: Record<string, string> = {
    card: '💳',
    wallet: '📱',
    kiosk: '🏪',
    apple_pay: '',
    google_pay: '🔵',
    mada: '💳',
    bank_transfer: '🏦',
  };
  return icons[method] || '💰';
}

function getPaymentMethodDescription(method: string): string {
  const descriptions: Record<string, string> = {
    card: 'Pay securely with Visa, Mastercard, or American Express',
    wallet: 'Pay using Vodafone Cash, Orange Money, or other mobile wallets',
    kiosk: 'Get a reference code and pay at any Aman or Masary kiosk',
    apple_pay: 'Quick and secure payment with Apple Pay',
    google_pay: 'Quick and secure payment with Google Pay',
    mada: 'Pay with your Saudi Mada debit card',
    bank_transfer: 'Pay via bank transfer',
  };
  return descriptions[method] || '';
}
