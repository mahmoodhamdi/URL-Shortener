import { NextRequest, NextResponse } from 'next/server';
import { createShortLink, getShortUrl } from '@/lib/url/shortener';
import { bulkUrlsSchema, isValidUrl, normalizeUrl } from '@/lib/url/validator';
import { ZodError } from 'zod';
import type { BulkShortenResult } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const { urls } = bulkUrlsSchema.parse(body);

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

        const link = await createShortLink({ url: normalizedUrl });
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
