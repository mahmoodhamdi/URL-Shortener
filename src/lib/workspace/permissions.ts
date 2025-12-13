/**
 * Workspace Role-Based Access Control (RBAC)
 */

export type WorkspaceRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';

export type Permission =
  | 'workspace:view'
  | 'workspace:edit'
  | 'workspace:delete'
  | 'workspace:transfer'
  | 'members:view'
  | 'members:invite'
  | 'members:remove'
  | 'members:edit_role'
  | 'links:view'
  | 'links:create'
  | 'links:edit_own'
  | 'links:edit_all'
  | 'links:delete_own'
  | 'links:delete_all'
  | 'folders:view'
  | 'folders:create'
  | 'folders:edit_own'
  | 'folders:edit_all'
  | 'folders:delete_own'
  | 'folders:delete_all'
  | 'analytics:view';

// Permission matrix for each role
const ROLE_PERMISSIONS: Record<WorkspaceRole, Permission[]> = {
  OWNER: [
    'workspace:view',
    'workspace:edit',
    'workspace:delete',
    'workspace:transfer',
    'members:view',
    'members:invite',
    'members:remove',
    'members:edit_role',
    'links:view',
    'links:create',
    'links:edit_own',
    'links:edit_all',
    'links:delete_own',
    'links:delete_all',
    'folders:view',
    'folders:create',
    'folders:edit_own',
    'folders:edit_all',
    'folders:delete_own',
    'folders:delete_all',
    'analytics:view',
  ],
  ADMIN: [
    'workspace:view',
    'workspace:edit',
    'members:view',
    'members:invite',
    'members:remove',
    'members:edit_role',
    'links:view',
    'links:create',
    'links:edit_own',
    'links:edit_all',
    'links:delete_own',
    'links:delete_all',
    'folders:view',
    'folders:create',
    'folders:edit_own',
    'folders:edit_all',
    'folders:delete_own',
    'folders:delete_all',
    'analytics:view',
  ],
  MEMBER: [
    'workspace:view',
    'members:view',
    'links:view',
    'links:create',
    'links:edit_own',
    'links:delete_own',
    'folders:view',
    'folders:create',
    'folders:edit_own',
    'folders:delete_own',
    'analytics:view',
  ],
  VIEWER: [
    'workspace:view',
    'members:view',
    'links:view',
    'folders:view',
    'analytics:view',
  ],
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: WorkspaceRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/**
 * Get all permissions for a role
 */
export function getPermissions(role: WorkspaceRole): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Check if role can manage another role
 * OWNER can manage all roles
 * ADMIN can manage MEMBER and VIEWER
 */
export function canManageRole(managerRole: WorkspaceRole, targetRole: WorkspaceRole): boolean {
  const roleHierarchy: Record<WorkspaceRole, number> = {
    OWNER: 4,
    ADMIN: 3,
    MEMBER: 2,
    VIEWER: 1,
  };

  // OWNER can manage anyone
  if (managerRole === 'OWNER') return true;

  // ADMIN can manage MEMBER and VIEWER
  if (managerRole === 'ADMIN') {
    return roleHierarchy[targetRole] < roleHierarchy.ADMIN;
  }

  // MEMBER and VIEWER cannot manage anyone
  return false;
}

/**
 * Get available roles that can be assigned by a role
 */
export function getAssignableRoles(role: WorkspaceRole): WorkspaceRole[] {
  switch (role) {
    case 'OWNER':
      return ['ADMIN', 'MEMBER', 'VIEWER'];
    case 'ADMIN':
      return ['MEMBER', 'VIEWER'];
    default:
      return [];
  }
}

/**
 * Get role display name
 */
export function getRoleDisplayName(role: WorkspaceRole): string {
  const names: Record<WorkspaceRole, string> = {
    OWNER: 'Owner',
    ADMIN: 'Admin',
    MEMBER: 'Member',
    VIEWER: 'Viewer',
  };
  return names[role] || role;
}

/**
 * Get role description
 */
export function getRoleDescription(role: WorkspaceRole): string {
  const descriptions: Record<WorkspaceRole, string> = {
    OWNER: 'Full access to workspace, can delete and transfer ownership',
    ADMIN: 'Can manage members, settings, and all links',
    MEMBER: 'Can create and edit own links',
    VIEWER: 'Can only view links and analytics',
  };
  return descriptions[role] || '';
}
