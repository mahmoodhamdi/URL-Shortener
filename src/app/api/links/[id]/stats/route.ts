import { NextRequest, NextResponse } from 'next/server';
import { getLinkById } from '@/lib/url/shortener';
import { getLinkStats } from '@/lib/analytics/tracker';
import type { TimePeriod } from '@/types';

interface RouteContext {
  params: { id: string };
}

export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { searchParams } = new URL(request.url);
    const period = (searchParams.get('period') as TimePeriod) || 'all';

    const link = await getLinkById(params.id);

    if (!link) {
      return NextResponse.json(
        { error: 'Link not found' },
        { status: 404 }
      );
    }

    const stats = await getLinkStats(params.id, period);

    return NextResponse.json({
      link,
      stats,
    });
  } catch (error) {
    console.error('Get stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
