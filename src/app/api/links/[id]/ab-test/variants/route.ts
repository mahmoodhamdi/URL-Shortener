import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import {
  getABTestByLinkId,
  addVariant,
  updateVariant,
  deleteVariant,
  canAddVariant,
} from '@/lib/ab-testing';
import { Plan } from '@/types';

interface RouteContext {
  params: { id: string };
}

// GET /api/links/[id]/ab-test/variants - Get all variants
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
        { error: 'A/B test not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(test.variants);
  } catch (error) {
    console.error('Error fetching variants:', error);
    return NextResponse.json(
      { error: 'Failed to fetch variants' },
      { status: 500 }
    );
  }
}

// POST /api/links/[id]/ab-test/variants - Add a variant
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
        { error: 'A/B test not found' },
        { status: 404 }
      );
    }

    // Check variant limit
    const canAdd = canAddVariant(test.variants.length + 1, plan);
    if (!canAdd.allowed) {
      return NextResponse.json(
        { error: canAdd.reason },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, url, weight } = body;

    // Validate input
    if (!name || !url) {
      return NextResponse.json(
        { error: 'Name and URL are required' },
        { status: 400 }
      );
    }

    if (typeof weight !== 'number' || weight < 1 || weight > 100) {
      return NextResponse.json(
        { error: 'Weight must be between 1 and 100' },
        { status: 400 }
      );
    }

    const variant = await addVariant(test.id, { name, url, weight });

    return NextResponse.json(variant, { status: 201 });
  } catch (error) {
    console.error('Error adding variant:', error);
    return NextResponse.json(
      { error: 'Failed to add variant' },
      { status: 500 }
    );
  }
}

// PUT /api/links/[id]/ab-test/variants - Update a variant
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

    const test = await getABTestByLinkId(params.id);
    if (!test) {
      return NextResponse.json(
        { error: 'A/B test not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { variantId, name, url, weight } = body;

    if (!variantId) {
      return NextResponse.json(
        { error: 'Variant ID is required' },
        { status: 400 }
      );
    }

    // Verify variant belongs to this test
    const variantExists = test.variants.some(v => v.id === variantId);
    if (!variantExists) {
      return NextResponse.json(
        { error: 'Variant not found' },
        { status: 404 }
      );
    }

    // Validate weight if provided
    if (weight !== undefined && (typeof weight !== 'number' || weight < 1 || weight > 100)) {
      return NextResponse.json(
        { error: 'Weight must be between 1 and 100' },
        { status: 400 }
      );
    }

    const variant = await updateVariant(variantId, { name, url, weight });

    return NextResponse.json(variant);
  } catch (error) {
    console.error('Error updating variant:', error);
    return NextResponse.json(
      { error: 'Failed to update variant' },
      { status: 500 }
    );
  }
}

// DELETE /api/links/[id]/ab-test/variants - Delete a variant
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

    const test = await getABTestByLinkId(params.id);
    if (!test) {
      return NextResponse.json(
        { error: 'A/B test not found' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const variantId = searchParams.get('variantId');

    if (!variantId) {
      return NextResponse.json(
        { error: 'Variant ID is required' },
        { status: 400 }
      );
    }

    // Verify variant belongs to this test
    const variantExists = test.variants.some(v => v.id === variantId);
    if (!variantExists) {
      return NextResponse.json(
        { error: 'Variant not found' },
        { status: 404 }
      );
    }

    await deleteVariant(variantId);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message.includes('at least 2 variants')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    console.error('Error deleting variant:', error);
    return NextResponse.json(
      { error: 'Failed to delete variant' },
      { status: 500 }
    );
  }
}
