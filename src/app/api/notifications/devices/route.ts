/**
 * Registered Devices API
 *
 * GET /api/notifications/devices
 * Get user's registered notification devices
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUserFCMTokenDetails } from '@/lib/firebase/tokens';

/**
 * Get registered devices
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const devices = await getUserFCMTokenDetails(session.user.id);

    return NextResponse.json({
      devices: devices.map((d) => ({
        id: d.id,
        deviceType: d.deviceType,
        deviceName: d.deviceName,
        lastUsedAt: d.lastUsedAt,
        createdAt: d.createdAt,
      })),
    });
  } catch (error) {
    console.error('[API] Get devices error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
