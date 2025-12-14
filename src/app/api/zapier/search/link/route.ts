import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';

/**
 * GET /api/zapier/search/link - Search for links
 * Supports searching by shortCode, customAlias, or originalUrl
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const shortCode = searchParams.get('shortCode');
    const customAlias = searchParams.get('customAlias');
    const url = searchParams.get('url');
    const query = searchParams.get('query'); // General search

    // Build search conditions
    const conditions: Record<string, unknown>[] = [];

    if (shortCode) {
      conditions.push({ shortCode: { contains: shortCode, mode: 'insensitive' } });
    }

    if (customAlias) {
      conditions.push({ customAlias: { contains: customAlias, mode: 'insensitive' } });
    }

    if (url) {
      conditions.push({ originalUrl: { contains: url, mode: 'insensitive' } });
    }

    if (query) {
      conditions.push(
        { shortCode: { contains: query, mode: 'insensitive' } },
        { customAlias: { contains: query, mode: 'insensitive' } },
        { originalUrl: { contains: query, mode: 'insensitive' } },
        { title: { contains: query, mode: 'insensitive' } }
      );
    }

    // Find links
    const links = await prisma.link.findMany({
      where: {
        userId: session.user.id,
        ...(conditions.length > 0 ? { OR: conditions } : {}),
      },
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { clicks: true },
        },
      },
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
      clicks: link._count.clicks,
      createdAt: link.createdAt.toISOString(),
    }));

    return NextResponse.json(results);
  } catch (error) {
    console.error('Error searching links:', error);
    return NextResponse.json(
      { error: 'Failed to search links' },
      { status: 500 }
    );
  }
}
