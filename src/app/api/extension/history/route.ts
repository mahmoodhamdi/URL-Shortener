import { NextRequest, NextResponse } from 'next/server';
import { validateExtensionToken } from '@/lib/extension';
import { prisma } from '@/lib/db/prisma';

/**
 * GET /api/extension/history
 * Get recent links for the extension
 */
export async function GET(request: NextRequest) {
  try {
    // Validate extension token
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid Authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const authResult = await validateExtensionToken(token);

    if (!authResult.valid || !authResult.user) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = authResult.user.id;

    // Get limit from query params (default 10, max 50)
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const limit = Math.min(parseInt(limitParam || '10', 10) || 10, 50);

    // Get recent links
    const links = await prisma.link.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        _count: {
          select: { clicks: true },
        },
      },
    });

    // Get base URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Format response
    const formattedLinks = links.map((link) => ({
      id: link.id,
      shortCode: link.shortCode,
      customAlias: link.customAlias,
      shortUrl: `${baseUrl}/${link.customAlias || link.shortCode}`,
      originalUrl: link.originalUrl,
      title: link.title,
      clicks: link._count.clicks,
      hasPassword: !!link.password,
      expiresAt: link.expiresAt,
      createdAt: link.createdAt,
    }));

    return NextResponse.json({
      links: formattedLinks,
      count: formattedLinks.length,
    });
  } catch (error) {
    console.error('Error fetching link history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch link history' },
      { status: 500 }
    );
  }
}
