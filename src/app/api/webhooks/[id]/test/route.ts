import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

import { prisma } from '@/lib/db/prisma';
import { sendTestWebhook } from '@/lib/webhooks';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/webhooks/[id]/test
 * Send a test webhook
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get webhook with secret
    const webhook = await prisma.webhook.findUnique({
      where: { id },
      select: {
        userId: true,
        url: true,
        secret: true,
        isActive: true,
      },
    });

    if (!webhook) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
    }

    if (webhook.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Send test webhook
    const result = await sendTestWebhook(webhook.url, webhook.secret);

    return NextResponse.json({
      success: result.success,
      statusCode: result.statusCode,
      duration: result.duration,
      error: result.error,
    });
  } catch (error) {
    console.error('Error sending test webhook:', error);
    return NextResponse.json(
      { error: 'Failed to send test webhook' },
      { status: 500 }
    );
  }
}
