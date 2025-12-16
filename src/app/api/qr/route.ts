import { NextRequest, NextResponse } from 'next/server';
import { generateQrDataUrl } from '@/lib/url/qr';
import { auth } from '@/lib/auth';
import { checkRateLimit, getClientIp, getRateLimitHeaders, RATE_LIMIT_PRESETS } from '@/lib/rate-limit';
import { ApiError, handleZodError } from '@/lib/api/errors';
import { z, ZodError } from 'zod';

const qrSchema = z.object({
  url: z.string().min(1, 'URL is required'),
  width: z.number().min(64).max(1024).optional(),
  margin: z.number().min(0).max(10).optional(),
  darkColor: z.string().optional(),
  lightColor: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated
    const session = await auth();
    const userId = session?.user?.id;

    // Apply rate limiting
    const identifier = userId || getClientIp(request.headers);
    const rateLimitResult = await checkRateLimit(identifier, RATE_LIMIT_PRESETS.api.qr);

    if (!rateLimitResult.allowed) {
      const response = ApiError.rateLimitExceeded(
        'Too many requests. Please try again later.',
        {
          limit: rateLimitResult.limit,
          remaining: rateLimitResult.remaining,
          resetAt: rateLimitResult.resetAt,
        }
      );
      const headers = getRateLimitHeaders(rateLimitResult);
      Object.entries(headers).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;
    }

    const body = await request.json();

    const { url, width, margin, darkColor, lightColor } = qrSchema.parse(body);

    const dataUrl = await generateQrDataUrl(url, {
      width,
      margin,
      color: {
        dark: darkColor,
        light: lightColor,
      },
    });

    const response = NextResponse.json({ dataUrl });
    const headers = getRateLimitHeaders(rateLimitResult);
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  } catch (error) {
    console.error('QR generation error:', error);

    if (error instanceof ZodError) {
      return handleZodError(error);
    }

    return ApiError.internal('Failed to generate QR code');
  }
}
