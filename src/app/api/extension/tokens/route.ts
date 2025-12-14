import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';
import {
  canCreateExtensionToken,
  createExtensionToken,
  getExtensionTokens,
  getExtensionStats,
} from '@/lib/extension';

/**
 * GET /api/extension/tokens
 * Get all extension tokens for the current user
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Get user's subscription/plan
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
    });
    const plan = subscription?.plan || 'FREE';

    const [tokens, stats] = await Promise.all([
      getExtensionTokens(userId),
      getExtensionStats(userId, plan),
    ]);

    // Mask tokens for security (only show first 8 chars)
    const maskedTokens = tokens.map((token) => ({
      ...token,
      token: `${token.token.substring(0, 12)}...`,
      fullToken: undefined, // Remove full token from response
    }));

    return NextResponse.json({
      tokens: maskedTokens,
      stats,
    });
  } catch (error) {
    console.error('Error fetching extension tokens:', error);
    return NextResponse.json(
      { error: 'Failed to fetch extension tokens' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/extension/tokens
 * Create a new extension token
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Get user's subscription/plan
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
    });
    const plan = subscription?.plan || 'FREE';

    // Check if user can create more tokens
    const canCreate = await canCreateExtensionToken(userId, plan);

    if (!canCreate.allowed) {
      return NextResponse.json(
        { error: canCreate.reason },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json().catch(() => ({}));
    const { name, deviceInfo } = body;

    // Create the token
    const token = await createExtensionToken(userId, {
      name: name || 'Browser Extension',
      deviceInfo,
    });

    return NextResponse.json({
      token: token.token, // Return full token only on creation
      id: token.id,
      name: token.name,
      createdAt: token.createdAt,
      message: 'Token created successfully. Save this token - it will not be shown again.',
    });
  } catch (error) {
    console.error('Error creating extension token:', error);
    return NextResponse.json(
      { error: 'Failed to create extension token' },
      { status: 500 }
    );
  }
}
