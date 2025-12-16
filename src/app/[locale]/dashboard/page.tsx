'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LinksList } from '@/components/url/LinksList';
import { ErrorBoundaryWrapper } from '@/components/ErrorBoundaryWrapper';
import { Link2, MousePointerClick, CheckCircle, XCircle, Search, Loader2 } from 'lucide-react';
import { formatNumber } from '@/lib/utils';
import type { Link, SortOption, FilterOption } from '@/types';

function DashboardContent() {
  const t = useTranslations();
  const [links, setLinks] = useState<Link[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortOption>('date');
  const [filter, setFilter] = useState<FilterOption>('all');

  const fetchLinks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (sort) params.set('sort', sort);
      if (filter && filter !== 'all') params.set('filter', filter);

      const response = await fetch(`/api/links?${params}`);
      const data = await response.json();
      setLinks(data);
    } catch (error) {
      console.error('Failed to fetch links:', error);
    } finally {
      setLoading(false);
    }
  }, [search, sort, filter]);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLinks();
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/links/${id}`, { method: 'DELETE' });
      setLinks((prev) => prev.filter((link) => link.id !== id));
    } catch (error) {
      console.error('Failed to delete link:', error);
    }
  };

  // Calculate stats
  const totalLinks = links.length;
  const totalClicks = links.reduce((sum, link) => sum + (link._count?.clicks || 0), 0);
  const activeLinks = links.filter((link) => {
    if (!link.isActive) return false;
    if (link.expiresAt && new Date(link.expiresAt) < new Date()) return false;
    return true;
  }).length;
  const expiredLinks = links.filter((link) => {
    return link.expiresAt && new Date(link.expiresAt) < new Date();
  }).length;

  const stats = [
    { label: t('dashboard.totalLinks'), value: totalLinks, icon: Link2 },
    { label: t('dashboard.totalClicks'), value: totalClicks, icon: MousePointerClick },
    { label: t('dashboard.activeLinks'), value: activeLinks, icon: CheckCircle },
    { label: t('dashboard.expiredLinks'), value: expiredLinks, icon: XCircle },
  ];

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{t('dashboard.title')}</h1>
        <p className="text-muted-foreground">{t('dashboard.subtitle')}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-2 rounded-full bg-primary/10">
                <stat.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatNumber(stat.value)}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('dashboard.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ps-10"
            />
          </div>
          <Button type="submit" variant="secondary">
            {t('common.search')}
          </Button>
        </form>

        <div className="flex gap-2">
          <Select value={sort} onValueChange={(v) => setSort(v as SortOption)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder={t('dashboard.sortBy')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">{t('dashboard.sortDate')}</SelectItem>
              <SelectItem value="clicks">{t('dashboard.sortClicks')}</SelectItem>
              <SelectItem value="alpha">{t('dashboard.sortAlpha')}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filter} onValueChange={(v) => setFilter(v as FilterOption)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder={t('dashboard.filterStatus')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('dashboard.filterAll')}</SelectItem>
              <SelectItem value="active">{t('dashboard.filterActive')}</SelectItem>
              <SelectItem value="expired">{t('dashboard.filterExpired')}</SelectItem>
              <SelectItem value="protected">{t('dashboard.filterProtected')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Links List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <LinksList links={links} onDelete={handleDelete} />
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ErrorBoundaryWrapper>
      <DashboardContent />
    </ErrorBoundaryWrapper>
  );
}
