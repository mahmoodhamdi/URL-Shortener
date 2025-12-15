/**
 * Firebase Authentication API
 *
 * POST /api/auth/firebase
 * Authenticate using Firebase ID token
 *
 * This endpoint allows clients to authenticate using Firebase Auth
 * (e.g., Google Sign-In via Firebase) and create/link a NextAuth session.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyIdToken, syncFirebaseUser } from '@/lib/firebase/auth';
import { createCustomToken } from '@/lib/firebase/auth';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const firebaseAuthSchema = z.object({
  idToken: z.string().min(1, 'ID token is required'),
  action: z.enum(['signin', 'link']).default('signin'),
});

/**
 * Authenticate with Firebase ID token
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = firebaseAuthSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { idToken, action } = validation.data;

    // Verify Firebase ID token
    const decodedToken = await verifyIdToken(idToken);
    if (!decodedToken) {
      return NextResponse.json(
        { error: 'Invalid or expired Firebase token' },
        { status: 401 }
      );
    }

    const { uid, email, name, picture } = decodedToken;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required from Firebase authentication' },
        { status: 400 }
      );
    }

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { email },
      include: { subscription: true },
    });

    if (!user) {
      // Create new user
      user = await prisma.user.create({
        data: {
          email,
          name: name || email.split('@')[0],
          image: picture,
          emailVerified: new Date(), // Firebase email is verified
          subscription: {
            create: {
              plan: 'FREE',
              status: 'ACTIVE',
            },
          },
        },
        include: { subscription: true },
      });

      // Sync with Firebase
      await syncFirebaseUser(user.id, email, name, picture);
    } else if (action === 'link') {
      // Update existing user with Firebase info
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          name: name || user.name,
          image: picture || user.image,
          emailVerified: user.emailVerified || new Date(),
        },
        include: { subscription: true },
      });

      await syncFirebaseUser(user.id, email, name || user.name || undefined, picture || user.image || undefined);
    }

    // Check/create Firebase account link
    const existingAccount = await prisma.account.findFirst({
      where: {
        userId: user.id,
        provider: 'firebase',
      },
    });

    if (!existingAccount) {
      await prisma.account.create({
        data: {
          userId: user.id,
          type: 'oauth',
          provider: 'firebase',
          providerAccountId: uid,
          access_token: idToken,
        },
      });
    } else {
      await prisma.account.update({
        where: { id: existingAccount.id },
        data: { access_token: idToken },
      });
    }

    // Create custom token for client-side Firebase auth
    const customToken = await createCustomToken(user.id, {
      email,
      plan: user.subscription?.plan || 'FREE',
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
      },
      customToken, // For client-side Firebase auth
      isNewUser: !existingAccount,
    });
  } catch (error) {
    console.error('[API] Firebase auth error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to get Firebase custom token for authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    // Get user from session cookie or Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      );
    }

    const sessionToken = authHeader.slice(7);

    // Verify session token
    const session = await prisma.session.findUnique({
      where: { sessionToken },
      include: { user: true },
    });

    if (!session || session.expires < new Date()) {
      return NextResponse.json(
        { error: 'Invalid or expired session' },
        { status: 401 }
      );
    }

    const user = session.user;

    // Create Firebase custom token
    const customToken = await createCustomToken(user.id, {
      email: user.email,
    });

    if (!customToken) {
      return NextResponse.json(
        { error: 'Firebase not configured' },
        { status: 503 }
      );
    }

    return NextResponse.json({
      customToken,
    });
  } catch (error) {
    console.error('[API] Firebase token error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
