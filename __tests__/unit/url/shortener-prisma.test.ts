import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('nanoid', () => ({
  nanoid: vi.fn(() => 'gencode'),
}));

vi.mock('bcryptjs', () => ({
  default: { hash: vi.fn(async () => 'hashed-pw') },
  hash: vi.fn(async () => 'hashed-pw'),
}));

vi.mock('@/lib/stripe/plans', () => ({
  getPlanLimits: vi.fn(() => ({ linksPerMonth: 100 })),
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    link: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    subscription: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(async (fn) => fn({
      link: { create: vi.fn(async (args) => ({ ...args.data, id: 'L1' })) },
      subscription: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
    })),
  },
}));

import { prisma } from '@/lib/db/prisma';
import {
  isShortCodeAvailable,
  createShortLink,
  getLinkByCode,
  getLinkById,
  updateLink,
  deleteLink,
  verifyPassword,
} from '@/lib/url/shortener';

const p = prisma as unknown as {
  link: Record<string, ReturnType<typeof vi.fn>>;
  subscription: Record<string, ReturnType<typeof vi.fn>>;
  $transaction: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('shortener (prisma-mocked)', () => {
  describe('isShortCodeAvailable', () => {
    it('returns true when no existing record matches', async () => {
      p.link.findFirst.mockResolvedValue(null);
      expect(await isShortCodeAvailable('abc')).toBe(true);
    });

    it('returns false when shortCode or customAlias collides', async () => {
      p.link.findFirst.mockResolvedValue({ id: 'L1' });
      expect(await isShortCodeAvailable('abc')).toBe(false);
      // Verifies it queries both columns
      const call = p.link.findFirst.mock.calls[0][0];
      expect(call.where.OR).toEqual([
        { shortCode: 'abc' },
        { customAlias: 'abc' },
      ]);
    });
  });

  describe('createShortLink (anonymous path)', () => {
    it('rejects invalid custom alias format', async () => {
      await expect(
        createShortLink({ url: 'https://x.com', customAlias: 'ab' })
      ).rejects.toThrow(/Invalid alias/);
    });

    it('throws when a requested customAlias is already taken', async () => {
      p.link.findFirst.mockResolvedValue({ id: 'L1' });
      await expect(
        createShortLink({ url: 'https://x.com', customAlias: 'taken' })
      ).rejects.toThrow(/already taken/);
    });

    it('creates a link with a generated short code for anonymous input', async () => {
      p.link.findFirst.mockResolvedValue(null);
      p.link.create.mockResolvedValue({ id: 'L1', shortCode: 'gencode' });
      const result = await createShortLink({ url: 'https://example.com' });
      expect(result.id).toBe('L1');
      const data = p.link.create.mock.calls[0][0].data;
      expect(data.shortCode).toBe('gencode');
      expect(data.userId).toBeNull();
      expect(data.originalUrl).toBe('https://example.com');
    });

    it('hashes the password when one is provided', async () => {
      p.link.findFirst.mockResolvedValue(null);
      p.link.create.mockResolvedValue({ id: 'L1' });
      await createShortLink({ url: 'https://x.com', password: 's3cret' });
      const data = p.link.create.mock.calls[0][0].data;
      expect(data.password).toBe('hashed-pw');
    });

    it('persists optional UTM parameters', async () => {
      p.link.findFirst.mockResolvedValue(null);
      p.link.create.mockResolvedValue({ id: 'L1' });
      await createShortLink({
        url: 'https://x.com',
        utmSource: 'twitter',
        utmMedium: 'cpc',
        utmCampaign: 'launch',
      });
      const data = p.link.create.mock.calls[0][0].data;
      expect(data.utmSource).toBe('twitter');
      expect(data.utmMedium).toBe('cpc');
      expect(data.utmCampaign).toBe('launch');
    });
  });

  describe('lookups', () => {
    it('getLinkByCode searches shortCode OR customAlias', async () => {
      p.link.findFirst.mockResolvedValue({ id: 'L1' });
      await getLinkByCode('foo');
      const call = p.link.findFirst.mock.calls[0][0];
      expect(call.where.OR).toEqual([
        { shortCode: 'foo' },
        { customAlias: 'foo' },
      ]);
    });

    it('getLinkById queries by primary key', async () => {
      p.link.findUnique.mockResolvedValue({ id: 'L1' });
      await getLinkById('L1');
      expect(p.link.findUnique.mock.calls[0][0].where).toEqual({ id: 'L1' });
    });
  });

  describe('updateLink', () => {
    it('passes a normalized URL through to Prisma', async () => {
      p.link.update.mockResolvedValue({ id: 'L1' });
      await updateLink('L1', { originalUrl: 'https://example.com/' });
      const call = p.link.update.mock.calls[0][0];
      expect(call.where).toEqual({ id: 'L1' });
      expect(call.data.originalUrl).toContain('example.com');
    });
  });

  describe('deleteLink', () => {
    it('removes the row by id', async () => {
      p.link.delete.mockResolvedValue({ id: 'L1' });
      await deleteLink('L1');
      expect(p.link.delete.mock.calls[0][0]).toEqual({ where: { id: 'L1' } });
    });
  });

  describe('verifyPassword', () => {
    // The function treats "no password on the link" as "open" — returns true.
    // The interesting branch under test is that the lookup happens.
    it('selects only the password column from the link record', async () => {
      p.link.findUnique.mockResolvedValue({ password: null });
      await verifyPassword('L1', 'whatever');
      const call = p.link.findUnique.mock.calls[0][0];
      expect(call.where).toEqual({ id: 'L1' });
      expect(call.select).toEqual({ password: true });
    });

    it('returns true when the link has no password set', async () => {
      p.link.findUnique.mockResolvedValue({ password: null });
      expect(await verifyPassword('L1', 'whatever')).toBe(true);
    });

    it('returns true for a missing link (defensive default)', async () => {
      p.link.findUnique.mockResolvedValue(null);
      expect(await verifyPassword('L1', 'whatever')).toBe(true);
    });
  });
});
