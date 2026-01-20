import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';
import {
  createBioPage,
  getUserBioPages,
  canCreateBioPage,
  isValidSlug,
  isSlugAvailable,
} from '@/lib/bio-page';
import { Plan } from '@/types';

// Validation schema for bio page creation
const createBioPageSchema = z.object({
  slug: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_-]+$/, {
    message: 'Slug must contain only alphanumeric characters, hyphens, or underscores',
  }),
  title: z.string().min(1).max(100),
  bio: z.string().max(500).optional(),
  avatar: z.string().url().optional(),
  theme: z.enum(['DEFAULT', 'DARK', 'LIGHT', 'GRADIENT', 'MINIMAL', 'COLORFUL']).optional(),
  socialLinks: z.record(z.string().url()).optional(),
});

// GET /api/bio - List user's bio pages
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const bioPages = await getUserBioPages(session.user.id);

    return NextResponse.json(bioPages);
  } catch (error) {
    console.error('Error fetching bio pages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bio pages' },
      { status: 500 }
    );
  }
}

// POST /api/bio - Create a new bio page
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's plan
    const subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
    });
    const plan: Plan = subscription?.plan || 'FREE';

    // Check if user can create more bio pages
    const canCreate = await canCreateBioPage(session.user.id, plan);
    if (!canCreate.allowed) {
      return NextResponse.json(
        { error: canCreate.reason },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validate with Zod schema
    const validation = createBioPageSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { slug, title, bio, avatar, theme, socialLinks } = validation.data;

    // Validate slug format with additional checks
    if (!isValidSlug(slug)) {
      return NextResponse.json(
        { error: 'Invalid slug format. Use 3-30 alphanumeric characters, hyphens, or underscores.' },
        { status: 400 }
      );
    }

    // Check slug availability
    const available = await isSlugAvailable(slug);
    if (!available) {
      return NextResponse.json(
        { error: 'This slug is already taken' },
        { status: 409 }
      );
    }

    const bioPage = await createBioPage(session.user.id, {
      slug,
      title,
      bio,
      avatar,
      theme,
      socialLinks,
    });

    return NextResponse.json(bioPage, { status: 201 });
  } catch (error) {
    console.error('Error creating bio page:', error);
    return NextResponse.json(
      { error: 'Failed to create bio page' },
      { status: 500 }
    );
  }
}
