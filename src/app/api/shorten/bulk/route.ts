import { NextRequest, NextResponse } from 'next/server';
import { createShortLink, getShortUrl } from '@/lib/url/shortener';
import { bulkUrlsSchema, isValidUrl, normalizeUrl } from '@/lib/url/validator';
import { auth } from '@/lib/auth';
import { checkBulkLimit } from '@/lib/limits';
import { ZodError } from 'zod';
import type { BulkShortenResult } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const { urls } = bulkUrlsSchema.parse(body);

    // Check if user is authenticated
    const session = await auth();
    const userId = session?.user?.id;

    // Check bulk limits if user is authenticated
    if (userId) {
      const limitCheck = await checkBulkLimit(userId, urls.length);
      if (!limitCheck.allowed) {
        return NextResponse.json(
          {
            error: limitCheck.message || 'Bulk limit reached',
            limit: limitCheck.limit,
            used: limitCheck.used,
            remaining: limitCheck.remaining,
          },
          { status: 429 }
        );
      }
    }

    const result: BulkShortenResult = {
      success: [],
      failed: [],
    };

    // Process each URL
    for (const url of urls) {
      try {
        const normalizedUrl = normalizeUrl(url);

        if (!isValidUrl(normalizedUrl)) {
          result.failed.push({
            originalUrl: url,
            error: 'Invalid URL format',
          });
          continue;
        }

        const link = await createShortLink({
          url: normalizedUrl,
          userId,
        });
        const shortCode = link.customAlias || link.shortCode;

        result.success.push({
          originalUrl: link.originalUrl,
          shortUrl: getShortUrl(shortCode),
          shortCode,
        });
      } catch (error) {
        result.failed.push({
          originalUrl: url,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('Bulk shorten error:', error);

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
