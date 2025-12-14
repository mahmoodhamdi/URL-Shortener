import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { updateLinkTarget, deleteLinkTarget } from '@/lib/targeting';
import { validateUrl } from '@/lib/url/validator';

interface RouteParams {
  params: Promise<{ id: string; targetId: string }>;
}

/**
 * GET /api/links/[id]/targets/[targetId]
 * Get a specific target
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, targetId } = await params;

    // Verify link ownership
    const link = await prisma.link.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!link) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 });
    }

    if (link.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get target
    const target = await prisma.linkTarget.findUnique({
      where: { id: targetId },
    });

    if (!target || target.linkId !== id) {
      return NextResponse.json({ error: 'Target not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: target.id,
      type: target.type,
      value: target.value,
      targetUrl: target.targetUrl,
      priority: target.priority,
      isActive: target.isActive,
    });
  } catch (error) {
    console.error('Error fetching target:', error);
    return NextResponse.json(
      { error: 'Failed to fetch target' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/links/[id]/targets/[targetId]
 * Update a target
 */
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, targetId } = await params;

    // Verify link ownership
    const link = await prisma.link.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!link) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 });
    }

    if (link.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify target exists and belongs to this link
    const existingTarget = await prisma.linkTarget.findUnique({
      where: { id: targetId },
    });

    if (!existingTarget || existingTarget.linkId !== id) {
      return NextResponse.json({ error: 'Target not found' }, { status: 404 });
    }

    // Parse request body
    const body = await request.json();
    const { targetUrl, priority, isActive } = body;

    // Validate target URL if provided
    if (targetUrl !== undefined) {
      const urlValidation = validateUrl(targetUrl);
      if (!urlValidation.isValid) {
        return NextResponse.json(
          { error: urlValidation.error || 'Invalid target URL' },
          { status: 400 }
        );
      }
    }

    // Update target
    const target = await updateLinkTarget(targetId, {
      targetUrl,
      priority,
      isActive,
    });

    return NextResponse.json(target);
  } catch (error) {
    console.error('Error updating target:', error);
    return NextResponse.json(
      { error: 'Failed to update target' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/links/[id]/targets/[targetId]
 * Delete a target
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, targetId } = await params;

    // Verify link ownership
    const link = await prisma.link.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!link) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 });
    }

    if (link.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify target exists and belongs to this link
    const existingTarget = await prisma.linkTarget.findUnique({
      where: { id: targetId },
    });

    if (!existingTarget || existingTarget.linkId !== id) {
      return NextResponse.json({ error: 'Target not found' }, { status: 404 });
    }

    // Delete target
    await deleteLinkTarget(targetId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting target:', error);
    return NextResponse.json(
      { error: 'Failed to delete target' },
      { status: 500 }
    );
  }
}
