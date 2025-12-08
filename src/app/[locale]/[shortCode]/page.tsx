'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';

interface PageProps {
  params: { shortCode: string };
}

export default function RedirectPage({ params }: PageProps) {
  const t = useTranslations();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const redirect = async () => {
      try {
        const response = await fetch(`/api/r/${params.shortCode}`);
        const data = await response.json();

        if (!response.ok) {
          if (data.requiresPassword) {
            // Redirect to password page
            window.location.href = `/${params.shortCode}/preview`;
            return;
          }
          throw new Error(data.error || 'Link not found');
        }

        // Redirect to the original URL
        window.location.href = data.originalUrl;
      } catch (err) {
        setError(err instanceof Error ? err.message : t('errors.linkNotFound'));
      }
    };

    redirect();
  }, [params.shortCode, t]);

  if (error) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">{t('errors.linkNotFound')}</h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
        <p className="text-muted-foreground">{t('common.loading')}</p>
      </div>
    </div>
  );
}
