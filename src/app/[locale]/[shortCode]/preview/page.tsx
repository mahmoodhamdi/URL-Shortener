'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, ExternalLink, Lock, Loader2 } from 'lucide-react';
import { Link } from '@/i18n/routing';
import type { Link as LinkType } from '@/types';

interface PageProps {
  params: { shortCode: string };
}

export default function PreviewPage({ params }: PageProps) {
  const t = useTranslations();
  const [link, setLink] = useState<LinkType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [requiresPassword, setRequiresPassword] = useState(false);

  useEffect(() => {
    const fetchLink = async () => {
      try {
        const response = await fetch(`/api/r/${params.shortCode}`);
        const data = await response.json();

        if (data.requiresPassword) {
          setRequiresPassword(true);
          setLoading(false);
          return;
        }

        if (!response.ok) {
          throw new Error(data.error || 'Link not found');
        }

        setLink(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load link');
      } finally {
        setLoading(false);
      }
    };

    fetchLink();
  }, [params.shortCode]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    try {
      const response = await fetch(`/api/r/${params.shortCode}`, {
        headers: {
          'x-link-password': password,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        setPasswordError(t('password.incorrect'));
        return;
      }

      // Redirect to the original URL
      window.location.href = data.originalUrl;
    } catch {
      setPasswordError(t('errors.serverError'));
    }
  };

  const handleContinue = () => {
    if (link) {
      window.location.href = link.originalUrl;
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-12">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6 text-center">
            <h1 className="text-xl font-bold mb-2">{t('errors.linkNotFound')}</h1>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button asChild>
              <Link href="/">
                <ArrowLeft className="me-2 h-4 w-4" />
                {t('preview.goBack')}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (requiresPassword) {
    return (
      <div className="container py-12">
        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>{t('password.title')}</CardTitle>
            <CardDescription>{t('password.subtitle')}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <Input
                type="password"
                placeholder={t('password.placeholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {passwordError && (
                <p className="text-sm text-destructive">{passwordError}</p>
              )}
              <Button type="submit" className="w-full">
                {t('password.submit')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-12">
      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <CardTitle>{t('preview.title')}</CardTitle>
          <CardDescription>{t('preview.warning')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">{t('preview.destination')}</p>
            <p className="font-mono text-sm break-all">{link?.originalUrl}</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={handleContinue} className="flex-1">
              <ExternalLink className="me-2 h-4 w-4" />
              {t('preview.continue')}
            </Button>
            <Button variant="outline" asChild className="flex-1">
              <Link href="/">
                <ArrowLeft className="me-2 h-4 w-4" />
                {t('preview.goBack')}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
