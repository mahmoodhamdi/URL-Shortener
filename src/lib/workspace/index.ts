/**
 * Workspace Management Module
 * Provides CRUD operations for workspaces and members
 */

import { prisma } from '@/lib/db/prisma';
import { nanoid } from 'nanoid';
import { hasPermission, type WorkspaceRole, type Permission } from './permissions';

export * from './permissions';

// Reserved slugs that cannot be used for workspaces
const RESERVED_SLUGS = new Set([
  'api',
  'auth',
  'admin',
  'app',
  'dashboard',
  'login',
  'logout',
  'register',
  'signup',
  'signin',
  'settings',
  'profile',
  'account',
  'billing',
  'pricing',
  'docs',
  'help',
  'support',
  'status',
  'health',
  'static',
  'assets',
  'public',
  'private',
  'internal',
  'system',
  'root',
  'null',
  'undefined',
  'www',
  'mail',
  'ftp',
  'smtp',
]);

/**
 * Check if a slug is reserved
 */
export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug.toLowerCase().replace(/-\w+$/, ''));
}

// Plan limits for workspaces
export const WORKSPACE_LIMITS: Record<string, { workspaces: number; membersPerWorkspace: number }> = {
  FREE: { workspaces: 0, membersPerWorkspace: 0 },
  STARTER: { workspaces: 1, membersPerWorkspace: 2 },
  PRO: { workspaces: 3, membersPerWorkspace: 5 },
  BUSINESS: { workspaces: 10, membersPerWorkspace: 25 },
  ENTERPRISE: { workspaces: -1, membersPerWorkspace: -1 }, // Unlimited
};

/**
 * Generate a unique slug for a workspace
 */
export function generateSlug(name: string): string {
  let baseSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 30);

  // Ensure base slug isn't reserved
  if (RESERVED_SLUGS.has(baseSlug)) {
    baseSlug = `ws-${baseSlug}`;
  }

  return `${baseSlug}-${nanoid(6)}`;
}

/**
 * Create a new workspace
 */
export async function createWorkspace(
  userId: string,
  data: {
    name: string;
    description?: string;
    logo?: string;
    slug?: string;
  }
) {
  // If custom slug provided, validate it
  if (data.slug) {
    const normalizedSlug = data.slug.toLowerCase();
    if (isReservedSlug(normalizedSlug)) {
      throw new Error('This workspace slug is reserved. Please choose a different name.');
    }
  }

  const slug = data.slug || generateSlug(data.name);

  const workspace = await prisma.workspace.create({
    data: {
      name: data.name,
      slug,
      description: data.description,
      logo: data.logo,
      ownerId: userId,
      members: {
        create: {
          userId,
          role: 'OWNER',
        },
      },
    },
    include: {
      owner: {
        select: { id: true, name: true, email: true, image: true },
      },
      _count: {
        select: { members: true, links: true },
      },
    },
  });

  return workspace;
}

/**
 * Get workspace by ID
 */
export async function getWorkspaceById(id: string) {
  return prisma.workspace.findUnique({
    where: { id },
    include: {
      owner: {
        select: { id: true, name: true, email: true, image: true },
      },
      _count: {
        select: { members: true, links: true },
      },
    },
  });
}

/**
 * Get workspace by slug
 */
export async function getWorkspaceBySlug(slug: string) {
  return prisma.workspace.findUnique({
    where: { slug },
    include: {
      owner: {
        select: { id: true, name: true, email: true, image: true },
      },
      _count: {
        select: { members: true, links: true },
      },
    },
  });
}

/**
 * Get all workspaces for a user (owned or member of)
 */
