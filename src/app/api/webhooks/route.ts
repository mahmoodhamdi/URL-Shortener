import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { ApiError } from '@/lib/api/errors';
import {
  createWebhook,
  getUserWebhooks,
  checkWebhookLimits,
  isValidWebhookEvent,
  ALL_WEBHOOK_EVENTS,
} from '@/lib/webhooks';
import { validateUrl } from '@/lib/url/validator';
import { validateWebhookUrl } from '@/lib/security/ssrf';
import type { WebhookEvent } from '@/lib/webhooks/events';

/**
 * GET /api/webhooks
 * List all webhooks for the authenticated user
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return ApiError.unauthorized();
    }

    const webhooks = await getUserWebhooks(session.user.id);

    return NextResponse.json(webhooks);
  } catch (error) {
    console.error('Error fetching webhooks:', error);
    return ApiError.internal('Failed to fetch webhooks');
  }
}

/**
 * POST /api/webhooks
 * Create a new webhook
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return ApiError.unauthorized();
    }

    // Check webhook limits
    const limitCheck = await checkWebhookLimits(session.user.id);
    if (!limitCheck.allowed) {
      return ApiError.planLimitReached(limitCheck.message || 'Webhook limit reached');
    }

    const body = await request.json();
    const { name, url, events } = body;

    // Validate name
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return ApiError.validationError('Webhook name is required', { field: 'name' });
    }

    if (name.length > 100) {
      return ApiError.validationError('Webhook name must be less than 100 characters', { field: 'name' });
    }

    // Validate URL
    if (!url || typeof url !== 'string') {
      return ApiError.validationError('Webhook URL is required', { field: 'url' });
    }

    // Must be HTTPS in production
    if (!url.startsWith('https://') && process.env.NODE_ENV === 'production') {
      return ApiError.validationError('Webhook URL must use HTTPS', { field: 'url' });
    }

    const urlValidation = validateUrl(url);
    if (!urlValidation.isValid) {
      return ApiError.invalidUrl(urlValidation.error || 'Invalid webhook URL');
    }

    // SSRF protection - validate URL doesn't point to internal resources
    const ssrfValidation = validateWebhookUrl(url);
    if (!ssrfValidation.safe) {
      return ApiError.validationError(ssrfValidation.reason || 'Webhook URL is not allowed', { field: 'url' });
    }

    // Validate events
    if (!events || !Array.isArray(events) || events.length === 0) {
      return ApiError.validationError('At least one event must be selected', { field: 'events' });
    }

    const validatedEvents: WebhookEvent[] = [];
    for (const event of events) {
      if (!isValidWebhookEvent(event)) {
        // Don't reveal valid events to prevent enumeration
        return ApiError.validationError('Invalid event type specified', { field: 'events' });
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
    return ApiError.internal('Failed to create webhook');
  }
}
