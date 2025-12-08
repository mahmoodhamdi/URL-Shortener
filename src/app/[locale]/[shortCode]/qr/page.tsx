'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { QrGenerator } from '@/components/url/QrGenerator';
import { ArrowLeft } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { getBaseUrl } from '@/lib/utils';

interface PageProps {
  params: { shortCode: string };
}

export default function QrPage({ params }: PageProps) {
  const t = useTranslations();
  const shortUrl = `${getBaseUrl()}/${params.shortCode}`;

  return (
    <div className="container py-8">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">{t('qr.title')}</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center font-mono text-sm text-muted-foreground">
              {shortUrl}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <QrGenerator url={shortUrl} size={300} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
