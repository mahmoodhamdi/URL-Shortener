import { nanoid } from 'nanoid';
import { prisma } from '@/lib/db/prisma';
import { normalizeUrl, isValidUrl, isValidAlias } from './validator';
import bcrypt from 'bcryptjs';
import type { Link, CreateLinkInput, UpdateLinkInput } from '@/types';
import { getPlanLimits } from '@/lib/stripe/plans';

export interface CreateLinkOptions extends CreateLinkInput {
  userId?: string;
  folderId?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
}

const SHORT_CODE_LENGTH = 7;
const MAX_SHORT_CODE_RETRIES = 10;

export function generateShortCode(): string {
  return nanoid(SHORT_CODE_LENGTH);
}

export async function isShortCodeAvailable(shortCode: string): Promise<boolean> {
  const existing = await prisma.link.findFirst({
    where: {
      OR: [
        { shortCode },
        { customAlias: shortCode },
      ],
    },
  });
  return !existing;
}

export async function createShortLink(input: CreateLinkOptions): Promise<Link> {
  const normalizedUrl = normalizeUrl(input.url);

  if (!isValidUrl(normalizedUrl)) {
    throw new Error('Invalid URL format');
  }

  // If custom alias provided, validate it
  if (input.customAlias) {
    if (!isValidAlias(input.customAlias)) {
      throw new Error('Invalid alias format');
    }

    const isAvailable = await isShortCodeAvailable(input.customAlias);
    if (!isAvailable) {
      throw new Error('Alias already taken');
    }
  }

  // Generate unique short code with retry logic
  let shortCode = generateShortCode();
  let retries = 0;
  while (!(await isShortCodeAvailable(shortCode))) {
    if (retries >= MAX_SHORT_CODE_RETRIES) {
      throw new Error('Failed to generate unique short code. Please try again.');
    }
    shortCode = generateShortCode();
    retries++;
  }

  // Hash password if provided
  let hashedPassword: string | null = null;
  if (input.password) {
    hashedPassword = await bcrypt.hash(input.password, 10);
  }

  // Use transaction to prevent race conditions in limit checking
  if (input.userId) {
    return await prisma.$transaction(async (tx) => {
      // Lock and check subscription limits
      const subscription = await tx.subscription.findUnique({
        where: { userId: input.userId },
      });

      if (subscription) {
        const limits = getPlanLimits(subscription.plan);
        const linkLimit = limits.linksPerMonth;

        // Check if limit would be exceeded (skip for unlimited plans)
        if (linkLimit !== -1 && subscription.linksUsedThisMonth >= linkLimit) {
          throw new Error(`Link limit reached (${linkLimit}). Upgrade your plan to create more links.`);
        }

        // Increment counter BEFORE creating link (atomic)
        await tx.subscription.update({
          where: { userId: input.userId },
          data: {
            linksUsedThisMonth: { increment: 1 },
          },
        });
      }

      // Create the link
      const link = await tx.link.create({
        data: {
          originalUrl: normalizedUrl,
          shortCode,
          customAlias: input.customAlias || null,
          password: hashedPassword,
          expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
          title: input.title || null,
          description: input.description || null,
          userId: input.userId || null,
          folderId: input.folderId || null,
          utmSource: input.utmSource || null,
          utmMedium: input.utmMedium || null,
          utmCampaign: input.utmCampaign || null,
          utmTerm: input.utmTerm || null,
          utmContent: input.utmContent || null,
        },
        include: {
          _count: {
            select: { clicks: true },
          },
        },
      });

      return link as Link;
    }, {
      isolationLevel: 'Serializable', // Prevent concurrent modifications
    });
  }

  // For anonymous users (no userId), create without transaction
  const link = await prisma.link.create({
    data: {
      originalUrl: normalizedUrl,
      shortCode,
      customAlias: input.customAlias || null,
      password: hashedPassword,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      title: input.title || null,
      description: input.description || null,
      userId: null,
      folderId: input.folderId || null,
      utmSource: input.utmSource || null,
      utmMedium: input.utmMedium || null,
      utmCampaign: input.utmCampaign || null,
      utmTerm: input.utmTerm || null,
      utmContent: input.utmContent || null,
    },
    include: {
      _count: {
        select: { clicks: true },
      },
    },
  });

  return link as Link;
}

