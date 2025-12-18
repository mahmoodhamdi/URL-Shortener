import { getTranslations, unstable_setRequestLocale } from 'next-intl/server';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download, ExternalLink, FileJson } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import type { Locale } from '@/i18n/config';

// Dynamically import SwaggerUI to avoid SSR issues
const SwaggerUI = dynamic(
  () => import('@/components/docs/SwaggerUI'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    ),
  }
);

interface PageProps {
  params: { locale: Locale };
}

export default async function ApiDocsPage({ params: { locale } }: PageProps) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations();

  return (
    <div className="container py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{t('apiDocs.title')}</h1>
          <p className="text-muted-foreground">{t('apiDocs.subtitle')}</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>{t('apiDocs.baseUrl')}</CardTitle>
            </CardHeader>
            <CardContent>
              <code className="text-sm bg-muted p-2 rounded block">
                {process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api
              </code>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                OpenAPI Spec
              </CardTitle>
              <CardDescription>
                Download for Swagger, Postman, etc.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-2 flex-wrap">
              <Button asChild variant="outline" size="sm">
                <Link href="/api/docs?format=json" target="_blank">
                  <FileJson className="h-4 w-4 mr-2" />
                  JSON
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/api/docs?format=yaml" target="_blank">
                  <FileText className="h-4 w-4 mr-2" />
                  YAML
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200 dark:border-blue-800">
            <CardHeader>
              <CardTitle className="text-blue-700 dark:text-blue-300">Rate Limits</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1 text-muted-foreground">
              <p><span className="font-medium">Free:</span> 100/day</p>
              <p><span className="font-medium">Starter:</span> 1K/day</p>
              <p><span className="font-medium">Pro:</span> 10K/day</p>
              <p><span className="font-medium">Business:</span> 50K/day</p>
              <p><span className="font-medium">Enterprise:</span> Unlimited</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ExternalLink className="h-5 w-5" />
              Interactive API Explorer
            </CardTitle>
            <CardDescription>
              Try out API endpoints directly from the browser
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <SwaggerUI url="/api/docs" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
