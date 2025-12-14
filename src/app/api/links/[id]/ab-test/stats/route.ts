import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import {
  getABTestByLinkId,
  getTestStatistics,
  resetTestStatistics,
} from '@/lib/ab-testing';

interface RouteContext {
  params: { id: string };
}

// GET /api/links/[id]/ab-test/stats - Get A/B test statistics
export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify link ownership
    const link = await prisma.link.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!link) {
      return NextResponse.json(
        { error: 'Link not found' },
        { status: 404 }
      );
    }

    const test = await getABTestByLinkId(params.id);
    if (!test) {
      return NextResponse.json(
        { error: 'A/B test not found' },
        { status: 404 }
      );
    }

    const stats = await getTestStatistics(test.id);

    if (!stats) {
      return NextResponse.json(
        { error: 'Failed to calculate statistics' },
        { status: 500 }
      );
    }

    // Add test metadata
    return NextResponse.json({
      test: {
        id: test.id,
        name: test.name,
        isActive: test.isActive,
        startedAt: test.startedAt,
        endedAt: test.endedAt,
      },
      ...stats,
    });
  } catch (error) {
    console.error('Error fetching A/B test stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}

// POST /api/links/[id]/ab-test/stats - Reset statistics
export async function POST(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify link ownership
    const link = await prisma.link.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!link) {
      return NextResponse.json(
        { error: 'Link not found' },
        { status: 404 }
      );
    }

    const test = await getABTestByLinkId(params.id);
    if (!test) {
      return NextResponse.json(
        { error: 'A/B test not found' },
        { status: 404 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { action } = body;

    if (action === 'reset') {
      await resetTestStatistics(test.id);
      return NextResponse.json({ success: true, message: 'Statistics reset successfully' });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use action: "reset" to reset statistics.' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error resetting A/B test stats:', error);
    return NextResponse.json(
      { error: 'Failed to reset statistics' },
      { status: 500 }
    );
  }
}
