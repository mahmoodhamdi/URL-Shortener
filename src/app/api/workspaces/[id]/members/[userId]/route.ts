import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  getUserRole,
  updateMemberRole,
  removeWorkspaceMember,
  checkWorkspacePermission,
  canManageRole,
  type WorkspaceRole,
} from '@/lib/workspace';

interface RouteParams {
  params: Promise<{ id: string; userId: string }>;
}

/**
 * PUT /api/workspaces/[id]/members/[userId]
 * Update a member's role
 */
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, userId } = await params;

    // Check if user can edit roles
    const canEditRoles = await checkWorkspacePermission(id, session.user.id, 'members:edit_role');
    if (!canEditRoles) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { role } = body;

    // Validate role
    const validRoles: WorkspaceRole[] = ['ADMIN', 'MEMBER', 'VIEWER'];
    if (!role || !validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be ADMIN, MEMBER, or VIEWER' },
        { status: 400 }
      );
    }

    // Can't change your own role
    if (userId === session.user.id) {
      return NextResponse.json(
        { error: 'You cannot change your own role' },
        { status: 400 }
      );
    }

    // Get the requester's role and target's current role
    const requesterRole = await getUserRole(id, session.user.id);
    const targetCurrentRole = await getUserRole(id, userId);

    if (!requesterRole || !targetCurrentRole) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Check if requester can manage the target's current role
    if (!canManageRole(requesterRole, targetCurrentRole)) {
      return NextResponse.json(
        { error: 'You cannot modify this member\'s role' },
        { status: 403 }
      );
    }

    // Check if requester can assign the new role
    if (!canManageRole(requesterRole, role)) {
      return NextResponse.json(
        { error: 'You cannot assign this role' },
        { status: 403 }
      );
    }

    const member = await updateMemberRole(id, userId, role);

    return NextResponse.json({
      id: member.id,
      user: member.user,
      role: member.role,
    });
  } catch (error) {
    console.error('Error updating member role:', error);
    return NextResponse.json(
      { error: 'Failed to update member role' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/workspaces/[id]/members/[userId]
 * Remove a member from workspace
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, userId } = await params;

    // Leaving workspace (removing yourself)
    if (userId === session.user.id) {
      const role = await getUserRole(id, session.user.id);
      if (role === 'OWNER') {
        return NextResponse.json(
          { error: 'Owner cannot leave. Transfer ownership first.' },
          { status: 400 }
        );
      }

      await removeWorkspaceMember(id, userId);
      return NextResponse.json({ success: true });
    }

    // Removing another member
    const canRemove = await checkWorkspacePermission(id, session.user.id, 'members:remove');
    if (!canRemove) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get the requester's role and target's role
    const requesterRole = await getUserRole(id, session.user.id);
    const targetRole = await getUserRole(id, userId);

    if (!requesterRole || !targetRole) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Can't remove owner
    if (targetRole === 'OWNER') {
      return NextResponse.json(
        { error: 'Cannot remove the workspace owner' },
        { status: 400 }
      );
    }

    // Check if requester can manage the target's role
    if (!canManageRole(requesterRole, targetRole)) {
      return NextResponse.json(
        { error: 'You cannot remove this member' },
        { status: 403 }
      );
    }

    await removeWorkspaceMember(id, userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing member:', error);
    return NextResponse.json(
      { error: 'Failed to remove member' },
      { status: 500 }
    );
  }
}
