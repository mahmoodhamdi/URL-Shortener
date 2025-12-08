'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Link2, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { UrlResult } from './UrlResult';
import { cn } from '@/lib/utils';
import type { Link } from '@/types';

export function UrlShortener() {
  const t = useTranslations();
  const [url, setUrl] = useState('');
  const [customAlias, setCustomAlias] = useState('');
  const [showCustomize, setShowCustomize] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Link | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/shorten', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          customAlias: customAlias || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t('errors.serverError'));
      }

      setResult(data);
      setUrl('');
      setCustomAlias('');
      setShowCustomize(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.serverError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
  };

  if (result) {
    return <UrlResult link={result} onReset={handleReset} />;
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="url" className="sr-only">
              URL
            </Label>
            <div className="relative">
              <Link2 className="absolute start-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                id="url"
                type="text"
                placeholder={t('home.placeholder')}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="ps-10 h-12 text-lg"
                data-testid="url-input"
                required
              />
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            className="w-full justify-between"
            onClick={() => setShowCustomize(!showCustomize)}
          >
            {t('home.customize')}
            {showCustomize ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>

          <div
            className={cn(
              'overflow-hidden transition-all duration-200',
              showCustomize ? 'max-h-24 opacity-100' : 'max-h-0 opacity-0'
            )}
          >
            <div className="space-y-2 pb-2">
              <Label htmlFor="customAlias">{t('home.customAlias')}</Label>
              <Input
                id="customAlias"
                type="text"
                placeholder={t('home.aliasPlaceholder')}
                value={customAlias}
                onChange={(e) => setCustomAlias(e.target.value)}
                pattern="^[a-zA-Z0-9-]*$"
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <Button
            type="submit"
            className="w-full h-12 text-lg"
            disabled={isLoading || !url}
            data-testid="shorten-btn"
          >
            {isLoading ? (
              <>
                <Loader2 className="me-2 h-5 w-5 animate-spin" />
                {t('home.shortening')}
              </>
            ) : (
              t('home.shorten')
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
