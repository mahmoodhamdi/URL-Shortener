import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';
import {
  addPixelToLink,
  removePixelFromLink,
  canAddPixelToLink,
  isPixelsAvailable,
} from '@/lib/retargeting';
import type { Plan } from '@prisma/client';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/links/[id]/pixels - List pixels attached to a link
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: linkId } = await params;

    // Verify link ownership
    const link = await prisma.link.findFirst({
      where: { id: linkId, userId: session.user.id },
      include: {
        pixels: {
          include: {
            pixel: true,
          },
        },
      },
    });

    if (!link) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 });
    }

    return NextResponse.json(link.pixels.map((lp) => lp.pixel));
  } catch (error) {
    console.error('Error fetching link pixels:', error);
    return NextResponse.json(
      { error: 'Failed to fetch link pixels' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/links/[id]/pixels - Add pixel to link
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's plan
    const subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
      select: { plan: true },
    });

    const plan = (subscription?.plan || 'FREE') as Plan;

    // Check if feature is available
    if (!isPixelsAvailable(plan)) {
      return NextResponse.json(
        { error: 'Retargeting pixels are not available on your plan. Please upgrade.' },
        { status: 403 }
      );
    }

    // Check limit
    const canAdd = await canAddPixelToLink(session.user.id, plan);
    if (!canAdd.allowed) {
      return NextResponse.json(
        { error: canAdd.reason },
        { status: 403 }
      );
    }

    const { id: linkId } = await params;
    const body = await request.json();
    const { pixelId } = body;

    if (!pixelId) {
      return NextResponse.json(
        { error: 'pixelId is required' },
        { status: 400 }
      );
    }

    const linkPixel = await addPixelToLink(linkId, pixelId, session.user.id);

    return NextResponse.json(linkPixel, { status: 201 });
  } catch (error) {
    console.error('Error adding pixel to link:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to add pixel to link' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/links/[id]/pixels - Remove pixel from link
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: linkId } = await params;
    const { searchParams } = new URL(request.url);
    const pixelId = searchParams.get('pixelId');

    if (!pixelId) {
      return NextResponse.json(
        { error: 'pixelId query parameter is required' },
        { status: 400 }
      );
    }

    await removePixelFromLink(linkId, pixelId, session.user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing pixel from link:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to remove pixel from link' },
      { status: 500 }
    );
  }
}
