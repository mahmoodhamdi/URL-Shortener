'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type ComponentReport =
  | { status: 'up'; latency_ms: number }
  | { status: 'down'; error: string }
  | { status: 'not_configured' };

type HealthReport = {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime_s: number;
  components: {
    database: ComponentReport;
    redis: ComponentReport;
  };
};

const REFRESH_INTERVAL_MS = 30_000;

function dotClass(status: ComponentReport['status'] | 'unknown') {
  if (status === 'up') return 'bg-emerald-500';
  if (status === 'down') return 'bg-red-500';
  if (status === 'not_configured') return 'bg-gray-400';
  return 'bg-yellow-400';
}

function ComponentRow({ name, report }: { name: string; report: ComponentReport }) {
  const label =
    report.status === 'up'
      ? `Operational · ${report.latency_ms} ms`
      : report.status === 'down'
        ? `Degraded — ${report.error}`
        : 'Not configured';
  return (
    <div className="flex items-center justify-between py-3 border-b last:border-b-0">
      <div className="flex items-center gap-3">
        <span
          className={`inline-block h-3 w-3 rounded-full ${dotClass(report.status)}`}
          aria-hidden
        />
        <span className="font-medium">{name}</span>
      </div>
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );
}

export function StatusBoard() {
  const [report, setReport] = useState<HealthReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch('/api/health', { cache: 'no-store' });
        const data = (await res.json()) as HealthReport;
        if (!cancelled) {
          setReport(data);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'fetch failed');
        }
      }
    }
    load();
    const id = setInterval(load, REFRESH_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6 text-red-600">
          Status endpoint is unreachable: {error}
        </CardContent>
      </Card>
    );
  }

  if (!report) {
    return (
      <Card>
        <CardContent className="pt-6 text-muted-foreground">
          Loading status…
        </CardContent>
      </Card>
    );
  }

  const overall = report.status === 'healthy' ? 'All systems operational' : 'Service degradation';
  const overallColor =
    report.status === 'healthy' ? 'text-emerald-600' : 'text-red-600';

  return (
    <Card>
      <CardHeader>
        <CardTitle className={overallColor}>{overall}</CardTitle>
        <p className="text-sm text-muted-foreground">
          Version {report.version} · Uptime {Math.floor(report.uptime_s / 60)} min ·
          Last check {new Date(report.timestamp).toLocaleTimeString()}
        </p>
      </CardHeader>
      <CardContent>
        <ComponentRow name="API & web server" report={{ status: 'up', latency_ms: 0 }} />
        <ComponentRow name="Database (PostgreSQL)" report={report.components.database} />
        <ComponentRow name="Cache (Redis)" report={report.components.redis} />
      </CardContent>
    </Card>
  );
}
