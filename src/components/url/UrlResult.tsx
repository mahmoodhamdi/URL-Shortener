'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Copy, Check, QrCode, BarChart3, Plus, ExternalLink } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { QrGenerator } from './QrGenerator';
import { getBaseUrl } from '@/lib/utils';
import type { Link as LinkType } from '@/types';

interface UrlResultProps {
  link: LinkType;
  onReset: () => void;
}

export function UrlResult({ link, onReset }: UrlResultProps) {
  const t = useTranslations();
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);

  const shortCode = link.customAlias || link.shortCode;
  const shortUrl = `${getBaseUrl()}/${shortCode}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shortUrl);
      setCopied(true);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  return (
    <Card className="w-full max-w-2xl mx-auto" data-testid="result-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Check className="h-5 w-5 text-green-500" />
          {t('result.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Short URL */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            {t('result.shortUrl')}
          </label>
          <div className="flex gap-2">
            <Input
              value={shortUrl}
              readOnly
              className="font-mono"
              data-testid="short-url"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={handleCopy}
              className="shrink-0"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="outline"
              size="icon"
              asChild
              className="shrink-0"
            >
              <a href={shortUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </div>
          {copied && (
            <p className="text-sm text-green-600">{t('result.copySuccess')}</p>
          )}
        </div>

        {/* Original URL */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            {t('result.originalUrl')}
          </label>
          <p className="text-sm truncate text-muted-foreground">
            {link.originalUrl}
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => setShowQr(!showQr)}
            data-testid="qr-btn"
          >
            <QrCode className="me-2 h-4 w-4" />
            {t('result.qrCode')}
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/${shortCode}/stats`}>
              <BarChart3 className="me-2 h-4 w-4" />
              {t('result.viewStats')}
            </Link>
          </Button>
          <Button onClick={onReset}>
            <Plus className="me-2 h-4 w-4" />
            {t('result.createAnother')}
          </Button>
        </div>

        {/* QR Code */}
        {showQr && (
          <div className="pt-4 border-t" data-testid="qr-code">
            <QrGenerator url={shortUrl} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
