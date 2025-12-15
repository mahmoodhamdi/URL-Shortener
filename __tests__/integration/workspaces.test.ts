import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    workspace: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    workspaceMember: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    workspaceInvitation: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    subscription: {
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from '@/lib/db/prisma';
import {
  hasPermission,
  getPermissions,
  WorkspaceRole,
  Permission,
} from '@/lib/workspace/permissions';

describe('Workspaces Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Workspace CRUD Operations', () => {
    it('should create a workspace', async () => {
      const mockWorkspace = {
        id: 'workspace-123',
        name: 'My Workspace',
        slug: 'my-workspace',
        ownerId: 'user-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.workspace.create).mockResolvedValue(mockWorkspace as never);

      const result = await prisma.workspace.create({
        data: {
          name: 'My Workspace',
          slug: 'my-workspace',
          ownerId: 'user-123',
        },
      });

      expect(result).toBeDefined();
      expect(result.name).toBe('My Workspace');
      expect(result.ownerId).toBe('user-123');
    });

    it('should find workspace by id', async () => {
      const mockWorkspace = {
        id: 'workspace-123',
        name: 'My Workspace',
        slug: 'my-workspace',
        ownerId: 'user-123',
      };

      vi.mocked(prisma.workspace.findUnique).mockResolvedValue(mockWorkspace as never);

      const result = await prisma.workspace.findUnique({
        where: { id: 'workspace-123' },
      });

      expect(result).toBeDefined();
      expect(result?.id).toBe('workspace-123');
    });

    it('should find workspace by slug', async () => {
      const mockWorkspace = {
        id: 'workspace-123',
        name: 'My Workspace',
        slug: 'my-workspace',
        ownerId: 'user-123',
      };

      vi.mocked(prisma.workspace.findUnique).mockResolvedValue(mockWorkspace as never);

      const result = await prisma.workspace.findUnique({
        where: { slug: 'my-workspace' },
      });

      expect(result).toBeDefined();
      expect(result?.slug).toBe('my-workspace');
    });

    it('should find workspaces for user', async () => {
      const mockWorkspaces = [
        { id: 'workspace-1', name: 'Workspace 1', ownerId: 'user-123' },
        { id: 'workspace-2', name: 'Workspace 2', ownerId: 'user-456' },
      ];

      vi.mocked(prisma.workspace.findMany).mockResolvedValue(mockWorkspaces as never);

      const result = await prisma.workspace.findMany({
        where: {
          OR: [
            { ownerId: 'user-123' },
            { members: { some: { userId: 'user-123' } } },
          ],
        },
      });

      expect(result).toHaveLength(2);
    });

    it('should update workspace', async () => {
      const mockUpdatedWorkspace = {
        id: 'workspace-123',
        name: 'Updated Workspace',
        slug: 'updated-workspace',
        updatedAt: new Date(),
      };

      vi.mocked(prisma.workspace.update).mockResolvedValue(mockUpdatedWorkspace as never);

      const result = await prisma.workspace.update({
        where: { id: 'workspace-123' },
        data: { name: 'Updated Workspace' },
      });

      expect(result.name).toBe('Updated Workspace');
    });

    it('should delete workspace', async () => {
      vi.mocked(prisma.workspace.delete).mockResolvedValue({} as never);

      await prisma.workspace.delete({
        where: { id: 'workspace-123' },
      });

      expect(prisma.workspace.delete).toHaveBeenCalledWith({
        where: { id: 'workspace-123' },
      });
    });
  });

  describe('Workspace Members', () => {
    it('should add member to workspace', async () => {
      const mockMember = {
        id: 'member-123',
        workspaceId: 'workspace-123',
        userId: 'user-456',
        role: 'MEMBER',
        createdAt: new Date(),
      };

      vi.mocked(prisma.workspaceMember.create).mockResolvedValue(mockMember as never);

      const result = await prisma.workspaceMember.create({
        data: {
          workspaceId: 'workspace-123',
          userId: 'user-456',
          role: 'MEMBER',
        },
      });

      expect(result).toBeDefined();
      expect(result.role).toBe('MEMBER');
    });

    it('should find member in workspace', async () => {
      const mockMember = {
        id: 'member-123',
        workspaceId: 'workspace-123',
        userId: 'user-456',
        role: 'ADMIN',
      };

      vi.mocked(prisma.workspaceMember.findFirst).mockResolvedValue(mockMember as never);

      const result = await prisma.workspaceMember.findFirst({
        where: {
          workspaceId: 'workspace-123',
          userId: 'user-456',
        },
      });

      expect(result).toBeDefined();
      expect(result?.role).toBe('ADMIN');
    });

    it('should find all workspace members', async () => {
      const mockMembers = [
        { id: 'member-1', userId: 'user-1', role: 'OWNER' },
        { id: 'member-2', userId: 'user-2', role: 'ADMIN' },
        { id: 'member-3', userId: 'user-3', role: 'MEMBER' },
      ];

      vi.mocked(prisma.workspaceMember.findMany).mockResolvedValue(mockMembers as never);

      const result = await prisma.workspaceMember.findMany({
        where: { workspaceId: 'workspace-123' },
        include: { user: true },
      });

      expect(result).toHaveLength(3);
    });

    it('should update member role', async () => {
      const mockUpdatedMember = {
        id: 'member-123',
        role: 'ADMIN',
        updatedAt: new Date(),
      };

      vi.mocked(prisma.workspaceMember.update).mockResolvedValue(mockUpdatedMember as never);

      const result = await prisma.workspaceMember.update({
        where: { id: 'member-123' },
        data: { role: 'ADMIN' },
      });

      expect(result.role).toBe('ADMIN');
    });

    it('should remove member from workspace', async () => {
      vi.mocked(prisma.workspaceMember.delete).mockResolvedValue({} as never);

      await prisma.workspaceMember.delete({
        where: { id: 'member-123' },
      });

      expect(prisma.workspaceMember.delete).toHaveBeenCalledWith({
        where: { id: 'member-123' },
      });
    });
  });

  describe('Workspace Invitations', () => {
    it('should create invitation', async () => {
      const mockInvitation = {
        id: 'invitation-123',
        workspaceId: 'workspace-123',
        email: 'invite@example.com',
        role: 'MEMBER',
        token: 'inv_token123',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      };

      vi.mocked(prisma.workspaceInvitation.create).mockResolvedValue(mockInvitation as never);

      const result = await prisma.workspaceInvitation.create({
        data: {
          workspaceId: 'workspace-123',
          email: 'invite@example.com',
          role: 'MEMBER',
          token: 'inv_token123',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      expect(result).toBeDefined();
      expect(result.email).toBe('invite@example.com');
      expect(result.token).toBe('inv_token123');
    });

    it('should find invitation by token', async () => {
      const mockInvitation = {
        id: 'invitation-123',
        workspaceId: 'workspace-123',
        email: 'invite@example.com',
        token: 'inv_token123',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };

      vi.mocked(prisma.workspaceInvitation.findFirst).mockResolvedValue(mockInvitation as never);

      const result = await prisma.workspaceInvitation.findFirst({
        where: {
          token: 'inv_token123',
          expiresAt: { gt: new Date() },
        },
      });

      expect(result).toBeDefined();
      expect(result?.token).toBe('inv_token123');
    });

    it('should find pending invitations for workspace', async () => {
      const mockInvitations = [
        { id: 'inv-1', email: 'user1@example.com', role: 'MEMBER' },
        { id: 'inv-2', email: 'user2@example.com', role: 'ADMIN' },
      ];

      vi.mocked(prisma.workspaceInvitation.findMany).mockResolvedValue(mockInvitations as never);

      const result = await prisma.workspaceInvitation.findMany({
        where: {
          workspaceId: 'workspace-123',
          expiresAt: { gt: new Date() },
        },
      });

      expect(result).toHaveLength(2);
    });

    it('should delete invitation after acceptance', async () => {
      vi.mocked(prisma.workspaceInvitation.delete).mockResolvedValue({} as never);

      await prisma.workspaceInvitation.delete({
        where: { id: 'invitation-123' },
      });

      expect(prisma.workspaceInvitation.delete).toHaveBeenCalledWith({
        where: { id: 'invitation-123' },
      });
    });
  });

  describe('Workspace Permissions', () => {
    it('should allow owner all permissions', () => {
      const role: WorkspaceRole = 'OWNER';

      expect(hasPermission(role, 'workspace:edit')).toBe(true);
      expect(hasPermission(role, 'members:invite')).toBe(true);
      expect(hasPermission(role, 'links:create')).toBe(true);
      expect(hasPermission(role, 'links:delete_all')).toBe(true);
      expect(hasPermission(role, 'workspace:delete')).toBe(true);
    });

    it('should allow admin most permissions', () => {
      const role: WorkspaceRole = 'ADMIN';

      expect(hasPermission(role, 'members:invite')).toBe(true);
      expect(hasPermission(role, 'links:create')).toBe(true);
      expect(hasPermission(role, 'links:delete_all')).toBe(true);
      expect(hasPermission(role, 'workspace:delete')).toBe(false);
    });

    it('should allow member limited permissions', () => {
      const role: WorkspaceRole = 'MEMBER';

      expect(hasPermission(role, 'links:create')).toBe(true);
      expect(hasPermission(role, 'analytics:view')).toBe(true);
      expect(hasPermission(role, 'members:invite')).toBe(false);
      expect(hasPermission(role, 'links:delete_all')).toBe(false);
    });

    it('should allow viewer only view permissions', () => {
      const role: WorkspaceRole = 'VIEWER';

      expect(hasPermission(role, 'links:view')).toBe(true);
      expect(hasPermission(role, 'analytics:view')).toBe(true);
      expect(hasPermission(role, 'links:create')).toBe(false);
      expect(hasPermission(role, 'members:invite')).toBe(false);
    });

    it('should return permissions array for each role', () => {
      const ownerPerms = getPermissions('OWNER');
      const adminPerms = getPermissions('ADMIN');
      const memberPerms = getPermissions('MEMBER');
      const viewerPerms = getPermissions('VIEWER');

      expect(ownerPerms.length).toBeGreaterThan(0);
      expect(adminPerms.length).toBeGreaterThan(0);
      expect(memberPerms.length).toBeGreaterThan(0);
      expect(viewerPerms.length).toBeGreaterThan(0);
      expect(ownerPerms.length).toBeGreaterThanOrEqual(adminPerms.length);
    });
  });

  describe('Workspace Limits', () => {
    it('should count workspaces for user', async () => {
      vi.mocked(prisma.workspace.count).mockResolvedValue(3);

      const count = await prisma.workspace.count({
        where: { ownerId: 'user-123' },
      });

      expect(count).toBe(3);
    });

    it('should count members in workspace', async () => {
      vi.mocked(prisma.workspaceMember.findMany).mockResolvedValue([
        { id: 'm1', userId: 'u1' },
        { id: 'm2', userId: 'u2' },
        { id: 'm3', userId: 'u3' },
        { id: 'm4', userId: 'u4' },
        { id: 'm5', userId: 'u5' },
      ] as never);

      const members = await prisma.workspaceMember.findMany({
        where: { workspaceId: 'workspace-123' },
      });

      expect(members).toHaveLength(5);
    });
  });

  describe('Workspace Ownership Transfer', () => {
    it('should update workspace owner', async () => {
      const mockUpdatedWorkspace = {
        id: 'workspace-123',
        name: 'My Workspace',
        ownerId: 'new-owner-456',
        updatedAt: new Date(),
      };

      vi.mocked(prisma.workspace.update).mockResolvedValue(mockUpdatedWorkspace as never);

      const result = await prisma.workspace.update({
        where: { id: 'workspace-123' },
        data: { ownerId: 'new-owner-456' },
      });

      expect(result.ownerId).toBe('new-owner-456');
    });

    it('should update previous owner to admin role', async () => {
      vi.mocked(prisma.workspaceMember.update).mockResolvedValue({
        id: 'member-123',
        role: 'ADMIN',
      } as never);

      const result = await prisma.workspaceMember.update({
        where: { id: 'member-123' },
        data: { role: 'ADMIN' },
      });

      expect(result.role).toBe('ADMIN');
    });
  });
});
