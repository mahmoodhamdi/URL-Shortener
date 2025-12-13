import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { verifyCustomDomain, getDomainById } from '@/lib/domains';

interface RouteContext {
  params: { id: string };
}

// POST /api/domains/[id]/verify - Verify a custom domain
export async function POST(
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

    // Verify the domain
    const result = await verifyCustomDomain(params.id, session.user.id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, verified: false },
        { status: 400 }
      );
    }

    // Get the updated domain
    const domain = await getDomainById(params.id, session.user.id);

    return NextResponse.json({
      verified: true,
      message: 'Domain verified successfully! SSL provisioning has started.',
      domain,
    });
  } catch (error) {
    console.error('Verify domain error:', error);
    return NextResponse.json(
      { error: 'Failed to verify domain' },
      { status: 500 }
    );
  }
}
