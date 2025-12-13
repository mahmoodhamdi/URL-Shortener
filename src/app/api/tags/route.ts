import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';

const createTagSchema = z.object({
  name: z.string().min(1).max(30),
});

// GET /api/tags - List all tags used by the current user
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get tags that are connected to user's links
    const tags = await prisma.tag.findMany({
      where: {
        links: {
          some: {
            userId: session.user.id,
          },
        },
      },
      include: {
        _count: {
          select: { links: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(tags);
  } catch (error) {
    console.error('Get tags error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tags' },
      { status: 500 }
    );
  }
}

// POST /api/tags - Create a new tag
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = createTagSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { name } = validation.data;
    const normalizedName = name.toLowerCase().trim();

    // Check if tag already exists
    let tag = await prisma.tag.findUnique({
      where: { name: normalizedName },
    });

    if (!tag) {
      tag = await prisma.tag.create({
        data: { name: normalizedName },
      });
    }

    return NextResponse.json(tag, { status: 201 });
  } catch (error) {
    console.error('Create tag error:', error);
    return NextResponse.json(
      { error: 'Failed to create tag' },
      { status: 500 }
    );
  }
}
