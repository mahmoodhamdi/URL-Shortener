import { useTranslations } from 'next-intl';

type LegalKey = 'privacy' | 'terms' | 'contact';

export function LegalPage({ pageKey }: { pageKey: LegalKey }) {
  const t = useTranslations(`legalPages.${pageKey}`);
  return (
    <article className="container mx-auto max-w-3xl px-4 py-16 prose dark:prose-invert">
      <h1>{t('title')}</h1>
      <p className="text-muted-foreground">{t('placeholder')}</p>
    </article>
  );
}
