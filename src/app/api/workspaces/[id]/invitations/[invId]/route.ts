import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkWorkspacePermission } from '@/lib/workspace';
import { deleteInvitation, resendInvitation } from '@/lib/workspace/invitations';
import { prisma } from '@/lib/db/prisma';

interface RouteParams {
  params: Promise<{ id: string; invId: string }>;
}

/**
 * DELETE /api/workspaces/[id]/invitations/[invId]
 * Cancel an invitation
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, invId } = await params;

    // Check if user can manage invitations
    const canInvite = await checkWorkspacePermission(id, session.user.id, 'members:invite');
    if (!canInvite) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify invitation belongs to this workspace
    const invitation = await prisma.workspaceInvitation.findUnique({
      where: { id: invId },
    });

    if (!invitation || invitation.workspaceId !== id) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    await deleteInvitation(invId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting invitation:', error);
    return NextResponse.json(
      { error: 'Failed to delete invitation' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/workspaces/[id]/invitations/[invId]
 * Resend an invitation (generate new token)
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, invId } = await params;

    // Check if user can manage invitations
    const canInvite = await checkWorkspacePermission(id, session.user.id, 'members:invite');
    if (!canInvite) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify invitation belongs to this workspace
    const existingInvitation = await prisma.workspaceInvitation.findUnique({
      where: { id: invId },
    });

    if (!existingInvitation || existingInvitation.workspaceId !== id) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    const invitation = await resendInvitation(invId);

    return NextResponse.json({
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
      createdAt: invitation.createdAt,
      inviteUrl: `/invite/${invitation.token}`,
    });
  } catch (error) {
    console.error('Error resending invitation:', error);
    return NextResponse.json(
      { error: 'Failed to resend invitation' },
      { status: 500 }
    );
  }
}
