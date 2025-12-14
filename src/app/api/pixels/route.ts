import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import {
  canCreatePixel,
  createPixel,
  getUserPixels,
  isPixelsAvailable,
  validatePixelId,
} from '@/lib/retargeting';
import type { Plan } from '@prisma/client';

/**
 * GET /api/pixels - List user's retargeting pixels
 */
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const pixels = await getUserPixels(session.user.id);

    return NextResponse.json(pixels);
  } catch (error) {
    console.error('Error fetching pixels:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pixels' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/pixels - Create new retargeting pixel
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

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
    const canCreate = await canCreatePixel(session.user.id, plan);
    if (!canCreate.allowed) {
      return NextResponse.json(
        { error: canCreate.reason },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, type, pixelId } = body;

    // Validate input
    if (!name || !type || !pixelId) {
      return NextResponse.json(
        { error: 'Name, type, and pixelId are required' },
        { status: 400 }
      );
    }

    // Validate pixel ID format
    const validation = validatePixelId(type, pixelId);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const pixel = await createPixel(session.user.id, {
      name,
      type,
      pixelId,
    });

    return NextResponse.json(pixel, { status: 201 });
  } catch (error) {
    console.error('Error creating pixel:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create pixel' },
      { status: 500 }
    );
  }
}
