import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  createWebhook,
  getUserWebhooks,
  checkWebhookLimits,
  isValidWebhookEvent,
  ALL_WEBHOOK_EVENTS,
} from '@/lib/webhooks';
import { validateUrl } from '@/lib/url/validator';
import type { WebhookEvent } from '@/lib/webhooks/events';

/**
 * GET /api/webhooks
 * List all webhooks for the authenticated user
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const webhooks = await getUserWebhooks(session.user.id);

    return NextResponse.json(webhooks);
  } catch (error) {
    console.error('Error fetching webhooks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch webhooks' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/webhooks
 * Create a new webhook
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check webhook limits
    const limitCheck = await checkWebhookLimits(session.user.id);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        { error: limitCheck.message },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, url, events } = body;

    // Validate name
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Webhook name is required' },
        { status: 400 }
      );
    }

    if (name.length > 100) {
      return NextResponse.json(
        { error: 'Webhook name must be less than 100 characters' },
        { status: 400 }
      );
    }

    // Validate URL
    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'Webhook URL is required' },
        { status: 400 }
      );
    }

    // Must be HTTPS in production
    if (!url.startsWith('https://') && process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Webhook URL must use HTTPS' },
        { status: 400 }
      );
    }

    const urlValidation = validateUrl(url);
    if (!urlValidation.isValid) {
      return NextResponse.json(
        { error: urlValidation.error || 'Invalid webhook URL' },
        { status: 400 }
      );
    }

    // Validate events
    if (!events || !Array.isArray(events) || events.length === 0) {
      return NextResponse.json(
        { error: 'At least one event must be selected' },
        { status: 400 }
      );
    }

    const validatedEvents: WebhookEvent[] = [];
    for (const event of events) {
      if (!isValidWebhookEvent(event)) {
        return NextResponse.json(
          { error: `Invalid event: ${event}. Valid events: ${ALL_WEBHOOK_EVENTS.join(', ')}` },
          { status: 400 }
        );
      }
      validatedEvents.push(event);
    }

    const webhook = await createWebhook(session.user.id, {
      name: name.trim(),
      url,
      events: validatedEvents,
    });

    return NextResponse.json(webhook, { status: 201 });
  } catch (error) {
    console.error('Error creating webhook:', error);
    return NextResponse.json(
      { error: 'Failed to create webhook' },
      { status: 500 }
    );
  }
}
