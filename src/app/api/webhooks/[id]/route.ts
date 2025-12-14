import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import {
  getWebhookById,
  updateWebhook,
  deleteWebhook,
  regenerateWebhookSecret,
  isValidWebhookEvent,
  ALL_WEBHOOK_EVENTS,
} from '@/lib/webhooks';
import { validateUrl } from '@/lib/url/validator';
import type { WebhookEvent } from '@/lib/webhooks/events';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/webhooks/[id]
 * Get webhook details
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const webhook = await prisma.webhook.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!webhook) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
    }

    if (webhook.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const webhookData = await getWebhookById(id);

    return NextResponse.json(webhookData);
  } catch (error) {
    console.error('Error fetching webhook:', error);
    return NextResponse.json(
      { error: 'Failed to fetch webhook' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/webhooks/[id]
 * Update webhook
 */
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const webhook = await prisma.webhook.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!webhook) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
    }

    if (webhook.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, url, events, isActive, regenerateSecret } = body;

    // Handle secret regeneration
    if (regenerateSecret === true) {
      const result = await regenerateWebhookSecret(id);
      return NextResponse.json({ secret: result.secret });
    }

    const updateData: {
      name?: string;
      url?: string;
      events?: WebhookEvent[];
      isActive?: boolean;
    } = {};

    // Validate name
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json(
          { error: 'Webhook name cannot be empty' },
          { status: 400 }
        );
      }
      if (name.length > 100) {
        return NextResponse.json(
          { error: 'Webhook name must be less than 100 characters' },
          { status: 400 }
        );
      }
      updateData.name = name.trim();
    }

    // Validate URL
    if (url !== undefined) {
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
      updateData.url = url;
    }

    // Validate events
    if (events !== undefined) {
      if (!Array.isArray(events) || events.length === 0) {
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
      updateData.events = validatedEvents;
    }

    // Validate isActive
    if (isActive !== undefined) {
      updateData.isActive = Boolean(isActive);
    }

    const updatedWebhook = await updateWebhook(id, updateData);

    return NextResponse.json(updatedWebhook);
  } catch (error) {
    console.error('Error updating webhook:', error);
    return NextResponse.json(
      { error: 'Failed to update webhook' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/webhooks/[id]
 * Delete webhook
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const webhook = await prisma.webhook.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!webhook) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
    }

    if (webhook.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await deleteWebhook(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting webhook:', error);
    return NextResponse.json(
      { error: 'Failed to delete webhook' },
      { status: 500 }
    );
  }
}
