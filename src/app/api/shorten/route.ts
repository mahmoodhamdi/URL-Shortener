import { NextRequest, NextResponse } from 'next/server';
import { createShortLink } from '@/lib/url/shortener';
import { createLinkSchema } from '@/lib/url/validator';
import { ZodError } from 'zod';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validatedData = createLinkSchema.parse(body);

    // Create short link
    const link = await createShortLink(validatedData);

    return NextResponse.json(link, { status: 201 });
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
