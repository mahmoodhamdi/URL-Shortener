'use client';

import { useTranslations, useLocale } from 'next-intl';
import { LinkCard } from './LinkCard';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/routing';
import { Plus, Link2 } from 'lucide-react';
import type { Link as LinkType } from '@/types';

interface LinksListProps {
  links: LinkType[];
  onDelete?: (id: string) => void;
}

export function LinksList({ links, onDelete }: LinksListProps) {
  const t = useTranslations();
  const locale = useLocale();

  if (links.length === 0) {
    return (
      <div className="text-center py-12">
        <Link2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">{t('dashboard.noLinks')}</h3>
        <p className="text-muted-foreground mb-4">{t('dashboard.noLinksDesc')}</p>
        <Button asChild>
          <Link href="/">
            <Plus className="me-2 h-4 w-4" />
            {t('dashboard.createFirst')}
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {links.map((link) => (
        <LinkCard
          key={link.id}
          link={link}
          locale={locale}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
