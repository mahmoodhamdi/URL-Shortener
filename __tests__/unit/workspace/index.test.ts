import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    workspace: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    workspaceMember: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
  },
}));

import { prisma } from '@/lib/db/prisma';
import {
  isReservedSlug,
  generateSlug,
  WORKSPACE_LIMITS,
  createWorkspace,
  getWorkspaceById,
  getWorkspaceBySlug,
  getUserWorkspaces,
  updateWorkspace,
  deleteWorkspace,
  getUserRole,
  checkWorkspacePermission,
  getWorkspaceMembers,
  addWorkspaceMember,
  updateMemberRole,
} from '@/lib/workspace';

const prismaMock = prisma as unknown as {
  workspace: Record<string, ReturnType<typeof vi.fn>>;
  workspaceMember: Record<string, ReturnType<typeof vi.fn>>;
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('workspace module', () => {
  describe('isReservedSlug', () => {
    it.each([
      ['admin', true],
      ['api', true],
      ['dashboard', true],
      ['settings', true],
      ['custom-name', false],
      ['my-team', false],
      ['ADMIN', true], // case-insensitive
    ])('treats %s as reserved=%s', (slug, expected) => {
      expect(isReservedSlug(slug)).toBe(expected);
    });
  });

  describe('generateSlug', () => {
    it('lowercases, kebab-cases, and trims dashes', () => {
      const slug = generateSlug('My Awesome Workspace!');
      expect(slug).toMatch(/^my-awesome-workspace-[a-z0-9_-]{6}$/i);
    });

    it('prefixes reserved bases with ws-', () => {
      const slug = generateSlug('admin');
      expect(slug.startsWith('ws-admin-')).toBe(true);
    });

    it('truncates very long names so the base never exceeds 30 chars', () => {
      const slug = generateSlug('a'.repeat(80));
      // The slug shape is `${base}-${nanoid(6)}` but nanoid may itself emit
      // a hyphen. The deterministic check is on the leading-a streak.
      const leadingAs = slug.match(/^a+/)?.[0] ?? '';
      expect(leadingAs.length).toBeLessThanOrEqual(30);
    });

    it('appends a 6-char nanoid suffix', () => {
      const slug = generateSlug('team');
      expect(slug).toMatch(/-[A-Za-z0-9_-]{6}$/);
    });
  });

  describe('WORKSPACE_LIMITS', () => {
    it('FREE plan cannot create workspaces', () => {
      expect(WORKSPACE_LIMITS.FREE.workspaces).toBe(0);
    });

    it('ENTERPRISE plan is unlimited', () => {
      expect(WORKSPACE_LIMITS.ENTERPRISE.workspaces).toBe(-1);
      expect(WORKSPACE_LIMITS.ENTERPRISE.membersPerWorkspace).toBe(-1);
    });

    it('paid tiers grow members per workspace', () => {
      expect(WORKSPACE_LIMITS.STARTER.membersPerWorkspace).toBeLessThan(
        WORKSPACE_LIMITS.PRO.membersPerWorkspace
      );
      expect(WORKSPACE_LIMITS.PRO.membersPerWorkspace).toBeLessThan(
        WORKSPACE_LIMITS.BUSINESS.membersPerWorkspace
      );
    });
  });

  describe('createWorkspace', () => {
    it('rejects reserved custom slugs before touching Prisma', async () => {
      await expect(
        createWorkspace('user-1', { name: 'X', slug: 'admin' })
      ).rejects.toThrow(/reserved/i);
      expect(prismaMock.workspace.create).not.toHaveBeenCalled();
    });

    it('generates a slug when none is provided and seeds the OWNER member', async () => {
      prismaMock.workspace.create.mockResolvedValue({ id: 'w1' });
      await createWorkspace('user-1', { name: 'My Team' });
      const call = prismaMock.workspace.create.mock.calls[0][0];
      expect(call.data.slug).toMatch(/^my-team-/);
      expect(call.data.ownerId).toBe('user-1');
      expect(call.data.members.create).toEqual({ userId: 'user-1', role: 'OWNER' });
    });

    it('uses the explicit slug when not reserved', async () => {
      prismaMock.workspace.create.mockResolvedValue({ id: 'w2' });
      await createWorkspace('user-2', { name: 'Test', slug: 'my-team' });
      const call = prismaMock.workspace.create.mock.calls[0][0];
      expect(call.data.slug).toBe('my-team');
    });
  });

  describe('lookups', () => {
    it('getWorkspaceById queries by id', async () => {
      prismaMock.workspace.findUnique.mockResolvedValue({ id: 'w1' });
      await getWorkspaceById('w1');
      expect(prismaMock.workspace.findUnique.mock.calls[0][0].where).toEqual({ id: 'w1' });
    });

    it('getWorkspaceBySlug queries by slug', async () => {
      prismaMock.workspace.findUnique.mockResolvedValue({ id: 'w1' });
      await getWorkspaceBySlug('my-team');
      expect(prismaMock.workspace.findUnique.mock.calls[0][0].where).toEqual({ slug: 'my-team' });
    });

    it('getUserWorkspaces filters by membership', async () => {
      prismaMock.workspace.findMany.mockResolvedValue([]);
      await getUserWorkspaces('user-1');
      const call = prismaMock.workspace.findMany.mock.calls[0][0];
      expect(JSON.stringify(call.where)).toContain('user-1');
    });
  });

  describe('updateWorkspace + deleteWorkspace', () => {
    it('update sends the patch to Prisma', async () => {
      prismaMock.workspace.update.mockResolvedValue({ id: 'w1' });
      await updateWorkspace('w1', { name: 'New' });
      const call = prismaMock.workspace.update.mock.calls[0][0];
      expect(call.where).toEqual({ id: 'w1' });
      expect(call.data.name).toBe('New');
    });

    it('delete removes the workspace by id', async () => {
      prismaMock.workspace.delete.mockResolvedValue({ id: 'w1' });
      await deleteWorkspace('w1');
      expect(prismaMock.workspace.delete.mock.calls[0][0]).toEqual({ where: { id: 'w1' } });
    });
  });

  describe('roles + permissions', () => {
    it('getUserRole returns null when the user has no membership', async () => {
      prismaMock.workspaceMember.findUnique.mockResolvedValue(null);
      expect(await getUserRole('w1', 'user-1')).toBeFalsy();
    });

    it('getUserRole returns the member role', async () => {
      prismaMock.workspaceMember.findUnique.mockResolvedValue({ role: 'ADMIN' });
      expect(await getUserRole('w1', 'user-1')).toBe('ADMIN');
    });

    it('checkWorkspacePermission OWNER beats every action', async () => {
      prismaMock.workspaceMember.findUnique.mockResolvedValue({ role: 'OWNER' });
      expect(
        await checkWorkspacePermission('w1', 'user-1', 'workspace:delete')
      ).toBe(true);
    });

    it('checkWorkspacePermission denies when user is not a member', async () => {
      prismaMock.workspaceMember.findUnique.mockResolvedValue(null);
      expect(
        await checkWorkspacePermission('w1', 'user-1', 'workspace:view')
      ).toBe(false);
    });
  });

  describe('member management', () => {
    it('getWorkspaceMembers queries by workspaceId with relations', async () => {
      prismaMock.workspaceMember.findMany.mockResolvedValue([]);
      await getWorkspaceMembers('w1');
      const call = prismaMock.workspaceMember.findMany.mock.calls[0][0];
      expect(call.where).toEqual({ workspaceId: 'w1' });
      expect(call.include).toBeDefined();
    });

    it('addWorkspaceMember persists the membership', async () => {
      prismaMock.workspaceMember.create.mockResolvedValue({ id: 'm1' });
      await addWorkspaceMember('w1', 'user-2', 'ADMIN');
      const call = prismaMock.workspaceMember.create.mock.calls[0][0];
      expect(call.data).toMatchObject({ workspaceId: 'w1', userId: 'user-2', role: 'ADMIN' });
    });

    it('updateMemberRole updates the role', async () => {
      prismaMock.workspaceMember.update.mockResolvedValue({ id: 'm1' });
      await updateMemberRole('w1', 'user-2', 'ADMIN');
      const call = prismaMock.workspaceMember.update.mock.calls[0][0];
      expect(call.where).toEqual({
        workspaceId_userId: { workspaceId: 'w1', userId: 'user-2' },
      });
      expect(call.data.role).toBe('ADMIN');
    });
  });
});
