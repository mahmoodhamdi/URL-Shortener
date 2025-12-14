import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';
import { validateUrl, validateAlias } from '@/lib/url/validator';

/**
 * PUT /api/zapier/actions/update-link - Update a link via Zapier
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, shortCode, url, customAlias, title, password, expiresAt, isActive } = body;

    // Require either id or shortCode
    if (!id && !shortCode) {
      return NextResponse.json(
        { error: 'Either id or shortCode is required' },
        { status: 400 }
      );
    }

    // Find the link
    const link = await prisma.link.findFirst({
      where: {
        ...(id ? { id } : { shortCode }),
        userId: session.user.id,
      },
    });

    if (!link) {
      return NextResponse.json(
        { error: 'Link not found' },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {};

    // Validate and update URL if provided
    if (url !== undefined) {
      const urlValidation = validateUrl(url);
      if (!urlValidation.isValid) {
        return NextResponse.json(
          { error: urlValidation.error },
          { status: 400 }
        );
      }
      updateData.originalUrl = url;
    }

    // Validate and update alias if provided
    if (customAlias !== undefined) {
      if (customAlias) {
        const aliasValidation = validateAlias(customAlias);
        if (!aliasValidation.isValid) {
          return NextResponse.json(
            { error: aliasValidation.error },
            { status: 400 }
          );
        }

        // Check if alias is taken by another link
        const existingAlias = await prisma.link.findFirst({
          where: {
            customAlias,
            NOT: { id: link.id },
          },
        });

        if (existingAlias) {
          return NextResponse.json(
            { error: 'Custom alias is already taken' },
            { status: 409 }
          );
        }

        updateData.customAlias = customAlias;
      } else {
        updateData.customAlias = null;
      }
    }

    // Update other fields
    if (title !== undefined) updateData.title = title || null;
    if (password !== undefined) updateData.password = password || null;
    if (expiresAt !== undefined) updateData.expiresAt = expiresAt ? new Date(expiresAt) : null;
    if (isActive !== undefined) updateData.isActive = isActive;

    // Update the link
    const updatedLink = await prisma.link.update({
      where: { id: link.id },
      data: updateData,
    });

    // Build short URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const shortUrl = `${baseUrl}/${updatedLink.customAlias || updatedLink.shortCode}`;

    return NextResponse.json({
      id: updatedLink.id,
      shortCode: updatedLink.shortCode,
      shortUrl,
      originalUrl: updatedLink.originalUrl,
      title: updatedLink.title,
      customAlias: updatedLink.customAlias,
      isActive: updatedLink.isActive,
      updatedAt: updatedLink.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('Error updating link via Zapier:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update link' },
      { status: 500 }
    );
  }
}
