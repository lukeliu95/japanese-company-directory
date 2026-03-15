import { NextRequest, NextResponse } from 'next/server';
import { searchCompanies } from '@/lib/queries';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const q = searchParams.get('q') ?? '';
  const page = Math.max(1, Number(searchParams.get('page')) || 1);

  if (!q.trim()) {
    return NextResponse.json(
      { items: [], total: 0, page: 1, totalPages: 0, hasNext: false, hasPrev: false },
      {
        headers: {
          'Cache-Control': 'public, max-age=300, s-maxage=300',
        },
      },
    );
  }

  const result = await searchCompanies(q.trim(), page);

  return NextResponse.json(result, {
    headers: {
      'Cache-Control': 'public, max-age=300, s-maxage=300',
    },
  });
}
