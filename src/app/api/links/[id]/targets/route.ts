import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import {
  checkTargetingLimit,
  createLinkTarget,
  getLinkTargets,
} from '@/lib/targeting';
import { isValidTargetValue, normalizeTargetValue } from '@/lib/targeting/matcher';
import { validateUrl } from '@/lib/url/validator';
import type { TargetType } from '@/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/links/[id]/targets
 * List all targets for a link
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify link ownership
    const link = await prisma.link.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!link) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 });
    }

    if (link.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get targets
    const targets = await getLinkTargets(id);

    return NextResponse.json(targets);
  } catch (error) {
    console.error('Error fetching targets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch targets' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/links/[id]/targets
 * Create a new target for a link
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify link ownership
    const link = await prisma.link.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!link) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 });
    }

    if (link.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check targeting limits
    const limitCheck = await checkTargetingLimit(session.user.id, id);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        { error: limitCheck.message },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { type, value, targetUrl, priority, isActive } = body;

    // Validate type
    const validTypes: TargetType[] = ['DEVICE', 'OS', 'BROWSER', 'COUNTRY', 'LANGUAGE'];
    if (!type || !validTypes.includes(type)) {
      return NextResponse.json(
        { error: 'Invalid target type' },
        { status: 400 }
      );
    }

    // Validate value
    if (!value || !isValidTargetValue(type, value)) {
      return NextResponse.json(
        { error: 'Invalid target value for this type' },
        { status: 400 }
      );
    }

    // Validate target URL
    if (!targetUrl) {
      return NextResponse.json(
        { error: 'Target URL is required' },
        { status: 400 }
      );
    }

    const urlValidation = validateUrl(targetUrl);
    if (!urlValidation.isValid) {
      return NextResponse.json(
        { error: urlValidation.error || 'Invalid target URL' },
        { status: 400 }
      );
    }

    // Normalize value
    const normalizedValue = normalizeTargetValue(type, value);

    // Check for duplicate
    const existing = await prisma.linkTarget.findUnique({
      where: {
        linkId_type_value: {
          linkId: id,
          type,
          value: normalizedValue,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'A target with this type and value already exists' },
        { status: 409 }
      );
    }

    // Create target
    const target = await createLinkTarget(id, {
      type,
      value: normalizedValue,
      targetUrl,
      priority: priority ?? 0,
      isActive: isActive ?? true,
    });

    return NextResponse.json(target, { status: 201 });
  } catch (error) {
    console.error('Error creating target:', error);
    return NextResponse.json(
      { error: 'Failed to create target' },
      { status: 500 }
    );
  }
}
