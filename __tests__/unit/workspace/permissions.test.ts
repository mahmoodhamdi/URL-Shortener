import { describe, it, expect } from 'vitest';
import {
  hasPermission,
  getPermissions,
  canManageRole,
  getAssignableRoles,
  getRoleDisplayName,
  getRoleDescription,
  type WorkspaceRole,
  type Permission,
} from '@/lib/workspace/permissions';

describe('Workspace Permissions', () => {
  describe('hasPermission', () => {
    describe('OWNER role', () => {
      it('should have all permissions', () => {
        const permissions: Permission[] = [
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
        ];

        permissions.forEach(permission => {
          expect(hasPermission('OWNER', permission)).toBe(true);
        });
      });
    });

    describe('ADMIN role', () => {
      it('should have most permissions except delete/transfer workspace', () => {
        expect(hasPermission('ADMIN', 'workspace:view')).toBe(true);
        expect(hasPermission('ADMIN', 'workspace:edit')).toBe(true);
        expect(hasPermission('ADMIN', 'workspace:delete')).toBe(false);
        expect(hasPermission('ADMIN', 'workspace:transfer')).toBe(false);
        expect(hasPermission('ADMIN', 'members:invite')).toBe(true);
        expect(hasPermission('ADMIN', 'links:edit_all')).toBe(true);
      });
    });

    describe('MEMBER role', () => {
      it('should only have own content permissions', () => {
        expect(hasPermission('MEMBER', 'workspace:view')).toBe(true);
        expect(hasPermission('MEMBER', 'workspace:edit')).toBe(false);
        expect(hasPermission('MEMBER', 'members:invite')).toBe(false);
        expect(hasPermission('MEMBER', 'links:create')).toBe(true);
        expect(hasPermission('MEMBER', 'links:edit_own')).toBe(true);
        expect(hasPermission('MEMBER', 'links:edit_all')).toBe(false);
        expect(hasPermission('MEMBER', 'links:delete_own')).toBe(true);
        expect(hasPermission('MEMBER', 'links:delete_all')).toBe(false);
      });
    });

    describe('VIEWER role', () => {
      it('should only have view permissions', () => {
        expect(hasPermission('VIEWER', 'workspace:view')).toBe(true);
        expect(hasPermission('VIEWER', 'workspace:edit')).toBe(false);
        expect(hasPermission('VIEWER', 'members:view')).toBe(true);
        expect(hasPermission('VIEWER', 'members:invite')).toBe(false);
        expect(hasPermission('VIEWER', 'links:view')).toBe(true);
        expect(hasPermission('VIEWER', 'links:create')).toBe(false);
        expect(hasPermission('VIEWER', 'analytics:view')).toBe(true);
      });
    });
  });

  describe('getPermissions', () => {
    it('should return all permissions for OWNER', () => {
      const permissions = getPermissions('OWNER');
      expect(permissions.length).toBeGreaterThan(15);
      expect(permissions).toContain('workspace:delete');
      expect(permissions).toContain('workspace:transfer');
    });

    it('should return limited permissions for VIEWER', () => {
      const permissions = getPermissions('VIEWER');
      expect(permissions.length).toBeLessThan(10);
      expect(permissions).toContain('workspace:view');
      expect(permissions).not.toContain('links:create');
    });
  });

  describe('canManageRole', () => {
    it('OWNER can manage all roles', () => {
      const roles: WorkspaceRole[] = ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'];
      roles.forEach(role => {
        expect(canManageRole('OWNER', role)).toBe(true);
      });
    });

    it('ADMIN can manage MEMBER and VIEWER', () => {
      expect(canManageRole('ADMIN', 'OWNER')).toBe(false);
      expect(canManageRole('ADMIN', 'ADMIN')).toBe(false);
      expect(canManageRole('ADMIN', 'MEMBER')).toBe(true);
      expect(canManageRole('ADMIN', 'VIEWER')).toBe(true);
    });

    it('MEMBER cannot manage anyone', () => {
      const roles: WorkspaceRole[] = ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'];
      roles.forEach(role => {
        expect(canManageRole('MEMBER', role)).toBe(false);
      });
    });

    it('VIEWER cannot manage anyone', () => {
      const roles: WorkspaceRole[] = ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'];
      roles.forEach(role => {
        expect(canManageRole('VIEWER', role)).toBe(false);
      });
    });
  });

  describe('getAssignableRoles', () => {
    it('OWNER can assign ADMIN, MEMBER, VIEWER', () => {
      const roles = getAssignableRoles('OWNER');
      expect(roles).toContain('ADMIN');
      expect(roles).toContain('MEMBER');
      expect(roles).toContain('VIEWER');
      expect(roles).not.toContain('OWNER');
    });

    it('ADMIN can assign MEMBER, VIEWER', () => {
      const roles = getAssignableRoles('ADMIN');
      expect(roles).toContain('MEMBER');
      expect(roles).toContain('VIEWER');
      expect(roles).not.toContain('ADMIN');
      expect(roles).not.toContain('OWNER');
    });

    it('MEMBER cannot assign any roles', () => {
      const roles = getAssignableRoles('MEMBER');
      expect(roles).toHaveLength(0);
    });

    it('VIEWER cannot assign any roles', () => {
      const roles = getAssignableRoles('VIEWER');
      expect(roles).toHaveLength(0);
    });
  });

  describe('getRoleDisplayName', () => {
    it('should return display names', () => {
      expect(getRoleDisplayName('OWNER')).toBe('Owner');
      expect(getRoleDisplayName('ADMIN')).toBe('Admin');
      expect(getRoleDisplayName('MEMBER')).toBe('Member');
      expect(getRoleDisplayName('VIEWER')).toBe('Viewer');
    });
  });

  describe('getRoleDescription', () => {
    it('should return descriptions', () => {
      expect(getRoleDescription('OWNER')).toContain('Full access');
      expect(getRoleDescription('ADMIN')).toContain('manage');
      expect(getRoleDescription('MEMBER')).toContain('own links');
      expect(getRoleDescription('VIEWER')).toContain('only view');
    });
  });
});
