import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';

/**
 * GET /api/zapier/triggers/new-links - Polling trigger for new links
 * Returns recently created links for Zapier polling
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 100);
    const since = searchParams.get('since'); // ISO date string

    // Build query conditions
    const whereConditions: Record<string, unknown> = {
      userId: session.user.id,
    };

    if (since) {
      whereConditions.createdAt = {
        gt: new Date(since),
      };
    }

    // Get recent links
    const links = await prisma.link.findMany({
      where: whereConditions,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    // Build response
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const results = links.map((link) => ({
      id: link.id,
      shortCode: link.shortCode,
      shortUrl: `${baseUrl}/${link.customAlias || link.shortCode}`,
      originalUrl: link.originalUrl,
      title: link.title,
      customAlias: link.customAlias,
      isActive: link.isActive,
      createdAt: link.createdAt.toISOString(),
    }));

    return NextResponse.json(results);
  } catch (error) {
    console.error('Error fetching new links for Zapier:', error);
    return NextResponse.json(
      { error: 'Failed to fetch links' },
      { status: 500 }
    );
  }
}
