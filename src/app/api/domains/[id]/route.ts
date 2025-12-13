import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDomainById, deleteCustomDomain, getDomainSetupInstructions } from '@/lib/domains';

interface RouteContext {
  params: { id: string };
}

// GET /api/domains/[id] - Get a single custom domain
export async function GET(
  _request: NextRequest,
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

    const domain = await getDomainById(params.id, session.user.id);

    if (!domain) {
      return NextResponse.json(
        { error: 'Domain not found' },
        { status: 404 }
      );
    }

    // Include setup instructions if not verified
    const instructions = !domain.verified && domain.verifyToken
      ? getDomainSetupInstructions(domain.domain, domain.verifyToken)
      : null;

    return NextResponse.json({
      ...domain,
      instructions,
    });
  } catch (error) {
    console.error('Get domain error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch domain' },
      { status: 500 }
    );
  }
}

// DELETE /api/domains/[id] - Delete a custom domain
export async function DELETE(
  _request: NextRequest,
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

    const deleted = await deleteCustomDomain(params.id, session.user.id);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Domain not found' },
        { status: 404 }
      );
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Delete domain error:', error);
    return NextResponse.json(
      { error: 'Failed to delete domain' },
      { status: 500 }
    );
  }
}
