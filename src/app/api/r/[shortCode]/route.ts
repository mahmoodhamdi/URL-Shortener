import { NextRequest, NextResponse } from 'next/server';
import { getLinkByCode, isLinkExpired, verifyPassword } from '@/lib/url/shortener';
import { trackClick } from '@/lib/analytics/tracker';
import { headers } from 'next/headers';

interface RouteContext {
  params: { shortCode: string };
}

export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const link = await getLinkByCode(params.shortCode);

    if (!link) {
      return NextResponse.json(
        { error: 'Link not found' },
        { status: 404 }
      );
    }

    if (!link.isActive) {
      return NextResponse.json(
        { error: 'Link is disabled' },
        { status: 410 }
      );
    }

    if (isLinkExpired(link)) {
      return NextResponse.json(
        { error: 'Link has expired' },
        { status: 410 }
      );
    }

    // Check password if required
    if (link.password) {
      const password = request.headers.get('x-link-password');
      if (!password) {
        return NextResponse.json(
          { error: 'Password required', requiresPassword: true },
          { status: 401 }
        );
      }
      const isValid = await verifyPassword(link.id, password);
      if (!isValid) {
        return NextResponse.json(
          { error: 'Invalid password' },
          { status: 401 }
        );
      }
    }

    // Track click
    const headersList = headers();
    const userAgent = headersList.get('user-agent') || undefined;
    const referrer = headersList.get('referer') || undefined;
    const ip = headersList.get('x-forwarded-for')?.split(',')[0] ||
               headersList.get('x-real-ip') ||
               undefined;

    await trackClick({
      linkId: link.id,
      ip,
      userAgent,
      referrer,
    });

    // Return link info for client-side redirect
    return NextResponse.json({
      originalUrl: link.originalUrl,
    });
  } catch (error) {
    console.error('Redirect error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
