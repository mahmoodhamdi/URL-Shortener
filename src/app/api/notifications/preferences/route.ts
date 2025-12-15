/**
 * Notification Preferences API
 *
 * GET /api/notifications/preferences
 * Get user's notification preferences
 *
 * PUT /api/notifications/preferences
 * Update user's notification preferences
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getUserNotificationPreferences,
  updateNotificationPreferences,
} from '@/lib/firebase/tokens';
import { z } from 'zod';

const preferencesSchema = z.object({
  linkClicks: z.boolean().optional(),
  linkMilestones: z.boolean().optional(),
  workspaceUpdates: z.boolean().optional(),
  systemAnnouncements: z.boolean().optional(),
  subscriptionAlerts: z.boolean().optional(),
});

/**
 * Get notification preferences
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const preferences = await getUserNotificationPreferences(session.user.id);

    return NextResponse.json(preferences);
  } catch (error) {
    console.error('[API] Get preferences error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Update notification preferences
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = preferencesSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.errors },
        { status: 400 }
      );
    }

    const success = await updateNotificationPreferences(
      session.user.id,
      validation.data
    );

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update preferences' },
        { status: 500 }
      );
    }

    const preferences = await getUserNotificationPreferences(session.user.id);

    return NextResponse.json({
      success: true,
      preferences,
    });
  } catch (error) {
    console.error('[API] Update preferences error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
