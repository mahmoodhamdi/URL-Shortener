'use client';

import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/routing';
import { Link2, LayoutDashboard, Layers, FileCode, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

export function MobileNav() {
  const t = useTranslations();
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: t('nav.home'), icon: Link2 },
    { href: '/dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
    { href: '/bulk', label: t('nav.bulk'), icon: Layers },
    { href: '/api-docs', label: t('nav.apiDocs'), icon: FileCode },
    { href: '/settings', label: t('nav.settings'), icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background sm:hidden">
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-2 text-xs transition-colors min-w-[64px]',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
