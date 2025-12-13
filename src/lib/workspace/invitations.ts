/**
 * Workspace Invitation Management
 */

import { prisma } from '@/lib/db/prisma';
import { nanoid } from 'nanoid';
import type { WorkspaceRole } from './permissions';

const INVITATION_EXPIRY_DAYS = 7;

/**
 * Generate a unique invitation token
 */
export function generateInvitationToken(): string {
  return nanoid(32);
}

/**
 * Create a workspace invitation
 */
export async function createInvitation(
  workspaceId: string,
  email: string,
  role: WorkspaceRole,
  invitedBy: string
) {
  const token = generateInvitationToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRY_DAYS);

  const invitation = await prisma.workspaceInvitation.create({
    data: {
      workspaceId,
      email: email.toLowerCase(),
      role,
      token,
      expiresAt,
      invitedBy,
    },
    include: {
      workspace: {
        select: { id: true, name: true, slug: true },
      },
    },
  });

  return invitation;
}

/**
 * Get invitation by token
 */
export async function getInvitationByToken(token: string) {
  return prisma.workspaceInvitation.findUnique({
    where: { token },
    include: {
      workspace: {
        select: { id: true, name: true, slug: true },
      },
    },
  });
}

/**
 * Get all invitations for a workspace
 */
export async function getWorkspaceInvitations(workspaceId: string) {
  return prisma.workspaceInvitation.findMany({
    where: { workspaceId },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Get pending invitations for a user by email
 */
export async function getPendingInvitationsForEmail(email: string) {
  return prisma.workspaceInvitation.findMany({
    where: {
      email: email.toLowerCase(),
      expiresAt: { gt: new Date() },
    },
    include: {
      workspace: {
        select: { id: true, name: true, slug: true },
      },
    },
  });
}

/**
 * Check if a user is already invited to a workspace
 */
export async function isAlreadyInvited(workspaceId: string, email: string): Promise<boolean> {
  const existing = await prisma.workspaceInvitation.findUnique({
    where: {
      workspaceId_email: {
        workspaceId,
        email: email.toLowerCase(),
      },
    },
  });
  return !!existing;
}

/**
 * Check if a user is already a member of a workspace
 */
export async function isAlreadyMember(workspaceId: string, email: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true },
  });

  if (!user) return false;

  const member = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId: user.id,
      },
    },
  });

  return !!member;
}

/**
 * Accept an invitation
 */
export async function acceptInvitation(token: string, userId: string) {
  const invitation = await getInvitationByToken(token);

  if (!invitation) {
    throw new Error('Invitation not found');
  }

  if (invitation.expiresAt < new Date()) {
    throw new Error('Invitation has expired');
  }

  // Check if user email matches invitation email
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  if (user?.email.toLowerCase() !== invitation.email.toLowerCase()) {
    throw new Error('This invitation is for a different email address');
  }

  // Check if already a member
  const existingMember = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId: invitation.workspaceId,
        userId,
      },
    },
  });

  if (existingMember) {
    // Delete the invitation since they're already a member
    await prisma.workspaceInvitation.delete({
      where: { id: invitation.id },
    });
    throw new Error('You are already a member of this workspace');
  }

  // Add user to workspace and delete invitation
  const [member] = await prisma.$transaction([
    prisma.workspaceMember.create({
      data: {
        workspaceId: invitation.workspaceId,
        userId,
        role: invitation.role,
      },
      include: {
        workspace: {
          select: { id: true, name: true, slug: true },
        },
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    }),
    prisma.workspaceInvitation.delete({
      where: { id: invitation.id },
    }),
  ]);

  return member;
}

/**
 * Decline/Cancel an invitation
 */
export async function deleteInvitation(invitationId: string) {
  return prisma.workspaceInvitation.delete({
    where: { id: invitationId },
  });
}

/**
 * Delete expired invitations (cleanup)
 */
export async function cleanupExpiredInvitations() {
  return prisma.workspaceInvitation.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  });
}

/**
 * Resend invitation (generate new token and expiry)
 */
export async function resendInvitation(invitationId: string) {
  const token = generateInvitationToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRY_DAYS);

  return prisma.workspaceInvitation.update({
    where: { id: invitationId },
    data: {
      token,
      expiresAt,
    },
    include: {
      workspace: {
        select: { id: true, name: true, slug: true },
      },
    },
  });
}
