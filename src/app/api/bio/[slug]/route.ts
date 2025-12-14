import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import {
  getBioPageBySlug,
  updateBioPage,
  updateBioPageSlug,
  deleteBioPage,
  incrementBioPageViews,
  getBioPageStats,
  isValidSlug,
  isSlugAvailable,
} from '@/lib/bio-page';

interface RouteContext {
  params: { slug: string };
}

// GET /api/bio/[slug] - Get a bio page by slug
export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const bioPage = await getBioPageBySlug(params.slug);

    if (!bioPage) {
      return NextResponse.json(
        { error: 'Bio page not found' },
        { status: 404 }
      );
    }

    // Check if requesting stats
    const { searchParams } = new URL(request.url);
    const includeStats = searchParams.get('stats') === 'true';

    if (includeStats) {
      const session = await auth();

      // Only owner can see stats
      if (session?.user?.id === bioPage.userId) {
        const stats = await getBioPageStats(bioPage.id);
        return NextResponse.json({ ...bioPage, stats });
      }
    }

    // Increment view count for public requests
    const session = await auth();
    if (!session?.user?.id || session.user.id !== bioPage.userId) {
      // Track view asynchronously
      incrementBioPageViews(bioPage.id).catch(console.error);
    }

    return NextResponse.json(bioPage);
  } catch (error) {
    console.error('Error fetching bio page:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bio page' },
      { status: 500 }
    );
  }
}

// PUT /api/bio/[slug] - Update a bio page
export async function PUT(
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

    // Get the bio page and verify ownership
    const bioPage = await prisma.bioPage.findFirst({
      where: {
        slug: params.slug,
        userId: session.user.id,
      },
    });

    if (!bioPage) {
      return NextResponse.json(
        { error: 'Bio page not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { slug, title, bio, avatar, theme, customCss, socialLinks, isActive } = body;

    // If slug is being changed
    if (slug && slug !== bioPage.slug) {
      if (!isValidSlug(slug)) {
        return NextResponse.json(
          { error: 'Invalid slug format' },
          { status: 400 }
        );
      }

      const available = await isSlugAvailable(slug);
      if (!available) {
        return NextResponse.json(
          { error: 'This slug is already taken' },
          { status: 409 }
        );
      }

      await updateBioPageSlug(bioPage.id, slug);
    }

    const updated = await updateBioPage(bioPage.id, {
      title,
      bio,
      avatar,
      theme,
      customCss,
      socialLinks,
      isActive,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating bio page:', error);
    return NextResponse.json(
      { error: 'Failed to update bio page' },
      { status: 500 }
    );
  }
}

// DELETE /api/bio/[slug] - Delete a bio page
export async function DELETE(
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

    // Get the bio page and verify ownership
    const bioPage = await prisma.bioPage.findFirst({
      where: {
        slug: params.slug,
        userId: session.user.id,
      },
    });

    if (!bioPage) {
      return NextResponse.json(
        { error: 'Bio page not found' },
        { status: 404 }
      );
    }

    await deleteBioPage(bioPage.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting bio page:', error);
    return NextResponse.json(
      { error: 'Failed to delete bio page' },
      { status: 500 }
    );
  }
}