export async function getUserWorkspaces(userId: string) {
  return prisma.workspace.findMany({
    where: {
      members: {
        some: {
          userId,
        },
      },
    },
    include: {
      owner: {
        select: { id: true, name: true, email: true, image: true },
      },
      members: {
        where: { userId },
        select: { role: true },
      },
      _count: {
        select: { members: true, links: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Update a workspace
 */
export async function updateWorkspace(
  id: string,
  data: {
    name?: string;
    description?: string;
    logo?: string;
  }
) {
  return prisma.workspace.update({
    where: { id },
    data,
    include: {
      owner: {
        select: { id: true, name: true, email: true, image: true },
      },
      _count: {
        select: { members: true, links: true },
      },
    },
  });
}

/**
 * Delete a workspace
 */
export async function deleteWorkspace(id: string) {
  return prisma.workspace.delete({
    where: { id },
  });
}

/**
 * Get user's role in a workspace
 */
export async function getUserRole(workspaceId: string, userId: string): Promise<WorkspaceRole | null> {
  const member = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId,
      },
    },
    select: { role: true },
  });

  return member?.role as WorkspaceRole | null;
}

/**
 * Check if user has permission in workspace
 */
export async function checkWorkspacePermission(
  workspaceId: string,
  userId: string,
  permission: Permission
): Promise<boolean> {
  const role = await getUserRole(workspaceId, userId);
  if (!role) return false;
  return hasPermission(role, permission);
}

/**
 * Get workspace members
 */
export async function getWorkspaceMembers(workspaceId: string) {
  return prisma.workspaceMember.findMany({
    where: { workspaceId },
    include: {
      user: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
    orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
  });
}

/**
 * Add a member to workspace
 */
export async function addWorkspaceMember(
  workspaceId: string,
  userId: string,
  role: WorkspaceRole = 'MEMBER'
) {
  return prisma.workspaceMember.create({
    data: {
      workspaceId,
      userId,
      role,
    },
    include: {
      user: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
  });
}

/**
 * Update member role
 */
export async function updateMemberRole(
  workspaceId: string,
  userId: string,
  role: WorkspaceRole
) {
  return prisma.workspaceMember.update({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId,
      },
    },
    data: { role },
    include: {
      user: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
  });
}

/**
 * Remove a member from workspace
 */
export async function removeWorkspaceMember(workspaceId: string, userId: string) {
  return prisma.workspaceMember.delete({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId,
      },
    },
  });
}

/**
 * Transfer workspace ownership
 */
export async function transferOwnership(
  workspaceId: string,
  currentOwnerId: string,
  newOwnerId: string
) {
  return prisma.$transaction([
    // Update workspace owner
    prisma.workspace.update({
      where: { id: workspaceId },
      data: { ownerId: newOwnerId },
    }),
    // Update old owner to ADMIN
    prisma.workspaceMember.update({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: currentOwnerId,
        },
      },
      data: { role: 'ADMIN' },
    }),
    // Update new owner to OWNER
    prisma.workspaceMember.update({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: newOwnerId,
        },
      },
      data: { role: 'OWNER' },
    }),
  ]);
}

/**
 * Check workspace limits for user
 */
export async function checkWorkspaceLimits(userId: string): Promise<{
  allowed: boolean;
  used: number;
  limit: number;
  plan: string;
  message?: string;
}> {
  // Get user's subscription
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  const plan = subscription?.plan || 'FREE';
  const limits = WORKSPACE_LIMITS[plan] ?? WORKSPACE_LIMITS.FREE;

  // Count existing workspaces (owned)
  const used = await prisma.workspace.count({
    where: { ownerId: userId },
  });

  // Unlimited
  if (limits.workspaces === -1) {
    return { allowed: true, used, limit: -1, plan };
  }

  // Check if allowed
  if (limits.workspaces === 0) {
    return {
      allowed: false,
      used,
      limit: 0,
      plan,
      message: 'Workspaces are not available on your plan. Please upgrade.',
    };
  }

  if (used >= limits.workspaces) {
    return {
      allowed: false,
      used,
      limit: limits.workspaces,
      plan,
      message: `Workspace limit reached (${used}/${limits.workspaces}). Upgrade your plan for more workspaces.`,
    };
  }

  return {
    allowed: true,
    used,
    limit: limits.workspaces,
    plan,
  };
}

/**
 * Check member limits for workspace
 */
export async function checkMemberLimits(
  workspaceId: string,
  ownerId: string
): Promise<{
  allowed: boolean;
  used: number;
  limit: number;
  plan: string;
  message?: string;
}> {
  // Get owner's subscription
  const subscription = await prisma.subscription.findUnique({
    where: { userId: ownerId },
  });

  const plan = subscription?.plan || 'FREE';
  const limits = WORKSPACE_LIMITS[plan] ?? WORKSPACE_LIMITS.FREE;

  // Count current members
  const used = await prisma.workspaceMember.count({
    where: { workspaceId },
  });

  // Unlimited
  if (limits.membersPerWorkspace === -1) {
    return { allowed: true, used, limit: -1, plan };
  }

  if (used >= limits.membersPerWorkspace) {
    return {
      allowed: false,
      used,
      limit: limits.membersPerWorkspace,
      plan,
      message: `Member limit reached (${used}/${limits.membersPerWorkspace}). Upgrade for more members.`,
    };
  }

  return {
    allowed: true,
    used,
    limit: limits.membersPerWorkspace,
    plan,
  };
}
