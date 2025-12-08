'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';

interface DevicesChartProps {
  data: { device: string; count: number }[];
}

const COLORS = ['hsl(var(--primary))', 'hsl(221 83% 63%)', 'hsl(221 83% 73%)'];

export function DevicesChart({ data }: DevicesChartProps) {
  const t = useTranslations();

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('stats.devices')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            {t('stats.noData')}
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map((item) => ({
    name: item.device === 'desktop'
      ? t('stats.desktop')
      : item.device === 'mobile'
      ? t('stats.mobile')
      : item.device === 'tablet'
      ? t('stats.tablet')
      : t('stats.unknown'),
    value: item.count,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('stats.devices')}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={256}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                borderColor: 'hsl(var(--border))',
              }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
