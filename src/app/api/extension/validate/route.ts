import { NextRequest, NextResponse } from 'next/server';
import { validateExtensionToken } from '@/lib/extension';

/**
 * POST /api/extension/validate
 * Validate an extension token and return user info
 */
export async function POST(request: NextRequest) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid Authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!token.startsWith('ext_')) {
      return NextResponse.json(
        { error: 'Invalid token format' },
        { status: 401 }
      );
    }

    const result = await validateExtensionToken(token);

    if (!result.valid) {
      return NextResponse.json(
        { error: result.error },
        { status: 401 }
      );
    }

    // Return user info (excluding sensitive data)
    return NextResponse.json({
      valid: true,
      user: {
        id: result.user!.id,
        name: result.user!.name,
        email: result.user!.email,
        image: result.user!.image,
      },
      plan: result.plan,
      tokenName: result.token!.name,
      lastUsed: result.token!.lastUsedAt,
    });
  } catch (error) {
    console.error('Error validating extension token:', error);
    return NextResponse.json(
      { error: 'Failed to validate token' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/extension/validate
 * Quick check if token is valid (for extension health check)
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ valid: false }, { status: 200 });
    }

    const token = authHeader.substring(7);
    const result = await validateExtensionToken(token);

    return NextResponse.json({
      valid: result.valid,
      plan: result.valid ? result.plan : undefined,
    });
  } catch {
    return NextResponse.json({ valid: false }, { status: 200 });
  }
}
