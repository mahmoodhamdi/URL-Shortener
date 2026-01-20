import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';
import {
  checkTargetingLimit,
  createLinkTarget,
  getLinkTargets,
} from '@/lib/targeting';
import { isValidTargetValue, normalizeTargetValue } from '@/lib/targeting/matcher';
import { validateUrl } from '@/lib/url/validator';
import type { TargetType } from '@/types';

// Validation schema for creating a target
const createTargetSchema = z.object({
  type: z.enum(['DEVICE', 'OS', 'BROWSER', 'COUNTRY', 'LANGUAGE']),
  value: z.string().min(1).max(50),
  targetUrl: z.string().url({ message: 'Invalid target URL' }),
  priority: z.number().int().min(0).max(100).optional().default(0),
  isActive: z.boolean().optional().default(true),
});

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

    // Parse and validate request body with Zod
    const body = await request.json();
    const validation = createTargetSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { type, value, targetUrl, priority, isActive } = validation.data;

    // Validate value matches the type
    if (!isValidTargetValue(type, value)) {
      return NextResponse.json(
        { error: 'Invalid target value for this type' },
        { status: 400 }
      );
    }

    // Additional URL validation
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
