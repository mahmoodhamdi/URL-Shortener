import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

import {
  getWorkspaceMembers,
  getUserRole,
  checkWorkspacePermission,
} from '@/lib/workspace';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/workspaces/[id]/members
 * List all members of a workspace
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Check if user has access to this workspace
    const canView = await checkWorkspacePermission(id, session.user.id, 'members:view');
    if (!canView) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    const members = await getWorkspaceMembers(id);

    return NextResponse.json(
      members.map((m) => ({
        id: m.id,
        user: m.user,
        role: m.role,
        joinedAt: m.joinedAt,
      }))
    );
  } catch (error) {
    console.error('Error fetching members:', error);
    return NextResponse.json(
      { error: 'Failed to fetch members' },
      { status: 500 }
    );
  }
}
