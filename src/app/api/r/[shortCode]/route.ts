import { NextRequest, NextResponse } from 'next/server';
import { getLinkByCode, isLinkExpired, verifyPassword } from '@/lib/url/shortener';
import { trackClickAsync } from '@/lib/analytics/tracker';
import { resolveTargetUrl } from '@/lib/targeting';
import { selectAndTrackVariant } from '@/lib/ab-testing';
import { generateCloakedPage, getCloakedPageContentType } from '@/lib/cloaking';
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

    // Track click asynchronously (fire-and-forget for faster redirects)
    const headersList = await headers();
    const userAgent = headersList.get('user-agent') || undefined;
    const referrer = headersList.get('referer') || undefined;
    const ip = headersList.get('x-forwarded-for')?.split(',')[0] ||
               headersList.get('x-real-ip') ||
               undefined;

    // Non-blocking click tracking - doesn't slow down the redirect
    trackClickAsync({
      linkId: link.id,
      ip,
      userAgent,
      referrer,
    });

    // First, check if there's an active A/B test
    const abTestUrl = await selectAndTrackVariant(
      link.id,
      ip || null,
      userAgent || null
    );

    // If A/B test is active, use the selected variant URL
    if (abTestUrl) {
      return NextResponse.json({
        originalUrl: abTestUrl,
      });
    }

    // Otherwise, resolve target URL based on device/geo targeting
    const targetUrl = await resolveTargetUrl(
      { id: link.id, originalUrl: link.originalUrl },
      request
    );

    // Check if cloaking is enabled
    if (link.cloakingEnabled && link.cloakingType) {
      const html = generateCloakedPage(link.cloakingType, {
        destinationUrl: targetUrl,
        title: link.cloakingTitle,
        favicon: link.cloakingFavicon,
      });

      return new NextResponse(html, {
        headers: {
          'Content-Type': getCloakedPageContentType(),
          'X-Robots-Tag': 'noindex, nofollow',
        },
      });
    }

    // Return link info for client-side redirect
    return NextResponse.json({
      originalUrl: targetUrl,
    });
  } catch (error) {
    console.error('Redirect error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
