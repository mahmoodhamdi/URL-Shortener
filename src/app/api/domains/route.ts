import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { z } from 'zod';
import {
  createCustomDomain,
  getUserDomains,
  isValidDomain,
  isDomainAvailable,
  normalizeDomain,
  getDomainSetupInstructions,
} from '@/lib/domains';
import { checkDomainLimit } from '@/lib/limits/checker';

const createDomainSchema = z.object({
  domain: z.string().min(1, 'Domain is required'),
});

// GET /api/domains - List all custom domains for the current user
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const domains = await getUserDomains(session.user.id);

    return NextResponse.json(domains);
  } catch (error) {
    console.error('Get domains error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch domains' },
      { status: 500 }
    );
  }
}

// POST /api/domains - Add a new custom domain
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
    const validation = createDomainSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { domain } = validation.data;
    const normalizedDomain = normalizeDomain(domain);

    // Validate domain format
    if (!isValidDomain(normalizedDomain)) {
      return NextResponse.json(
        { error: 'Invalid domain format' },
        { status: 400 }
      );
    }

    // Check domain limits based on subscription
    const limitCheck = await checkDomainLimit(session.user.id);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        { error: limitCheck.message },
        { status: 403 }
      );
    }

    // Check if domain is available
    const available = await isDomainAvailable(normalizedDomain);
    if (!available) {
      return NextResponse.json(
        { error: 'This domain is already registered' },
        { status: 409 }
      );
    }

    // Create the custom domain
    const result = await createCustomDomain(session.user.id, normalizedDomain);

    // Get setup instructions
    const instructions = getDomainSetupInstructions(
      result.domain,
      result.verifyToken
    );

    return NextResponse.json(
      {
        ...result,
        instructions,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create domain error:', error);
    return NextResponse.json(
      { error: 'Failed to create domain' },
      { status: 500 }
    );
  }
}
