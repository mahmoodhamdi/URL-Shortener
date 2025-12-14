import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getInvitationByToken, acceptInvitation } from '@/lib/workspace/invitations';

interface RouteParams {
  params: Promise<{ token: string }>;
}

/**
 * GET /api/invitations/[token]
 * Get invitation details by token
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { token } = await params;

    const invitation = await getInvitationByToken(token);

    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    if (invitation.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Invitation has expired' }, { status: 410 });
    }

    return NextResponse.json({
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      workspace: invitation.workspace,
      expiresAt: invitation.expiresAt,
    });
  } catch (error) {
    console.error('Error fetching invitation:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invitation' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/invitations/[token]
 * Accept an invitation
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { token } = await params;

    const member = await acceptInvitation(token, session.user.id);

    return NextResponse.json({
      success: true,
      workspace: member.workspace,
      role: member.role,
    });
  } catch (error) {
    console.error('Error accepting invitation:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to accept invitation' },
      { status: 500 }
    );
  }
}
