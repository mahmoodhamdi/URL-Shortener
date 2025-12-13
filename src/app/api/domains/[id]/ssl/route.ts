import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDomainById, checkDomainHealth, provisionSsl, SSL_STATUS_INFO } from '@/lib/domains';

interface RouteContext {
  params: { id: string };
}

// GET /api/domains/[id]/ssl - Get SSL status for a domain
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

    // Get health check
    const health = await checkDomainHealth(params.id);

    // Get SSL status info
    const statusInfo = SSL_STATUS_INFO[domain.sslStatus];

    return NextResponse.json({
      domain: domain.domain,
      sslStatus: domain.sslStatus,
      statusInfo,
      health,
      verified: domain.verified,
      verifiedAt: domain.verifiedAt,
    });
  } catch (error) {
    console.error('Get SSL status error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch SSL status' },
      { status: 500 }
    );
  }
}

// POST /api/domains/[id]/ssl - Retry SSL provisioning
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

    const domain = await getDomainById(params.id, session.user.id);

    if (!domain) {
      return NextResponse.json(
        { error: 'Domain not found' },
        { status: 404 }
      );
    }

    if (!domain.verified) {
      return NextResponse.json(
        { error: 'Domain must be verified before SSL can be provisioned' },
        { status: 400 }
      );
    }

    if (domain.sslStatus === 'ACTIVE') {
      return NextResponse.json({
        message: 'SSL is already active',
        sslStatus: domain.sslStatus,
      });
    }

    // Retry SSL provisioning
    const result = await provisionSsl(params.id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'SSL provisioning started',
      sslStatus: 'PROVISIONING',
    });
  } catch (error) {
    console.error('SSL provision error:', error);
    return NextResponse.json(
      { error: 'Failed to provision SSL' },
      { status: 500 }
    );
  }
}
