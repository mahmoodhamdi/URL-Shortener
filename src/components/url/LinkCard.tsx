'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Copy,
  Check,
  BarChart3,
  QrCode,
  Pencil,
  Trash2,
  MoreVertical,
  ExternalLink,
  Lock,
  Clock,
} from 'lucide-react';
import { Link } from '@/i18n/routing';
import { formatDate, formatNumber, getBaseUrl, cn } from '@/lib/utils';
import type { Link as LinkType } from '@/types';

interface LinkCardProps {
  link: LinkType;
  locale: string;
  onDelete?: (id: string) => void;
}

export function LinkCard({ link, locale, onDelete }: LinkCardProps) {
  const t = useTranslations();
  const [copied, setCopied] = useState(false);

  const shortCode = link.customAlias || link.shortCode;
  const shortUrl = `${getBaseUrl()}/${shortCode}`;
  const isExpired = link.expiresAt && new Date(link.expiresAt) < new Date();
  const clickCount = link._count?.clicks ?? 0;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shortUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleDelete = async () => {
    if (onDelete) {
      onDelete(link.id);
    }
  };

  return (
    <Card className={cn('transition-colors', isExpired && 'opacity-60')}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0 space-y-1">
            {/* Short URL */}
            <div className="flex items-center gap-2">
              <a
                href={shortUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary hover:underline truncate"
              >
                {shortUrl.replace(/^https?:\/\//, '')}
              </a>
              {link.password && (
                <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              {isExpired && (
                <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded">
                  {t('linkCard.expired')}
                </span>
              )}
            </div>

            {/* Original URL */}
            <p className="text-sm text-muted-foreground truncate">
              {link.originalUrl}
            </p>

            {/* Stats */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>
                {formatNumber(clickCount, locale)} {t('linkCard.clicks')}
              </span>
              <span>
                {t('linkCard.created')} {formatDate(link.createdAt, locale)}
              </span>
              {link.expiresAt && !isExpired && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {t('linkCard.expires')} {formatDate(link.expiresAt, locale)}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
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

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <a href={shortUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="me-2 h-4 w-4" />
                    {t('linkCard.preview')}
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/${shortCode}/stats`}>
                    <BarChart3 className="me-2 h-4 w-4" />
                    {t('linkCard.stats')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/${shortCode}/qr`}>
                    <QrCode className="me-2 h-4 w-4" />
                    {t('linkCard.qr')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={handleDelete}
                >
                  <Trash2 className="me-2 h-4 w-4" />
                  {t('linkCard.delete')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
