'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Link2 } from 'lucide-react';

export function Footer() {
  const t = useTranslations();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t bg-background">
      <div className="container py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            <span className="font-semibold">{t('common.appName')}</span>
          </div>

          <nav className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">
              {t('footer.privacy')}
            </Link>
            <Link href="/" className="hover:text-foreground transition-colors">
              {t('footer.terms')}
            </Link>
            <Link href="/" className="hover:text-foreground transition-colors">
              {t('footer.contact')}
            </Link>
          </nav>

          <p className="text-sm text-muted-foreground">
            {t('footer.copyright', { year })}
          </p>
        </div>
      </div>
    </footer>
  );
}
