import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  createWorkspace,
  getUserWorkspaces,
  checkWorkspaceLimits,
} from '@/lib/workspace';

/**
 * GET /api/workspaces
 * List all workspaces for the authenticated user
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workspaces = await getUserWorkspaces(session.user.id);

    // Transform to include user's role
    const workspacesWithRole = workspaces.map((workspace) => ({
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      description: workspace.description,
      logo: workspace.logo,
      owner: workspace.owner,
      role: workspace.members[0]?.role || 'VIEWER',
      membersCount: workspace._count.members,
      linksCount: workspace._count.links,
      createdAt: workspace.createdAt,
    }));

    return NextResponse.json(workspacesWithRole);
  } catch (error) {
    console.error('Error fetching workspaces:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workspaces' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/workspaces
 * Create a new workspace
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check workspace limits
    const limitCheck = await checkWorkspaceLimits(session.user.id);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        { error: limitCheck.message },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description, logo } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Workspace name is required' },
        { status: 400 }
      );
    }

    if (name.length > 100) {
      return NextResponse.json(
        { error: 'Workspace name must be less than 100 characters' },
        { status: 400 }
      );
    }

    const workspace = await createWorkspace(session.user.id, {
      name: name.trim(),
      description: description?.trim(),
      logo,
    });

    return NextResponse.json(
      {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        description: workspace.description,
        logo: workspace.logo,
        owner: workspace.owner,
        role: 'OWNER',
        membersCount: workspace._count.members,
        linksCount: workspace._count.links,
        createdAt: workspace.createdAt,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating workspace:', error);
    return NextResponse.json(
      { error: 'Failed to create workspace' },
      { status: 500 }
    );
  }
}
