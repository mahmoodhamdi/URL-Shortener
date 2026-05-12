import type { Metadata } from 'next';
import { unstable_setRequestLocale } from 'next-intl/server';
import { StatusBoard } from '@/components/status/StatusBoard';
import type { Locale } from '@/i18n/config';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Status',
  description: 'Live operational status of the URL Shortener platform.',
  robots: { index: true, follow: true },
};

export default function StatusPage({
  params: { locale },
}: {
  params: { locale: Locale };
}) {
  unstable_setRequestLocale(locale);
  return (
    <div className="container mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-4xl font-bold mb-2">System Status</h1>
      <p className="text-muted-foreground mb-8">
        Live operational status. Refreshes automatically every 30 seconds.
      </p>
      <StatusBoard />
    </div>
  );
}
