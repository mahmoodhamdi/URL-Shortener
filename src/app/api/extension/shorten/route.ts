import { NextRequest, NextResponse } from 'next/server';
import { validateExtensionToken } from '@/lib/extension';
import { validateUrl, isValidAlias, normalizeUrl } from '@/lib/url/validator';
import { createShortLink, getShortUrl } from '@/lib/url/shortener';
import { buildUtmUrl } from '@/lib/url/utm';
import { prisma } from '@/lib/db/prisma';
import { checkLinkLimit } from '@/lib/limits/checker';
import type { Plan } from '@prisma/client';

/**
 * POST /api/extension/shorten
 * Create a short URL from the extension
 */
export async function POST(request: NextRequest) {
  try {
    // Validate extension token
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid Authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const authResult = await validateExtensionToken(token);

    if (!authResult.valid || !authResult.user) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = authResult.user.id;
    const plan = (authResult.plan || 'FREE') as Plan;

    // Check link limit
    const limitCheck = await checkLinkLimit(userId);

    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          error: `Link limit reached. You have used ${limitCheck.used}/${limitCheck.limit} links this month.`,
          upgradeRequired: true,
        },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { url, customAlias, password, expiresAt, utm } = body;

    // Validate URL
    const urlValidation = validateUrl(url);
    if (!urlValidation.isValid) {
      return NextResponse.json(
        { error: urlValidation.error || 'Invalid URL' },
        { status: 400 }
      );
    }

    // Validate custom alias if provided
    if (customAlias) {
      if (!isValidAlias(customAlias)) {
        return NextResponse.json(
          { error: 'Invalid alias format. Use 3-50 characters: letters, numbers, and hyphens only.' },
          { status: 400 }
        );
      }

      // Check if alias is already taken
      const existingLink = await prisma.link.findUnique({
        where: { customAlias },
      });

      if (existingLink) {
        return NextResponse.json(
          { error: 'This alias is already taken' },
          { status: 409 }
        );
      }
    }

    // Build URL with UTM parameters if provided
    let finalUrl = normalizeUrl(url);
    if (utm) {
      finalUrl = buildUtmUrl(finalUrl, utm);
    }

    // Create the short URL (transaction handles usage increment)
    const link = await createShortLink({
      url: finalUrl,
      customAlias,
      password,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
      userId,
      utmSource: utm?.source,
      utmMedium: utm?.medium,
      utmCampaign: utm?.campaign,
      utmTerm: utm?.term,
      utmContent: utm?.content,
    });

    // Get the full short URL
    const shortUrl = getShortUrl(link.customAlias || link.shortCode);

    return NextResponse.json({
      id: link.id,
      shortCode: link.shortCode,
      customAlias: link.customAlias,
      shortUrl,
      originalUrl: link.originalUrl,
      createdAt: link.createdAt,
      expiresAt: link.expiresAt,
      hasPassword: !!link.password,
      usage: {
        used: limitCheck.used + 1,
        limit: limitCheck.limit,
        remaining: limitCheck.remaining - 1,
      },
    });
  } catch (error) {
    console.error('Error creating short URL from extension:', error);
    return NextResponse.json(
      { error: 'Failed to create short URL' },
      { status: 500 }
    );
  }
}
