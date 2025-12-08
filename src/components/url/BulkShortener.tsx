'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Copy, Download, Check, X } from 'lucide-react';
import { getBaseUrl } from '@/lib/utils';
import type { BulkShortenResult } from '@/types';

const MAX_URLS = 100;

export function BulkShortener() {
  const t = useTranslations();
  const [urls, setUrls] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<BulkShortenResult | null>(null);
  const [copied, setCopied] = useState(false);

  const urlLines = urls.split('\n').filter((line) => line.trim());
  const urlCount = urlLines.length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/shorten/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          urls: urlLines,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t('errors.serverError'));
      }

      setResult(data);
    } catch (err) {
      console.error('Bulk shorten error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyAll = async () => {
    if (!result) return;
    const text = result.success
      .map((item) => `${item.originalUrl} -> ${item.shortUrl}`)
      .join('\n');

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleDownload = () => {
    if (!result) return;

    const lines = [
      'Original URL,Short URL',
      ...result.success.map((item) => `"${item.originalUrl}","${item.shortUrl}"`),
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'shortened-urls.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    setUrls('');
    setResult(null);
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>{t('bulk.title')}</CardTitle>
        <CardDescription>{t('bulk.subtitle')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Textarea
              placeholder={t('bulk.placeholder')}
              value={urls}
              onChange={(e) => setUrls(e.target.value)}
              rows={8}
              className="font-mono text-sm"
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>
                {t('bulk.urlCount', { count: urlCount })}
              </span>
              <span>
                {t('bulk.maxUrls', { max: MAX_URLS })}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={isLoading || urlCount === 0 || urlCount > MAX_URLS}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                  {t('bulk.shortening')}
                </>
              ) : (
                t('bulk.shorten')
              )}
            </Button>
            <Button type="button" variant="outline" onClick={handleClear}>
              {t('bulk.clear')}
            </Button>
          </div>
        </form>

        {result && (
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{t('bulk.results')}</h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCopyAll}>
                  {copied ? (
                    <Check className="me-2 h-4 w-4" />
                  ) : (
                    <Copy className="me-2 h-4 w-4" />
                  )}
                  {t('bulk.copyAll')}
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownload}>
                  <Download className="me-2 h-4 w-4" />
                  {t('bulk.downloadAll')}
                </Button>
              </div>
            </div>

            {result.success.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-green-600">
                  <Check className="inline h-4 w-4 me-1" />
                  {t('bulk.success', { count: result.success.length })}
                </p>
                <div className="max-h-64 overflow-y-auto space-y-1 rounded-md border p-2">
                  {result.success.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 text-sm font-mono p-1 hover:bg-muted rounded"
                    >
                      <span className="truncate flex-1 text-muted-foreground">
                        {item.originalUrl}
                      </span>
                      <span className="text-muted-foreground">-&gt;</span>
                      <a
                        href={item.shortUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {item.shortUrl.replace(/^https?:\/\//, '')}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.failed.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-destructive">
                  <X className="inline h-4 w-4 me-1" />
                  {t('bulk.failed', { count: result.failed.length })}
                </p>
                <div className="max-h-32 overflow-y-auto space-y-1 rounded-md border border-destructive/20 p-2">
                  {result.failed.map((item, index) => (
                    <div
                      key={index}
                      className="text-sm p-1 text-destructive"
                    >
                      <span className="font-mono truncate">{item.originalUrl}</span>
                      <span className="text-muted-foreground ms-2">({item.error})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
