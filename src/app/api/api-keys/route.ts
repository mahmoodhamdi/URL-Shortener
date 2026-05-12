import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { ApiError, handleZodError } from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

const createSchema = z.object({
  name: z.string().min(1).max(100),
  expiresAt: z.string().datetime().optional().nullable(),
});

function generateKey(): string {
  return 'usk_' + crypto.randomBytes(24).toString('base64url');
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return ApiError.unauthorized();

  const keys = await prisma.apiKey.findMany({
    where: { userId: session.user.id },
    select: {
      id: true,
      name: true,
      lastUsedAt: true,
      expiresAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ apiKeys: keys });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return ApiError.unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return ApiError.badRequest('Invalid JSON body');
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return handleZodError(parsed.error);
  }

  const plaintext = generateKey();
  const created = await prisma.apiKey.create({
    data: {
      userId: session.user.id,
      name: parsed.data.name,
      key: plaintext,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
    },
    select: {
      id: true,
      name: true,
      expiresAt: true,
      createdAt: true,
    },
  });

  // The plaintext key is only returned once at creation. After this response
  // the client must store it; we never expose it again.
  return NextResponse.json(
    { apiKey: { ...created, key: plaintext } },
    { status: 201 }
  );
}
