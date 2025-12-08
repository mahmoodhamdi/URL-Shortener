import { useTranslations } from 'next-intl';
import { unstable_setRequestLocale } from 'next-intl/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Locale } from '@/i18n/config';

interface PageProps {
  params: { locale: Locale };
}

export default function ApiDocsPage({ params: { locale } }: PageProps) {
  unstable_setRequestLocale(locale);
  const t = useTranslations();

  const endpoints = [
    {
      method: 'POST',
      path: '/api/shorten',
      description: 'Create a short URL',
      body: `{
  "url": "https://example.com/long-url",
  "customAlias": "my-link", // optional
  "password": "secret", // optional
  "expiresAt": "2024-12-31T23:59:59Z" // optional
}`,
      response: `{
  "id": "cuid",
  "originalUrl": "https://example.com/long-url",
  "shortCode": "abc1234",
  "customAlias": "my-link",
  "createdAt": "2024-01-01T00:00:00Z"
}`,
    },
    {
      method: 'POST',
      path: '/api/shorten/bulk',
      description: 'Shorten multiple URLs at once',
      body: `{
  "urls": [
    "https://example1.com",
    "https://example2.com"
  ]
}`,
      response: `{
  "success": [
    { "originalUrl": "...", "shortUrl": "...", "shortCode": "..." }
  ],
  "failed": [
    { "originalUrl": "...", "error": "..." }
  ]
}`,
    },
    {
      method: 'GET',
      path: '/api/links',
      description: 'Get all links',
      params: 'search, filter, sort',
      response: `[
  {
    "id": "cuid",
    "originalUrl": "https://example.com",
    "shortCode": "abc1234",
    "_count": { "clicks": 42 }
  }
]`,
    },
    {
      method: 'GET',
      path: '/api/links/[id]/stats',
      description: 'Get link statistics',
      params: 'period (7d, 30d, 90d, all)',
      response: `{
  "link": { ... },
  "stats": {
    "totalClicks": 100,
    "uniqueVisitors": 75,
    "clicksByDate": [...],
    "topCountries": [...],
    "devices": [...]
  }
}`,
    },
    {
      method: 'POST',
      path: '/api/qr',
      description: 'Generate QR code',
      body: `{
  "url": "https://example.com",
  "width": 256,
  "darkColor": "#000000",
  "lightColor": "#ffffff"
}`,
      response: `{
  "dataUrl": "data:image/png;base64,..."
}`,
    },
  ];

  return (
    <div className="container py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{t('apiDocs.title')}</h1>
          <p className="text-muted-foreground">{t('apiDocs.subtitle')}</p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>{t('apiDocs.baseUrl')}</CardTitle>
          </CardHeader>
          <CardContent>
            <code className="text-sm bg-muted p-2 rounded block">
              {typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'}
            </code>
          </CardContent>
        </Card>

        <h2 className="text-2xl font-semibold mb-4">{t('apiDocs.endpoints')}</h2>

        <div className="space-y-6">
          {endpoints.map((endpoint) => (
            <Card key={endpoint.path}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2 py-1 rounded font-mono ${
                      endpoint.method === 'GET'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                        : endpoint.method === 'POST'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                        : endpoint.method === 'PATCH'
                        ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                        : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                    }`}
                  >
                    {endpoint.method}
                  </span>
                  <code className="text-base">{endpoint.path}</code>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">{endpoint.description}</p>

                {endpoint.params && (
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold mb-2">{t('apiDocs.parameters')}</h4>
                    <code className="text-sm bg-muted p-2 rounded block">
                      {endpoint.params}
                    </code>
                  </div>
                )}

                <Tabs defaultValue={endpoint.body ? 'request' : 'response'}>
                  <TabsList>
                    {endpoint.body && (
                      <TabsTrigger value="request">{t('apiDocs.request')}</TabsTrigger>
                    )}
                    <TabsTrigger value="response">{t('apiDocs.response')}</TabsTrigger>
                  </TabsList>
                  {endpoint.body && (
                    <TabsContent value="request">
                      <pre className="text-sm bg-muted p-4 rounded overflow-x-auto">
                        {endpoint.body}
                      </pre>
                    </TabsContent>
                  )}
                  <TabsContent value="response">
                    <pre className="text-sm bg-muted p-4 rounded overflow-x-auto">
                      {endpoint.response}
                    </pre>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
