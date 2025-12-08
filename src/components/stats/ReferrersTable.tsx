'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatNumber } from '@/lib/utils';

interface ReferrersTableProps {
  data: { referrer: string; count: number }[];
  locale: string;
}

export function ReferrersTable({ data, locale }: ReferrersTableProps) {
  const t = useTranslations();

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('stats.topReferrers')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-32 flex items-center justify-center text-muted-foreground">
            {t('stats.noData')}
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalClicks = data.reduce((sum, item) => sum + item.count, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('stats.topReferrers')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.slice(0, 5).map((item) => {
            const percentage = Math.round((item.count / totalClicks) * 100);
            return (
              <div key={item.referrer} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="truncate flex-1 me-4 font-medium">
                    {item.referrer}
                  </span>
                  <span className="text-muted-foreground">
                    {formatNumber(item.count, locale)}
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
