'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher';

export default function SettingsPage() {
  const t = useTranslations();

  return (
    <div className="container py-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{t('settings.title')}</h1>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.appearance')}</CardTitle>
              <CardDescription>
                {t('settings.theme')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>{t('settings.theme')}</Label>
                <ThemeToggle />
              </div>
              <div className="flex items-center justify-between">
                <Label>{t('settings.language')}</Label>
                <LanguageSwitcher />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
