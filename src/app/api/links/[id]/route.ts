import { NextRequest, NextResponse } from 'next/server';
import { getLinkById, updateLink, deleteLink } from '@/lib/url/shortener';
import { updateLinkSchema } from '@/lib/url/validator';
import { ApiError, handleZodError } from '@/lib/api/errors';
import { ZodError } from 'zod';

interface RouteContext {
  params: { id: string };
}

export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const link = await getLinkById(params.id);

    if (!link) {
      return ApiError.notFound('Link');
    }

    return NextResponse.json(link);
  } catch (error) {
    console.error('Get link error:', error);
    return ApiError.internal();
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const body = await request.json();

    // Validate input
    const validatedData = updateLinkSchema.parse(body);

    const link = await updateLink(params.id, validatedData);

    return NextResponse.json(link);
  } catch (error) {
    console.error('Update link error:', error);

    if (error instanceof ZodError) {
      return handleZodError(error);
    }

    if (error instanceof Error) {
      if (error.message.includes('already taken')) {
        return ApiError.alreadyExists('Alias');
      }
    }

    return ApiError.internal();
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    await deleteLink(params.id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Delete link error:', error);
    return ApiError.internal();
  }
}
