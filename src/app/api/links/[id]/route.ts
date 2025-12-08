import { NextRequest, NextResponse } from 'next/server';
import { getLinkById, updateLink, deleteLink } from '@/lib/url/shortener';
import { updateLinkSchema } from '@/lib/url/validator';
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
      return NextResponse.json(
        { error: 'Link not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(link);
  } catch (error) {
    console.error('Get link error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
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
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
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
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
