import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

import { prisma } from '@/lib/db/prisma';

/**
 * GET /api/zapier/search/bio-page - Search for bio pages
 * Supports searching by slug or title
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const title = searchParams.get('title');
    const query = searchParams.get('query'); // General search

    // Build search conditions
    const conditions: Record<string, unknown>[] = [];

    if (slug) {
      conditions.push({ slug: { contains: slug, mode: 'insensitive' } });
    }

    if (title) {
      conditions.push({ title: { contains: title, mode: 'insensitive' } });
    }

    if (query) {
      conditions.push(
        { slug: { contains: query, mode: 'insensitive' } },
        { title: { contains: query, mode: 'insensitive' } },
        { bio: { contains: query, mode: 'insensitive' } }
      );
    }

    // Find bio pages
    const bioPages = await prisma.bioPage.findMany({
      where: {
        userId: session.user.id,
        ...(conditions.length > 0 ? { OR: conditions } : {}),
      },
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { links: true },
        },
      },
    });

    // Build response
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const results = bioPages.map((page) => ({
      id: page.id,
      slug: page.slug,
      url: `${baseUrl}/bio/${page.slug}`,
      title: page.title,
      bio: page.bio,
      avatar: page.avatar,
      theme: page.theme,
      isActive: page.isActive,
      views: page.views,
      linksCount: page._count.links,
      createdAt: page.createdAt.toISOString(),
    }));

    return NextResponse.json(results);
  } catch (error) {
    console.error('Error searching bio pages:', error);
    return NextResponse.json(
      { error: 'Failed to search bio pages' },
      { status: 500 }
    );
  }
}
