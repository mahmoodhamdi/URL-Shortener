import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUserSubscription, getPlanConfig } from '@/lib/stripe/subscription';

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const subscription = await getUserSubscription(session.user.id);
    const planConfig = getPlanConfig(subscription.plan);

    return NextResponse.json({
      subscription: {
        id: subscription.id,
        plan: subscription.plan,
        status: subscription.status,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        linksUsedThisMonth: subscription.linksUsedThisMonth,
      },
      limits: planConfig.limits,
      features: planConfig.features,
    });
  } catch (error) {
    console.error('Subscription fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription' },
      { status: 500 }
    );
  }
}
