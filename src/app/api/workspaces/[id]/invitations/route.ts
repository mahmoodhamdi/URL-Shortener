import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

import { checkWorkspacePermission, checkMemberLimits, getWorkspaceById } from '@/lib/workspace';
import {
  createInvitation,
  getWorkspaceInvitations,
  isAlreadyInvited,
  isAlreadyMember,
} from '@/lib/workspace/invitations';
import type { WorkspaceRole } from '@/lib/workspace/permissions';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/workspaces/[id]/invitations
 * List all invitations for a workspace
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Check if user can view/manage invitations
    const canInvite = await checkWorkspacePermission(id, session.user.id, 'members:invite');
    if (!canInvite) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const invitations = await getWorkspaceInvitations(id);

    return NextResponse.json(
      invitations.map((inv) => ({
        id: inv.id,
        email: inv.email,
        role: inv.role,
        expiresAt: inv.expiresAt,
        createdAt: inv.createdAt,
      }))
    );
  } catch (error) {
    console.error('Error fetching invitations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invitations' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/workspaces/[id]/invitations
 * Send an invitation
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Check if user can invite
    const canInvite = await checkWorkspacePermission(id, session.user.id, 'members:invite');
    if (!canInvite) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { email, role = 'MEMBER' } = body;

    // Validate email
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    // Validate role
    const validRoles: WorkspaceRole[] = ['ADMIN', 'MEMBER', 'VIEWER'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be ADMIN, MEMBER, or VIEWER' },
        { status: 400 }
      );
    }

    // Get workspace to check owner
    const workspace = await getWorkspaceById(id);
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    // Check member limits
    const limitCheck = await checkMemberLimits(id, workspace.ownerId);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        { error: limitCheck.message },
        { status: 403 }
      );
    }

    // Check if already a member
    const alreadyMember = await isAlreadyMember(id, email);
    if (alreadyMember) {
      return NextResponse.json(
        { error: 'This user is already a member of this workspace' },
        { status: 409 }
      );
    }

    // Check if already invited
    const alreadyInvited = await isAlreadyInvited(id, email);
    if (alreadyInvited) {
      return NextResponse.json(
        { error: 'This email has already been invited' },
        { status: 409 }
      );
    }

    const invitation = await createInvitation(id, email, role, session.user.id);

    return NextResponse.json(
      {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
        createdAt: invitation.createdAt,
        // Include token for the response (could be used to generate invite link)
        inviteUrl: `/invite/${invitation.token}`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating invitation:', error);
    return NextResponse.json(
      { error: 'Failed to send invitation' },
      { status: 500 }
    );
  }
}
