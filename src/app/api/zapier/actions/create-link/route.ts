import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

import { prisma } from '@/lib/db/prisma';
import { generateShortCode } from '@/lib/url/shortener';
import { validateUrl, validateAlias } from '@/lib/url/validator';
import { dispatchZapierEvent } from '@/lib/zapier';
import type { Plan } from '@prisma/client';

/**
 * POST /api/zapier/actions/create-link - Create a short link via Zapier
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { url, customAlias, title, password, expiresAt } = body;

    // Validate URL
    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    const urlValidation = validateUrl(url);
    if (!urlValidation.isValid) {
      return NextResponse.json(
        { error: urlValidation.error },
        { status: 400 }
      );
    }

    // Validate custom alias if provided
    let alias: string | undefined;
    if (customAlias) {
      const aliasValidation = validateAlias(customAlias);
      if (!aliasValidation.isValid) {
        return NextResponse.json(
          { error: aliasValidation.error },
          { status: 400 }
        );
      }

      // Check if alias is already taken
      const existingAlias = await prisma.link.findFirst({
        where: { customAlias },
      });

      if (existingAlias) {
        return NextResponse.json(
          { error: 'Custom alias is already taken' },
          { status: 409 }
        );
      }

      alias = customAlias;
    }

    // Generate short code
    const shortCode = await generateShortCode();

    // Create link
    const link = await prisma.link.create({
      data: {
        originalUrl: url,
        shortCode,
        customAlias: alias,
        title,
        password,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        userId: session.user.id,
      },
    });

    // Build short URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const shortUrl = `${baseUrl}/${alias || shortCode}`;

    // Dispatch Zapier event
    await dispatchZapierEvent(session.user.id, 'LINK_CREATED', {
      id: link.id,
      shortCode: link.shortCode,
      shortUrl,
      originalUrl: link.originalUrl,
      title: link.title,
      customAlias: link.customAlias,
      createdAt: link.createdAt.toISOString(),
      userId: session.user.id,
    });

    return NextResponse.json({
      id: link.id,
      shortCode: link.shortCode,
      shortUrl,
      originalUrl: link.originalUrl,
      title: link.title,
      customAlias: link.customAlias,
      createdAt: link.createdAt.toISOString(),
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating link via Zapier:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create link' },
      { status: 500 }
    );
  }
}
