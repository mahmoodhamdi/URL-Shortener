import { unstable_setRequestLocale } from 'next-intl/server';
import type { Locale } from '@/i18n/config';
import { LegalPage } from '../(legal)/LegalPage';

export const metadata = { title: 'Privacy Policy' };

export default function Page({ params: { locale } }: { params: { locale: Locale } }) {
  unstable_setRequestLocale(locale);
  return <LegalPage pageKey="privacy" />;
}
