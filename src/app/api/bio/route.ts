import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import {
  createBioPage,
  getUserBioPages,
  canCreateBioPage,
  isValidSlug,
  isSlugAvailable,
} from '@/lib/bio-page';
import { Plan } from '@/types';

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
    const { slug, title, bio, avatar, theme, socialLinks } = body;

    // Validate required fields
    if (!slug || !title) {
      return NextResponse.json(
        { error: 'Slug and title are required' },
        { status: 400 }
      );
    }

    // Validate slug format
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
