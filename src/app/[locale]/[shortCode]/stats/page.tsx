'use client';

import { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StatsOverview } from '@/components/stats/StatsOverview';
import { ClicksChart } from '@/components/stats/ClicksChart';
import { DevicesChart } from '@/components/stats/DevicesChart';
import { GeoChart } from '@/components/stats/GeoChart';
import { ReferrersTable } from '@/components/stats/ReferrersTable';
import { ArrowLeft, Download, Loader2 } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { getBaseUrl } from '@/lib/utils';
import { exportStatsToCSV, exportStatsToJSON } from '@/lib/analytics/tracker';
import type { Link as LinkType, LinkStats, TimePeriod } from '@/types';

interface PageProps {
  params: { shortCode: string };
}

export default function StatsPage({ params }: PageProps) {
  const t = useTranslations();
  const locale = useLocale();
  const [link, setLink] = useState<LinkType | null>(null);
  const [stats, setStats] = useState<LinkStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<TimePeriod>('all');
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    setLoading(true);
    try {
      // First get the link ID from the shortCode
      const linksResponse = await fetch('/api/links');
      const links: LinkType[] = await linksResponse.json();
      const foundLink = links.find(
        (l) => l.shortCode === params.shortCode || l.customAlias === params.shortCode
      );

      if (!foundLink) {
        setError(t('errors.linkNotFound'));
        return;
      }

      const response = await fetch(
        `/api/links/${foundLink.id}/stats?period=${period}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load stats');
      }

      setLink(data.link);
      setStats(data.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [params.shortCode, period]);

  const handleExportCSV = () => {
    if (!stats) return;
    const csv = exportStatsToCSV(stats);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stats-${params.shortCode}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = () => {
    if (!stats) return;
    const json = exportStatsToJSON(stats);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stats-${params.shortCode}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !link || !stats) {
    return (
      <div className="container py-12">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">{t('errors.linkNotFound')}</h1>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button asChild>
            <Link href="/dashboard">
              <ArrowLeft className="me-2 h-4 w-4" />
              {t('preview.goBack')}
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const shortCode = link.customAlias || link.shortCode;
  const shortUrl = `${getBaseUrl()}/${shortCode}`;

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <h1 className="text-2xl font-bold">{t('stats.title')}</h1>
          </div>
          <p className="text-muted-foreground font-mono">{shortUrl}</p>
        </div>

        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={(v) => setPeriod(v as TimePeriod)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder={t('stats.period')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">{t('stats.last7days')}</SelectItem>
              <SelectItem value="30d">{t('stats.last30days')}</SelectItem>
              <SelectItem value="90d">{t('stats.last90days')}</SelectItem>
              <SelectItem value="all">{t('stats.allTime')}</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="me-2 h-4 w-4" />
            CSV
          </Button>
          <Button variant="outline" onClick={handleExportJSON}>
            <Download className="me-2 h-4 w-4" />
            JSON
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="space-y-6">
        <StatsOverview link={link} stats={stats} locale={locale} />

        <ClicksChart data={stats.clicksByDate} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <DevicesChart data={stats.devices} />
          <GeoChart data={stats.topCountries} />
        </div>

        <ReferrersTable data={stats.topReferrers} locale={locale} />
      </div>
    </div>
  );
}
