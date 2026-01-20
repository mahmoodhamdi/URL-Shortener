import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { z } from 'zod';

import {
  getWorkspaceById,
  updateWorkspace,
  deleteWorkspace,
  getUserRole,
  checkWorkspacePermission,
} from '@/lib/workspace';

// Validation schema for updating workspace
const updateWorkspaceSchema = z.object({
  name: z.string().min(1, 'Workspace name cannot be empty').max(100, 'Workspace name must be less than 100 characters').optional(),
  description: z.string().max(500).nullable().optional(),
  logo: z.string().url().nullable().optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/workspaces/[id]
 * Get workspace details
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Check if user has access to this workspace
    const role = await getUserRole(id, session.user.id);
    if (!role) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    const workspace = await getWorkspaceById(id);
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      description: workspace.description,
      logo: workspace.logo,
      owner: workspace.owner,
      role,
      membersCount: workspace._count.members,
      linksCount: workspace._count.links,
      createdAt: workspace.createdAt,
      updatedAt: workspace.updatedAt,
    });
  } catch (error) {
    console.error('Error fetching workspace:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workspace' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/workspaces/[id]
 * Update workspace details
 */
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Check permission
    const canEdit = await checkWorkspacePermission(id, session.user.id, 'workspace:edit');
    if (!canEdit) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();

    // Validate with Zod schema
    const validation = updateWorkspaceSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { name, description, logo } = validation.data;

    const updateData: { name?: string; description?: string; logo?: string } = {};

    if (name !== undefined) {
      updateData.name = name.trim();
    }

    if (description !== undefined) {
      updateData.description = description?.trim() || undefined;
    }

    if (logo !== undefined) {
      updateData.logo = logo || undefined;
    }

    const workspace = await updateWorkspace(id, updateData);
    const role = await getUserRole(id, session.user.id);

    return NextResponse.json({
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      description: workspace.description,
      logo: workspace.logo,
      owner: workspace.owner,
      role,
      membersCount: workspace._count.members,
      linksCount: workspace._count.links,
      createdAt: workspace.createdAt,
      updatedAt: workspace.updatedAt,
    });
  } catch (error) {
    console.error('Error updating workspace:', error);
    return NextResponse.json(
      { error: 'Failed to update workspace' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/workspaces/[id]
 * Delete a workspace
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Only owner can delete
    const canDelete = await checkWorkspacePermission(id, session.user.id, 'workspace:delete');
    if (!canDelete) {
      return NextResponse.json(
        { error: 'Only the workspace owner can delete the workspace' },
        { status: 403 }
      );
    }

    await deleteWorkspace(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting workspace:', error);
    return NextResponse.json(
      { error: 'Failed to delete workspace' },
      { status: 500 }
    );
  }
}
