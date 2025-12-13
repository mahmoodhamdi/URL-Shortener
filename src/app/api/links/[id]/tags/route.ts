import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';

const updateTagsSchema = z.object({
  tags: z.array(z.string().min(1).max(30)),
});

// GET /api/links/[id]/tags - Get tags for a link
export async function GET(
  _request: NextRequest,
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

    const link = await prisma.link.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      include: {
        tags: true,
      },
    });

    if (!link) {
      return NextResponse.json(
        { error: 'Link not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(link.tags);
  } catch (error) {
    console.error('Get link tags error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tags' },
      { status: 500 }
    );
  }
}

// PUT /api/links/[id]/tags - Update tags for a link
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
    const validation = updateTagsSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { tags } = validation.data;

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

    // Create or connect tags
    const normalizedTags = tags.map((t) => t.toLowerCase().trim());

    // First, ensure all tags exist
    for (const tagName of normalizedTags) {
      await prisma.tag.upsert({
        where: { name: tagName },
        create: { name: tagName },
        update: {},
      });
    }

    // Update link with new tags
    const updatedLink = await prisma.link.update({
      where: { id: params.id },
      data: {
        tags: {
          set: normalizedTags.map((name) => ({ name })),
        },
      },
      include: {
        tags: true,
      },
    });

    return NextResponse.json(updatedLink.tags);
  } catch (error) {
    console.error('Update link tags error:', error);
    return NextResponse.json(
      { error: 'Failed to update tags' },
      { status: 500 }
    );
  }
}
