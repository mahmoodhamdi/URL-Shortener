import { notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { isAdminEmail } from '@/lib/admin';
import { unstable_setRequestLocale } from 'next-intl/server';
import type { Locale } from '@/i18n/config';
import { AdminDashboard } from '@/components/admin/AdminDashboard';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Admin', robots: { index: false, follow: false } };

export default async function AdminPage({
  params: { locale },
}: {
  params: { locale: Locale };
}) {
  unstable_setRequestLocale(locale);
  const session = await auth();
  if (!isAdminEmail(session?.user?.email)) {
    notFound();
  }

  const [userCount, linkCount, clickCount, activeSubs, recentUsers, recentLinks, planBreakdown] =
    await Promise.all([
      prisma.user.count(),
      prisma.link.count(),
      prisma.click.count(),
      prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          subscription: { select: { plan: true, status: true } },
          _count: { select: { links: true } },
        },
      }),
      prisma.link.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          shortCode: true,
          originalUrl: true,
          createdAt: true,
          user: { select: { email: true } },
          _count: { select: { clicks: true } },
        },
      }),
      prisma.subscription.groupBy({
        by: ['plan'],
        _count: { _all: true },
      }),
    ]);

  return (
    <AdminDashboard
      stats={{
        users: userCount,
        links: linkCount,
        clicks: clickCount,
        activeSubscriptions: activeSubs,
        planBreakdown: planBreakdown.map((row) => ({
          plan: row.plan,
          count: row._count._all,
        })),
      }}
      recentUsers={recentUsers.map((u) => ({
        ...u,
        createdAt: u.createdAt.toISOString(),
      }))}
      recentLinks={recentLinks.map((l) => ({
        ...l,
        createdAt: l.createdAt.toISOString(),
      }))}
    />
  );
}
