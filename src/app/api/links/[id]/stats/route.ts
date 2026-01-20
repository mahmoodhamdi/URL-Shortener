import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getLinkById } from '@/lib/url/shortener';
import { getLinkStats } from '@/lib/analytics/tracker';
import { ApiError } from '@/lib/api/errors';
import type { TimePeriod } from '@/types';

interface RouteContext {
  params: { id: string };
}

export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    // Authentication check
    const session = await auth();
    if (!session?.user?.id) {
      return ApiError.unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const period = (searchParams.get('period') as TimePeriod) || 'all';

    const link = await getLinkById(params.id);

    if (!link) {
      return NextResponse.json(
        { error: 'Link not found' },
        { status: 404 }
      );
    }

    // Authorization check - verify user owns the link
    if (link.userId !== session.user.id) {
      return ApiError.forbidden('You do not have permission to view stats for this link');
    }

    const stats = await getLinkStats(params.id, period);

    return NextResponse.json({
      link,
      stats,
    });
  } catch (error) {
    console.error('Get stats error:', error);
    return ApiError.internal();
  }
}
