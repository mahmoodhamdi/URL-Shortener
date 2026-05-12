import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { ApiError } from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const headers = Array.from(
    rows.reduce<Set<string>>((acc, r) => {
      for (const k of Object.keys(r)) acc.add(k);
      return acc;
    }, new Set())
  );
  const escape = (v: unknown) => {
    if (v === null || v === undefined) return '';
    const s = typeof v === 'string' ? v : JSON.stringify(v);
    if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  };
  return [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(',')),
  ].join('\n');
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return ApiError.unauthorized('Authentication required');
  }

  const userId = session.user.id;
  const url = new URL(request.url);
  const format = (url.searchParams.get('format') || 'json').toLowerCase();

  const [user, links, clicks, subscriptions, webhooks] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, image: true, createdAt: true },
    }),
    prisma.link.findMany({
      where: { userId },
      select: {
        id: true,
        shortCode: true,
        originalUrl: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        expiresAt: true,
      },
    }),
    prisma.click.findMany({
      where: { link: { userId } },
      select: {
        id: true,
        linkId: true,
        country: true,
        device: true,
        browser: true,
        referrer: true,
        clickedAt: true,
      },
      take: 50_000,
      orderBy: { clickedAt: 'desc' },
    }),
    prisma.subscription.findMany({ where: { userId } }),
    prisma.webhook.findMany({ where: { userId } }),
  ]);

  const payload = {
    exported_at: new Date().toISOString(),
    user,
    links,
    clicks,
    subscriptions,
    webhooks,
  };

  const filenameBase = `url-shortener-export-${userId}-${Date.now()}`;

  if (format === 'csv') {
    const sections = [
      '# user',
      toCsv(user ? [user] : []),
      '',
      '# links',
      toCsv(links as Record<string, unknown>[]),
      '',
      '# clicks',
      toCsv(clicks as Record<string, unknown>[]),
      '',
      '# subscriptions',
      toCsv(subscriptions as unknown as Record<string, unknown>[]),
      '',
      '# webhooks',
      toCsv(webhooks as unknown as Record<string, unknown>[]),
    ];
    return new NextResponse(sections.join('\n'), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filenameBase}.csv"`,
      },
    });
  }

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filenameBase}.json"`,
    },
  });
}
