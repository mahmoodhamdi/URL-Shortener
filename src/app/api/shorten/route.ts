import { NextRequest, NextResponse } from 'next/server';
import { createShortLink } from '@/lib/url/shortener';
import { createLinkSchema } from '@/lib/url/validator';
import { auth } from '@/lib/auth';
import { checkLinkLimit } from '@/lib/limits';
import { checkRateLimit, getClientIp, getRateLimitHeaders, RATE_LIMIT_PRESETS } from '@/lib/rate-limit';
import { ZodError } from 'zod';

export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated
    const session = await auth();
    const userId = session?.user?.id;

    // Apply rate limiting
    const identifier = userId || getClientIp(request.headers);
    const rateLimitResult = await checkRateLimit(identifier, RATE_LIMIT_PRESETS.api.shorten);

    if (!rateLimitResult.allowed) {
      const response = NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
      const headers = getRateLimitHeaders(rateLimitResult);
      Object.entries(headers).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;
    }

    const body = await request.json();

    // Validate input
    const validatedData = createLinkSchema.parse(body);

    // Check limits if user is authenticated
    if (userId) {
      const limitCheck = await checkLinkLimit(userId);
      if (!limitCheck.allowed) {
        return NextResponse.json(
          {
            error: limitCheck.message || 'Link limit reached',
            limit: limitCheck.limit,
            used: limitCheck.used,
            remaining: limitCheck.remaining,
          },
          { status: 429 }
        );
      }
    }

    // Create short link with user association
    const link = await createShortLink({
      ...validatedData,
      userId,
    });

    const response = NextResponse.json(link, { status: 201 });
    const headers = getRateLimitHeaders(rateLimitResult);
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  } catch (error) {
    console.error('Shorten error:', error);

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      if (error.message.includes('already taken')) {
        return NextResponse.json(
          { error: 'Alias already taken' },
          { status: 409 }
        );
      }
      if (error.message.includes('Invalid')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
