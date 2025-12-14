import { NextRequest, NextResponse } from 'next/server';
import { createShortLink, getShortUrl } from '@/lib/url/shortener';
import { bulkUrlsSchema, isValidUrl, normalizeUrl } from '@/lib/url/validator';
import { auth } from '@/lib/auth';
import { checkBulkLimit } from '@/lib/limits';
import { ZodError } from 'zod';
import type { BulkShortenResult } from '@/types';

// Batch size for parallel processing
const BATCH_SIZE = 10;

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

    // Pre-validate all URLs first
    const validUrls: { original: string; normalized: string }[] = [];
    for (const url of urls) {
      const normalizedUrl = normalizeUrl(url);
      if (!isValidUrl(normalizedUrl)) {
        result.failed.push({
          originalUrl: url,
          error: 'Invalid URL format',
        });
      } else {
        validUrls.push({ original: url, normalized: normalizedUrl });
      }
    }

    // Process valid URLs in batches for better performance
    for (let i = 0; i < validUrls.length; i += BATCH_SIZE) {
      const batch = validUrls.slice(i, i + BATCH_SIZE);

      // Process batch in parallel
      const batchResults = await Promise.allSettled(
        batch.map(async ({ original, normalized }) => {
          const link = await createShortLink({
            url: normalized,
            userId,
          });
          const shortCode = link.customAlias || link.shortCode;
          return {
            originalUrl: link.originalUrl,
            shortUrl: getShortUrl(shortCode),
            shortCode,
          };
        })
      );

      // Collect results
      batchResults.forEach((settledResult, index) => {
        if (settledResult.status === 'fulfilled') {
          result.success.push(settledResult.value);
        } else {
          result.failed.push({
            originalUrl: batch[index].original,
            error: settledResult.reason instanceof Error
              ? settledResult.reason.message
              : 'Unknown error',
          });
        }
      });
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
