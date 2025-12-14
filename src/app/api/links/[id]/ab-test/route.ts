import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import {
  createABTest,
  getABTestByLinkId,
  updateABTest,
  deleteABTest,
  canCreateABTest,
  canAddVariant,
} from '@/lib/ab-testing';
import { Plan } from '@/types';

interface RouteContext {
  params: { id: string };
}

// GET /api/links/[id]/ab-test - Get A/B test for a link
export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify link ownership
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

    const test = await getABTestByLinkId(params.id);

    if (!test) {
      return NextResponse.json(
        { error: 'No A/B test found for this link' },
        { status: 404 }
      );
    }

    return NextResponse.json(test);
  } catch (error) {
    console.error('Error fetching A/B test:', error);
    return NextResponse.json(
      { error: 'Failed to fetch A/B test' },
      { status: 500 }
    );
  }
}

// POST /api/links/[id]/ab-test - Create A/B test for a link
export async function POST(
  request: NextRequest,
  { params }: RouteContext
) {
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

    // Check if user can create A/B tests
    const canCreate = await canCreateABTest(session.user.id, plan);
    if (!canCreate.allowed) {
      return NextResponse.json(
        { error: canCreate.reason },
        { status: 403 }
      );
    }

    // Verify link ownership
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

    // Check if A/B test already exists
    const existingTest = await getABTestByLinkId(params.id);
    if (existingTest) {
      return NextResponse.json(
        { error: 'A/B test already exists for this link' },
        { status: 409 }
      );
    }

    const body = await request.json();
    const { name, variants } = body;

    // Validate variants
    if (!variants || !Array.isArray(variants) || variants.length < 2) {
      return NextResponse.json(
        { error: 'At least 2 variants are required' },
        { status: 400 }
      );
    }

    // Check variant limit
    const variantCheck = canAddVariant(variants.length, plan);
    if (!variantCheck.allowed) {
      return NextResponse.json(
        { error: variantCheck.reason },
        { status: 403 }
      );
    }

    // Validate each variant
    for (const variant of variants) {
      if (!variant.name || !variant.url) {
        return NextResponse.json(
          { error: 'Each variant must have a name and URL' },
          { status: 400 }
        );
      }
      if (typeof variant.weight !== 'number' || variant.weight < 1 || variant.weight > 100) {
        return NextResponse.json(
          { error: 'Variant weight must be between 1 and 100' },
          { status: 400 }
        );
      }
    }

    const test = await createABTest({
      linkId: params.id,
      name,
      variants,
    });

    return NextResponse.json(test, { status: 201 });
  } catch (error) {
    console.error('Error creating A/B test:', error);
    return NextResponse.json(
      { error: 'Failed to create A/B test' },
      { status: 500 }
    );
  }
}

// PUT /api/links/[id]/ab-test - Update A/B test
export async function PUT(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify link ownership
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

    const existingTest = await getABTestByLinkId(params.id);
    if (!existingTest) {
      return NextResponse.json(
        { error: 'A/B test not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name, isActive } = body;

    const test = await updateABTest(existingTest.id, { name, isActive });

    return NextResponse.json(test);
  } catch (error) {
    console.error('Error updating A/B test:', error);
    return NextResponse.json(
      { error: 'Failed to update A/B test' },
      { status: 500 }
    );
  }
}

// DELETE /api/links/[id]/ab-test - Delete A/B test
export async function DELETE(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify link ownership
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

    const existingTest = await getABTestByLinkId(params.id);
    if (!existingTest) {
      return NextResponse.json(
        { error: 'A/B test not found' },
        { status: 404 }
      );
    }

    await deleteABTest(existingTest.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting A/B test:', error);
    return NextResponse.json(
      { error: 'Failed to delete A/B test' },
      { status: 500 }
    );
  }
}
