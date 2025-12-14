import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getPixelById, updatePixel, deletePixel } from '@/lib/retargeting';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/pixels/[id] - Get pixel details
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const pixel = await getPixelById(id, session.user.id);

    if (!pixel) {
      return NextResponse.json({ error: 'Pixel not found' }, { status: 404 });
    }

    return NextResponse.json(pixel);
  } catch (error) {
    console.error('Error fetching pixel:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pixel' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/pixels/[id] - Update pixel
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, pixelId, isActive } = body;

    const pixel = await updatePixel(id, session.user.id, {
      name,
      pixelId,
      isActive,
    });

    return NextResponse.json(pixel);
  } catch (error) {
    console.error('Error updating pixel:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update pixel' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/pixels/[id] - Delete pixel
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await deletePixel(id, session.user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting pixel:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete pixel' },
      { status: 500 }
    );
  }
}