export async function getLinkByCode(code: string): Promise<Link | null> {
  const link = await prisma.link.findFirst({
    where: {
      OR: [
        { shortCode: code },
        { customAlias: code },
      ],
    },
    include: {
      _count: {
        select: { clicks: true },
      },
    },
  });

  return link as Link | null;
}

export async function getLinkById(id: string): Promise<Link | null> {
  const link = await prisma.link.findUnique({
    where: { id },
    include: {
      _count: {
        select: { clicks: true },
      },
    },
  });

  return link as Link | null;
}

export async function updateLink(id: string, input: UpdateLinkInput): Promise<Link> {
  const updateData: Record<string, unknown> = {};

  if (input.originalUrl) {
    const normalizedUrl = normalizeUrl(input.originalUrl);
    if (!isValidUrl(normalizedUrl)) {
      throw new Error('Invalid URL format');
    }
    updateData.originalUrl = normalizedUrl;
  }

  if (input.customAlias !== undefined) {
    if (input.customAlias && !isValidAlias(input.customAlias)) {
      throw new Error('Invalid alias format');
    }

    if (input.customAlias) {
      const existing = await prisma.link.findFirst({
        where: {
          customAlias: input.customAlias,
          NOT: { id },
        },
      });
      if (existing) {
        throw new Error('Alias already taken');
      }
    }

    updateData.customAlias = input.customAlias || null;
  }

  if (input.password !== undefined) {
    updateData.password = input.password ? await bcrypt.hash(input.password, 10) : null;
  }

  if (input.expiresAt !== undefined) {
    updateData.expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
  }

  if (input.title !== undefined) updateData.title = input.title;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.isActive !== undefined) updateData.isActive = input.isActive;
  if (input.isFavorite !== undefined) updateData.isFavorite = input.isFavorite;

  const link = await prisma.link.update({
    where: { id },
    data: updateData,
    include: {
      _count: {
        select: { clicks: true },
      },
    },
  });

  return link as Link;
}

export async function deleteLink(id: string): Promise<void> {
  await prisma.link.delete({
    where: { id },
  });
}

export async function getAllLinks(options?: {
  search?: string;
  filter?: 'all' | 'active' | 'expired' | 'protected';
  sort?: 'date' | 'clicks' | 'alpha';
}): Promise<Link[]> {
  const where: Record<string, unknown> = {};

  if (options?.search) {
    where.OR = [
      { originalUrl: { contains: options.search, mode: 'insensitive' } },
      { shortCode: { contains: options.search, mode: 'insensitive' } },
      { customAlias: { contains: options.search, mode: 'insensitive' } },
      { title: { contains: options.search, mode: 'insensitive' } },
    ];
  }

  if (options?.filter) {
    const now = new Date();
    switch (options.filter) {
      case 'active':
        where.isActive = true;
        where.OR = [
          { expiresAt: null },
          { expiresAt: { gt: now } },
        ];
        break;
      case 'expired':
        where.expiresAt = { lt: now };
        break;
      case 'protected':
        where.password = { not: null };
        break;
    }
  }

  let orderBy: Record<string, unknown> = { createdAt: 'desc' };
  if (options?.sort === 'alpha') {
    orderBy = { originalUrl: 'asc' };
  }

  const links = await prisma.link.findMany({
    where,
    orderBy,
    include: {
      _count: {
        select: { clicks: true },
      },
    },
  });

  // If sorting by clicks, do it in memory (Prisma doesn't support ordering by count)
  if (options?.sort === 'clicks') {
    links.sort((a, b) => (b._count?.clicks || 0) - (a._count?.clicks || 0));
  }

  return links as Link[];
}

export async function verifyPassword(linkId: string, password: string): Promise<boolean> {
  const link = await prisma.link.findUnique({
    where: { id: linkId },
    select: { password: true },
  });

  if (!link?.password) return true;

  return bcrypt.compare(password, link.password);
}

export function isLinkExpired(link: Link): boolean {
  if (!link.expiresAt) return false;
  return new Date(link.expiresAt) < new Date();
}

export function getShortUrl(code: string, baseUrl?: string): string {
  const base = baseUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${base}/${code}`;
}
