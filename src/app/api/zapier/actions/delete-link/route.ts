import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

import { prisma } from '@/lib/db/prisma';
import { dispatchZapierEvent } from '@/lib/zapier';

/**
 * DELETE /api/zapier/actions/delete-link - Delete a link via Zapier
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const shortCode = searchParams.get('shortCode');

    // Require either id or shortCode
    if (!id && !shortCode) {
      return NextResponse.json(
        { error: 'Either id or shortCode is required' },
        { status: 400 }
      );
    }

    // Find the link
    const link = await prisma.link.findFirst({
      where: {
        ...(id ? { id } : { shortCode: shortCode! }),
        userId: session.user.id,
      },
    });

    if (!link) {
      return NextResponse.json(
        { error: 'Link not found' },
        { status: 404 }
      );
    }

    // Delete the link
    await prisma.link.delete({
      where: { id: link.id },
    });

    // Dispatch Zapier event
    await dispatchZapierEvent(session.user.id, 'LINK_DELETED', {
      id: link.id,
      shortCode: link.shortCode,
      originalUrl: link.originalUrl,
      deletedAt: new Date().toISOString(),
      userId: session.user.id,
    });

    return NextResponse.json({
      success: true,
      deletedLink: {
        id: link.id,
        shortCode: link.shortCode,
        originalUrl: link.originalUrl,
      },
    });
  } catch (error) {
    console.error('Error deleting link via Zapier:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete link' },
      { status: 500 }
    );
  }
}
