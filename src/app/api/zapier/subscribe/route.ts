import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

import { prisma } from '@/lib/db/prisma';
import {
  canCreateSubscription,
  createSubscription,
  deleteSubscription,
  isZapierAvailable,
  listSubscriptions,
  subscriptionExists,
  validateWebhookUrl,
} from '@/lib/zapier';
import type { Plan, ZapierEvent } from '@prisma/client';

/**
 * GET /api/zapier/subscribe - List user's Zapier subscriptions
 */
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const subscriptions = await listSubscriptions(session.user.id);

    return NextResponse.json(subscriptions);
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscriptions' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/zapier/subscribe - Subscribe to events (Zapier REST Hook)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's plan
    const subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
      select: { plan: true },
    });

    const plan = (subscription?.plan || 'FREE') as Plan;

    // Check if feature is available
    if (!isZapierAvailable(plan)) {
      return NextResponse.json(
        { error: 'Zapier integration is not available on your plan. Please upgrade.' },
        { status: 403 }
      );
    }

    // Check limit
    const canCreate = await canCreateSubscription(session.user.id, plan);
    if (!canCreate.allowed) {
      return NextResponse.json(
        { error: canCreate.reason },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { hookUrl, event } = body;

    // Validate input
    if (!hookUrl || !event) {
      return NextResponse.json(
        { error: 'hookUrl and event are required' },
        { status: 400 }
      );
    }

    // Validate webhook URL
    const urlValidation = validateWebhookUrl(hookUrl);
    if (!urlValidation.valid) {
      return NextResponse.json(
        { error: urlValidation.error },
        { status: 400 }
      );
    }

    // Validate event type
    const validEvents: ZapierEvent[] = [
      'LINK_CREATED',
      'LINK_CLICKED',
      'LINK_EXPIRED',
      'LINK_DELETED',
      'BIO_PAGE_CREATED',
      'BIO_PAGE_UPDATED',
    ];

    if (!validEvents.includes(event)) {
      return NextResponse.json(
        { error: `Invalid event type. Must be one of: ${validEvents.join(', ')}` },
        { status: 400 }
      );
    }

    // Check if subscription already exists
    const exists = await subscriptionExists(session.user.id, hookUrl, event);
    if (exists) {
      return NextResponse.json(
        { error: 'Subscription already exists for this webhook and event' },
        { status: 409 }
      );
    }

    const newSubscription = await createSubscription(session.user.id, hookUrl, event);

    return NextResponse.json(newSubscription, { status: 201 });
  } catch (error) {
    console.error('Error creating subscription:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create subscription' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/zapier/subscribe - Unsubscribe from events (Zapier REST Hook)
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const subscriptionId = searchParams.get('id');

    if (!subscriptionId) {
      return NextResponse.json(
        { error: 'Subscription ID is required' },
        { status: 400 }
      );
    }

    const result = await deleteSubscription(subscriptionId, session.user.id);

    if (result.count === 0) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting subscription:', error);
    return NextResponse.json(
      { error: 'Failed to delete subscription' },
      { status: 500 }
    );
  }
}
