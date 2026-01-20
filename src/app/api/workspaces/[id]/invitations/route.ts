import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { z } from 'zod';

import { checkWorkspacePermission, checkMemberLimits, getWorkspaceById } from '@/lib/workspace';
import {
  createInvitation,
  getWorkspaceInvitations,
  isAlreadyInvited,
  isAlreadyMember,
} from '@/lib/workspace/invitations';
import type { WorkspaceRole } from '@/lib/workspace/permissions';

// Validation schema for creating invitation
const createInvitationSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['ADMIN', 'MEMBER', 'VIEWER']).default('MEMBER'),
});

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

    // Validate with Zod schema
    const validation = createInvitationSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { email, role } = validation.data;

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
