import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';

const updateFolderSchema = z.object({
  folderId: z.string().nullable(),
});

// PUT /api/links/[id]/folder - Move a link to a folder
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = updateFolderSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { folderId } = validation.data;

    // Check link exists and belongs to user
    const link = await prisma.link.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!link) {
      return NextResponse.json(
        { error: 'Link not found' },
        { status: 404 }
      );
    }

    // If folderId is provided, verify folder belongs to user
    if (folderId) {
      const folder = await prisma.folder.findFirst({
        where: {
          id: folderId,
          userId: session.user.id,
        },
      });

      if (!folder) {
        return NextResponse.json(
          { error: 'Folder not found' },
          { status: 404 }
        );
      }
    }

    // Update link's folder
    const updatedLink = await prisma.link.update({
      where: { id: params.id },
      data: { folderId },
      include: {
        folder: true,
        _count: {
          select: { clicks: true },
        },
      },
    });

    return NextResponse.json(updatedLink);
  } catch (error) {
    console.error('Update link folder error:', error);
    return NextResponse.json(
      { error: 'Failed to update link folder' },
      { status: 500 }
    );
  }
}
