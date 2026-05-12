import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    workspaceInvitation: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    workspaceMember: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { prisma } from '@/lib/db/prisma';
import {
  generateInvitationToken,
  createInvitation,
  getInvitationByToken,
  getWorkspaceInvitations,
  getPendingInvitationsForEmail,
  isAlreadyInvited,
  isAlreadyMember,
  acceptInvitation,
  deleteInvitation,
  cleanupExpiredInvitations,
  resendInvitation,
} from '@/lib/workspace/invitations';

const p = prisma as unknown as {
  workspaceInvitation: Record<string, ReturnType<typeof vi.fn>>;
  workspaceMember: Record<string, ReturnType<typeof vi.fn>>;
  user: Record<string, ReturnType<typeof vi.fn>>;
  $transaction: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('workspace invitations', () => {
  describe('generateInvitationToken', () => {
    it('returns a 32-character url-safe token', () => {
      const t1 = generateInvitationToken();
      const t2 = generateInvitationToken();
      expect(t1).toHaveLength(32);
      expect(t2).toHaveLength(32);
      expect(t1).not.toBe(t2);
    });
  });

  describe('createInvitation', () => {
    it('persists with a 7-day expiry and normalized lowercase email', async () => {
      p.workspaceInvitation.create.mockResolvedValue({ id: 'i1' });
      await createInvitation('w1', 'NEW@Example.com', 'MEMBER', 'user-1');
      const call = p.workspaceInvitation.create.mock.calls[0][0];
      expect(call.data.email).toBe('new@example.com');
      expect(call.data.workspaceId).toBe('w1');
      expect(call.data.role).toBe('MEMBER');
      expect(call.data.invitedBy).toBe('user-1');
      const days =
        (call.data.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      expect(days).toBeGreaterThan(6.9);
      expect(days).toBeLessThan(7.1);
      expect(typeof call.data.token).toBe('string');
    });
  });

  describe('lookups', () => {
    it('getInvitationByToken queries by token', async () => {
      p.workspaceInvitation.findUnique.mockResolvedValue({ id: 'i1' });
      await getInvitationByToken('tok');
      expect(p.workspaceInvitation.findUnique.mock.calls[0][0].where).toEqual({
        token: 'tok',
      });
    });

    it('getWorkspaceInvitations returns ordered list', async () => {
      p.workspaceInvitation.findMany.mockResolvedValue([]);
      await getWorkspaceInvitations('w1');
      const call = p.workspaceInvitation.findMany.mock.calls[0][0];
      expect(call.where).toEqual({ workspaceId: 'w1' });
      expect(call.orderBy).toEqual({ createdAt: 'desc' });
    });

    it('getPendingInvitationsForEmail filters by gt-now expiry and lowercase email', async () => {
      p.workspaceInvitation.findMany.mockResolvedValue([]);
      await getPendingInvitationsForEmail('Mixed@Case.com');
      const call = p.workspaceInvitation.findMany.mock.calls[0][0];
      expect(call.where.email).toBe('mixed@case.com');
      expect(call.where.expiresAt.gt).toBeInstanceOf(Date);
    });
  });

  describe('isAlreadyInvited', () => {
    it('returns true when a matching invitation exists', async () => {
      p.workspaceInvitation.findUnique.mockResolvedValue({ id: 'i1' });
      expect(await isAlreadyInvited('w1', 'a@b.com')).toBe(true);
    });

    it('returns false when no match', async () => {
      p.workspaceInvitation.findUnique.mockResolvedValue(null);
      expect(await isAlreadyInvited('w1', 'a@b.com')).toBe(false);
    });
  });

  describe('isAlreadyMember', () => {
    it('returns false when the email has no user record', async () => {
      p.user.findUnique.mockResolvedValue(null);
      expect(await isAlreadyMember('w1', 'nobody@example.com')).toBe(false);
      expect(p.workspaceMember.findUnique).not.toHaveBeenCalled();
    });

    it('returns true when the user has a workspace membership', async () => {
      p.user.findUnique.mockResolvedValue({ id: 'u1' });
      p.workspaceMember.findUnique.mockResolvedValue({ id: 'm1' });
      expect(await isAlreadyMember('w1', 'u1@example.com')).toBe(true);
    });

    it('returns false when the user exists but is not in the workspace', async () => {
      p.user.findUnique.mockResolvedValue({ id: 'u1' });
      p.workspaceMember.findUnique.mockResolvedValue(null);
      expect(await isAlreadyMember('w1', 'u1@example.com')).toBe(false);
    });
  });

  describe('acceptInvitation', () => {
    const futureDate = () => new Date(Date.now() + 1000 * 60 * 60 * 24);
    const pastDate = () => new Date(Date.now() - 1000 * 60 * 60 * 24);

    it('throws when the token is not found', async () => {
      p.workspaceInvitation.findUnique.mockResolvedValue(null);
      await expect(acceptInvitation('tok', 'user-1')).rejects.toThrow(/not found/i);
    });

    it('throws when the invitation has expired', async () => {
      p.workspaceInvitation.findUnique.mockResolvedValue({
        id: 'i1',
        email: 'a@b.com',
        expiresAt: pastDate(),
      });
      await expect(acceptInvitation('tok', 'user-1')).rejects.toThrow(/expired/i);
    });

    it('throws when the signed-in user has a different email', async () => {
      p.workspaceInvitation.findUnique.mockResolvedValue({
        id: 'i1',
        email: 'invited@example.com',
        expiresAt: futureDate(),
      });
      p.user.findUnique.mockResolvedValue({ email: 'someone-else@example.com' });
      await expect(acceptInvitation('tok', 'user-1')).rejects.toThrow(
        /different email/i
      );
    });

    it('deletes the invitation and throws when the user is already a member', async () => {
      p.workspaceInvitation.findUnique.mockResolvedValue({
        id: 'i1',
        workspaceId: 'w1',
        email: 'a@b.com',
        expiresAt: futureDate(),
        role: 'MEMBER',
      });
      p.user.findUnique.mockResolvedValue({ email: 'a@b.com' });
      p.workspaceMember.findUnique.mockResolvedValue({ id: 'm1' });

      await expect(acceptInvitation('tok', 'user-1')).rejects.toThrow(
        /already a member/i
      );
      expect(p.workspaceInvitation.delete).toHaveBeenCalledWith({
        where: { id: 'i1' },
      });
    });

    it('creates membership and removes invitation in a transaction on success', async () => {
      p.workspaceInvitation.findUnique.mockResolvedValue({
        id: 'i1',
        workspaceId: 'w1',
        email: 'a@b.com',
        expiresAt: futureDate(),
        role: 'EDITOR',
      });
      p.user.findUnique.mockResolvedValue({ email: 'a@b.com' });
      p.workspaceMember.findUnique.mockResolvedValue(null);
      p.$transaction.mockResolvedValue([{ id: 'm1' }, {}]);

      const result = await acceptInvitation('tok', 'user-1');
      expect(p.$transaction).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ id: 'm1' });
    });
  });

  describe('housekeeping', () => {
    it('deleteInvitation removes by id', async () => {
      p.workspaceInvitation.delete.mockResolvedValue({ id: 'i1' });
      await deleteInvitation('i1');
      expect(p.workspaceInvitation.delete.mock.calls[0][0]).toEqual({
        where: { id: 'i1' },
      });
    });

    it('cleanupExpiredInvitations deletes invitations where expiresAt is in the past', async () => {
      p.workspaceInvitation.deleteMany.mockResolvedValue({ count: 3 });
      await cleanupExpiredInvitations();
      const call = p.workspaceInvitation.deleteMany.mock.calls[0][0];
      expect(call.where.expiresAt.lt).toBeInstanceOf(Date);
    });

    it('resendInvitation rotates token and pushes expiry forward', async () => {
      p.workspaceInvitation.update.mockResolvedValue({ id: 'i1' });
      await resendInvitation('i1');
      const call = p.workspaceInvitation.update.mock.calls[0][0];
      expect(call.where).toEqual({ id: 'i1' });
      expect(typeof call.data.token).toBe('string');
      expect(call.data.token).toHaveLength(32);
      const days =
        (call.data.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      expect(days).toBeGreaterThan(6.9);
    });
  });
});
