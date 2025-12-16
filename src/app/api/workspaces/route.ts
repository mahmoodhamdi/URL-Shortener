import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { ApiError } from '@/lib/api/errors';
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
    const session = await auth();
    if (!session?.user?.id) {
      return ApiError.unauthorized();
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
    return ApiError.internal('Failed to fetch workspaces');
  }
}

/**
 * POST /api/workspaces
 * Create a new workspace
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return ApiError.unauthorized();
    }

    // Check workspace limits
    const limitCheck = await checkWorkspaceLimits(session.user.id);
    if (!limitCheck.allowed) {
      return ApiError.planLimitReached(limitCheck.message || 'Workspace limit reached');
    }

    const body = await request.json();
    const { name, description, logo } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return ApiError.validationError('Workspace name is required', { field: 'name' });
    }

    if (name.length > 100) {
      return ApiError.validationError('Workspace name must be less than 100 characters', { field: 'name' });
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
    return ApiError.internal('Failed to create workspace');
  }
}
