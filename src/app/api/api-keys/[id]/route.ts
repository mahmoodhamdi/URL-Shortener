import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { ApiError } from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) return ApiError.unauthorized();

  const key = await prisma.apiKey.findUnique({
    where: { id: params.id },
    select: { id: true, userId: true },
  });
  if (!key || key.userId !== session.user.id) {
    return ApiError.notFound('API key');
  }

  await prisma.apiKey.delete({ where: { id: params.id } });
  return NextResponse.json({ revoked: true });
}
