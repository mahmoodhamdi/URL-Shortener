import { useTranslations } from 'next-intl';
import { unstable_setRequestLocale } from 'next-intl/server';
import { BulkShortener } from '@/components/url/BulkShortener';
import type { Locale } from '@/i18n/config';

interface PageProps {
  params: { locale: Locale };
}

export default function BulkPage({ params: { locale } }: PageProps) {
  unstable_setRequestLocale(locale);

  return (
    <div className="container py-8">
      <BulkShortener />
    </div>
  );
}
