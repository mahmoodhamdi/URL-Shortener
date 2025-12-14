/**
 * Reusable authentication middleware for API routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import type { Session } from 'next-auth';

export interface AuthenticatedRequest extends NextRequest {
  userId: string;
  session: Session;
}

export interface AuthResult {
  authenticated: boolean;
  userId?: string;
  session?: Session;
  error?: NextResponse;
}

/**
 * Check if request is authenticated and return user info
 */
export async function requireAuth(): Promise<AuthResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      authenticated: false,
      error: NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      ),
    };
  }

  return {
    authenticated: true,
    userId: session.user.id,
    session,
  };
}

/**
 * Higher-order function to wrap API handlers with authentication
 */
export function withAuth<TArgs extends unknown[]>(
  handler: (userId: string, session: Session, ...args: TArgs) => Promise<NextResponse>
) {
  return async (...args: TArgs): Promise<NextResponse> => {
    const authResult = await requireAuth();

    if (!authResult.authenticated || !authResult.userId || !authResult.session) {
      return authResult.error!;
    }

    return handler(authResult.userId, authResult.session, ...args);
  };
}

/**
 * Get optional user info (doesn't require authentication)
 */
export async function getOptionalAuth(): Promise<{ userId?: string; session?: Session }> {
  const session = await auth();

  if (!session?.user?.id) {
    return {};
  }

  return {
    userId: session.user.id,
    session,
  };
}

/**
 * Standard unauthorized response
 */
export function unauthorizedResponse(message = 'Unauthorized'): NextResponse {
  return NextResponse.json({ error: message }, { status: 401 });
}

/**
 * Standard forbidden response
 */
export function forbiddenResponse(message = 'Forbidden'): NextResponse {
  return NextResponse.json({ error: message }, { status: 403 });
}
