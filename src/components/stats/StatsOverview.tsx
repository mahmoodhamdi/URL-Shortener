'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MousePointerClick, Users, Clock, Calendar } from 'lucide-react';
import { ErrorBoundaryWrapper } from '@/components/ErrorBoundaryWrapper';
import { formatNumber, formatDate } from '@/lib/utils';
import type { LinkStats, Link } from '@/types';

interface StatsOverviewProps {
  link: Link;
  stats: LinkStats;
  locale: string;
}

function StatsOverviewContent({ link, stats, locale }: StatsOverviewProps) {
  const t = useTranslations();

  // Memoize cards to prevent recalculation on every render
  const cards = useMemo(() => [
    {
      title: t('stats.totalClicks'),
      value: formatNumber(stats.totalClicks, locale),
      icon: MousePointerClick,
    },
    {
      title: t('stats.uniqueVisitors'),
      value: formatNumber(stats.uniqueVisitors, locale),
      icon: Users,
    },
    {
      title: t('stats.lastClick'),
      value: stats.lastClick ? formatDate(stats.lastClick, locale) : '-',
      icon: Clock,
    },
    {
      title: t('stats.created'),
      value: formatDate(link.createdAt, locale),
      icon: Calendar,
    },
  ], [t, stats.totalClicks, stats.uniqueVisitors, stats.lastClick, link.createdAt, locale]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <card.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function StatsOverview(props: StatsOverviewProps) {
  return (
    <ErrorBoundaryWrapper>
      <StatsOverviewContent {...props} />
    </ErrorBoundaryWrapper>
  );
}
