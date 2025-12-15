/**
 * FCM Token Registration API
 *
 * POST /api/notifications/register
 * Register an FCM token for push notifications
 *
 * DELETE /api/notifications/register
 * Remove an FCM token
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { registerFCMToken, removeFCMToken } from '@/lib/firebase/tokens';
import { z } from 'zod';

const registerSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  deviceType: z.enum(['web', 'android', 'ios']).default('web'),
  deviceName: z.string().optional(),
});

const removeSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

/**
 * Register FCM token
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = registerSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { token, deviceType, deviceName } = validation.data;

    const result = await registerFCMToken(session.user.id, token, deviceType, deviceName);

    if (!result) {
      return NextResponse.json(
        { error: 'Failed to register token' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      tokenId: result.id,
    });
  } catch (error) {
    console.error('[API] FCM registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Remove FCM token
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = removeSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { token } = validation.data;

    const success = await removeFCMToken(token);

    return NextResponse.json({ success });
  } catch (error) {
    console.error('[API] FCM removal error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
