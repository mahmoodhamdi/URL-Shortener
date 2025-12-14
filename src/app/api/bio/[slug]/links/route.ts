import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import {
  addBioLink,
  updateBioLink,
  deleteBioLink,
  reorderBioLinks,
  canAddBioLink,
  incrementBioLinkClicks,
} from '@/lib/bio-page';
import { Plan } from '@/types';

interface RouteContext {
  params: { slug: string };
}

// GET /api/bio/[slug]/links - Get all links for a bio page
export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const bioPage = await prisma.bioPage.findUnique({
      where: { slug: params.slug },
      include: {
        links: {
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!bioPage) {
      return NextResponse.json(
        { error: 'Bio page not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(bioPage.links);
  } catch (error) {
    console.error('Error fetching bio links:', error);
    return NextResponse.json(
      { error: 'Failed to fetch links' },
      { status: 500 }
    );
  }
}

// POST /api/bio/[slug]/links - Add a new link
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

    // Get bio page and verify ownership
    const bioPage = await prisma.bioPage.findFirst({
      where: {
        slug: params.slug,
        userId: session.user.id,
      },
      include: {
        _count: {
          select: { links: true },
        },
      },
    });

    if (!bioPage) {
      return NextResponse.json(
        { error: 'Bio page not found' },
        { status: 404 }
      );
    }

    // Get user's plan
    const subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
    });
    const plan: Plan = subscription?.plan || 'FREE';

    // Check if user can add more links
    const canAdd = canAddBioLink(bioPage._count.links, plan);
    if (!canAdd.allowed) {
      return NextResponse.json(
        { error: canAdd.reason },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, url, icon, thumbnail, position } = body;

    // Validate required fields
    if (!title || !url) {
      return NextResponse.json(
        { error: 'Title and URL are required' },
        { status: 400 }
      );
    }

    const link = await addBioLink(bioPage.id, {
      title,
      url,
      icon,
      thumbnail,
      position,
    });

    return NextResponse.json(link, { status: 201 });
  } catch (error) {
    console.error('Error adding bio link:', error);
    return NextResponse.json(
      { error: 'Failed to add link' },
      { status: 500 }
    );
  }
}

// PUT /api/bio/[slug]/links - Update a link or reorder links
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

    // Get bio page and verify ownership
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

    // Handle reordering
    if (body.reorder && Array.isArray(body.linkIds)) {
      await reorderBioLinks(bioPage.id, body.linkIds);
      return NextResponse.json({ success: true });
    }

    // Handle single link update
    const { linkId, title, url, icon, thumbnail, position, isActive } = body;

    if (!linkId) {
      return NextResponse.json(
        { error: 'Link ID is required' },
        { status: 400 }
      );
    }

    // Verify link belongs to this bio page
    const link = await prisma.bioLink.findFirst({
      where: {
        id: linkId,
        bioPageId: bioPage.id,
      },
    });

    if (!link) {
      return NextResponse.json(
        { error: 'Link not found' },
        { status: 404 }
      );
    }

    const updated = await updateBioLink(linkId, {
      title,
      url,
      icon,
      thumbnail,
      position,
      isActive,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating bio link:', error);
    return NextResponse.json(
      { error: 'Failed to update link' },
      { status: 500 }
    );
  }
}

// DELETE /api/bio/[slug]/links - Delete a link
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

    // Get bio page and verify ownership
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

    const { searchParams } = new URL(request.url);
    const linkId = searchParams.get('linkId');

    if (!linkId) {
      return NextResponse.json(
        { error: 'Link ID is required' },
        { status: 400 }
      );
    }

    // Verify link belongs to this bio page
    const link = await prisma.bioLink.findFirst({
      where: {
        id: linkId,
        bioPageId: bioPage.id,
      },
    });

    if (!link) {
      return NextResponse.json(
        { error: 'Link not found' },
        { status: 404 }
      );
    }

    await deleteBioLink(linkId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting bio link:', error);
    return NextResponse.json(
      { error: 'Failed to delete link' },
      { status: 500 }
    );
  }
}

// PATCH /api/bio/[slug]/links - Track link click
export async function PATCH(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const body = await request.json();
    const { linkId } = body;

    if (!linkId) {
      return NextResponse.json(
        { error: 'Link ID is required' },
        { status: 400 }
      );
    }

    // Verify link exists
    const link = await prisma.bioLink.findUnique({
      where: { id: linkId },
      include: {
        bioPage: {
          select: { slug: true },
        },
      },
    });

    if (!link || link.bioPage.slug !== params.slug) {
      return NextResponse.json(
        { error: 'Link not found' },
        { status: 404 }
      );
    }

    // Increment click count
    await incrementBioLinkClicks(linkId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error tracking link click:', error);
    return NextResponse.json(
      { error: 'Failed to track click' },
      { status: 500 }
    );
  }
}
