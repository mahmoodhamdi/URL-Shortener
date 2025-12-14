import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

import { prisma } from '@/lib/db/prisma';

/**
 * GET /api/zapier/triggers/link-clicks - Polling trigger for link clicks
 * Returns recent clicks for Zapier polling
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 100);
    const since = searchParams.get('since'); // ISO date string
    const linkId = searchParams.get('linkId'); // Optional filter by link

    // Build query conditions
    const whereConditions: Record<string, unknown> = {
      link: {
        userId: session.user.id,
      },
    };

    if (since) {
      whereConditions.clickedAt = {
        gt: new Date(since),
      };
    }

    if (linkId) {
      whereConditions.linkId = linkId;
    }

    // Get recent clicks
    const clicks = await prisma.click.findMany({
      where: whereConditions,
      take: limit,
      orderBy: { clickedAt: 'desc' },
      include: {
        link: {
          select: {
            shortCode: true,
            customAlias: true,
            originalUrl: true,
          },
        },
      },
    });

    // Build response
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const results = clicks.map((click) => ({
      id: click.id,
      linkId: click.linkId,
      shortCode: click.link.shortCode,
      shortUrl: `${baseUrl}/${click.link.customAlias || click.link.shortCode}`,
      originalUrl: click.link.originalUrl,
      clickedAt: click.clickedAt.toISOString(),
      country: click.country,
      city: click.city,
      device: click.device,
      browser: click.browser,
      os: click.os,
      referrer: click.referrer,
    }));

    return NextResponse.json(results);
  } catch (error) {
    console.error('Error fetching link clicks for Zapier:', error);
    return NextResponse.json(
      { error: 'Failed to fetch clicks' },
      { status: 500 }
    );
  }
}
