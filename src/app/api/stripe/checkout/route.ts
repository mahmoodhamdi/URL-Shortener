import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createCheckoutSession } from '@/lib/stripe/subscription';
import { PLANS } from '@/lib/stripe/plans';
import { Plan } from '@/types';
import { z } from 'zod';

const checkoutSchema = z.object({
  plan: z.enum(['STARTER', 'PRO', 'BUSINESS', 'ENTERPRISE'] as const),
  billingPeriod: z.enum(['monthly', 'yearly']).default('monthly'),
});

export async function POST(request: NextRequest) {
  try {
    // Check if Stripe is configured
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        {
          error: 'Stripe not configured',
          message: 'STRIPE_SECRET_KEY environment variable is not set. Please configure Stripe to enable payments.',
          code: 'STRIPE_NOT_CONFIGURED'
        },
        { status: 400 }
      );
    }

    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to upgrade your plan.' },
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

    const { plan, billingPeriod } = validation.data;
    const planConfig = PLANS[plan as Plan];

    const priceId = billingPeriod === 'yearly'
      ? planConfig.stripePriceIdYearly
      : planConfig.stripePriceIdMonthly;

    if (!priceId) {
      const envVarName = billingPeriod === 'yearly'
        ? `STRIPE_${plan}_YEARLY_PRICE_ID`
        : `STRIPE_${plan}_MONTHLY_PRICE_ID`;
      return NextResponse.json(
        {
          error: 'Price not configured',
          message: `Stripe price ID not configured for ${plan} plan (${billingPeriod}). Please set the ${envVarName} environment variable.`,
          code: 'PRICE_NOT_CONFIGURED'
        },
        { status: 400 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const checkoutSession = await createCheckoutSession({
      userId: session.user.id,
      priceId,
      successUrl: `${appUrl}/dashboard?upgrade=success`,
      cancelUrl: `${appUrl}/pricing?upgrade=canceled`,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
