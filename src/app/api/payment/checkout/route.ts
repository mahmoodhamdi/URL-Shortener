/**
 * Unified Payment Checkout API
 *
 * POST /api/payment/checkout
 *
 * Creates a checkout session with the appropriate payment gateway
 * based on user's region or preference.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getGatewayForRegion, getPaymentGateway } from '@/lib/payment';
import { z } from 'zod';

const checkoutSchema = z.object({
  planId: z.enum(['STARTER', 'PRO', 'BUSINESS', 'ENTERPRISE']),
  billingCycle: z.enum(['monthly', 'yearly']).default('monthly'),
  countryCode: z.string().length(2).optional(), // ISO 3166-1 alpha-2
  provider: z.enum(['stripe', 'paymob', 'paytabs', 'paddle']).optional(),
  paymentMethod: z.string().optional(), // card, wallet, kiosk, etc.
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to continue.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = checkoutSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { planId, billingCycle, countryCode, provider, paymentMethod } = validation.data;

    // Get the appropriate gateway
    let gateway;
    if (provider) {
      // User explicitly selected a provider
      gateway = await getPaymentGateway(provider);
    } else if (countryCode) {
      // Auto-select based on region
      gateway = await getGatewayForRegion(countryCode);
    } else {
      // Default to Stripe
      gateway = await getPaymentGateway('stripe');
    }

    // Check if gateway is configured
    if (!gateway.isConfigured()) {
      return NextResponse.json(
        {
          error: 'Payment not available',
          message: `${gateway.provider} payment gateway is not configured. Please contact support.`,
          code: 'GATEWAY_NOT_CONFIGURED',
        },
        { status: 400 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Create checkout session
    const result = await gateway.createCheckoutSession({
      userId: session.user.id,
      email: session.user.email,
      planId,
      billingCycle,
      paymentMethod,
      successUrl: `${appUrl}/dashboard?payment=success&provider=${gateway.provider}`,
      cancelUrl: `${appUrl}/pricing?payment=cancelled`,
      locale: 'en', // TODO: Get from user preferences
      metadata: {
        planId,
        billingCycle,
      },
    });

    return NextResponse.json({
      success: true,
      provider: gateway.provider,
      sessionId: result.sessionId,
      checkoutUrl: result.checkoutUrl,
      expiresAt: result.expiresAt,
    });
  } catch (error) {
    console.error('[Payment] Checkout error:', error);
    return NextResponse.json(
      {
        error: 'Checkout failed',
        message: error instanceof Error ? error.message : 'Failed to create checkout session',
      },
      { status: 500 }
    );
  }
}
