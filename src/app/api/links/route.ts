import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAllLinks } from '@/lib/url/shortener';
import { ApiError } from '@/lib/api/errors';
import type { SortOption, FilterOption } from '@/types';

export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const session = await auth();
    if (!session?.user?.id) {
      return ApiError.unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;
    const filter = (searchParams.get('filter') as FilterOption) || undefined;
    const sort = (searchParams.get('sort') as SortOption) || undefined;

    const links = await getAllLinks({ search, filter, sort, userId: session.user.id });

    return NextResponse.json(links);
  } catch (error) {
    console.error('Get links error:', error);
    return ApiError.internal();
  }
}
