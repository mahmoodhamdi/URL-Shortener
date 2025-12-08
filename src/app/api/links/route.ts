import { NextRequest, NextResponse } from 'next/server';
import { getAllLinks } from '@/lib/url/shortener';
import type { SortOption, FilterOption } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;
    const filter = (searchParams.get('filter') as FilterOption) || undefined;
    const sort = (searchParams.get('sort') as SortOption) || undefined;

    const links = await getAllLinks({ search, filter, sort });

    return NextResponse.json(links);
  } catch (error) {
    console.error('Get links error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
