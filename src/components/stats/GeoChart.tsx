'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface GeoChartProps {
  data: { country: string; count: number }[];
}

export function GeoChart({ data }: GeoChartProps) {
  const t = useTranslations();

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('stats.topCountries')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            {t('stats.noData')}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('stats.topCountries')}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={256}>
          <BarChart data={data.slice(0, 5)} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis type="number" tick={{ fontSize: 12 }} />
            <YAxis
              dataKey="country"
              type="category"
              tick={{ fontSize: 12 }}
              width={100}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                borderColor: 'hsl(var(--border))',
              }}
            />
            <Bar dataKey="count" fill="hsl(var(--primary))" radius={4} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
