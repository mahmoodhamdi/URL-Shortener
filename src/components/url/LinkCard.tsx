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
  Tag,
  Folder,
} from 'lucide-react';
import { Link } from '@/i18n/routing';
import { formatDate, formatNumber, getBaseUrl, cn } from '@/lib/utils';
import { LinkEditDialog } from './LinkEditDialog';
import type { Link as LinkType } from '@/types';

interface LinkCardProps {
  link: LinkType;
  locale: string;
  onDelete?: (id: string) => void;
  onUpdate?: (updatedLink: LinkType) => void;
}

export function LinkCard({ link, locale, onDelete, onUpdate }: LinkCardProps) {
  const t = useTranslations();
  const [copied, setCopied] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [currentLink, setCurrentLink] = useState(link);

  const shortCode = currentLink.customAlias || currentLink.shortCode;
  const shortUrl = `${getBaseUrl()}/${shortCode}`;
  const isExpired = currentLink.expiresAt && new Date(currentLink.expiresAt) < new Date();
  const clickCount = currentLink._count?.clicks ?? 0;

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
      onDelete(currentLink.id);
    }
  };

  const handleEditSuccess = (updatedLink: LinkType) => {
    setCurrentLink(updatedLink);
    if (onUpdate) {
      onUpdate(updatedLink);
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
              {currentLink.password && (
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
              {currentLink.originalUrl}
            </p>

            {/* Tags */}
            {currentLink.tags && currentLink.tags.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap">
                <Tag className="h-3 w-3 text-muted-foreground" />
                {currentLink.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="text-xs bg-secondary px-1.5 py-0.5 rounded"
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            )}

            {/* Stats */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>
                {formatNumber(clickCount, locale)} {t('linkCard.clicks')}
              </span>
              <span>
                {t('linkCard.created')} {formatDate(currentLink.createdAt, locale)}
              </span>
              {currentLink.folder && (
                <span className="flex items-center gap-1">
                  <Folder className="h-3 w-3" />
                  {currentLink.folder.name}
                </span>
              )}
              {currentLink.expiresAt && !isExpired && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {t('linkCard.expires')} {formatDate(currentLink.expiresAt, locale)}
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
                <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
                  <Pencil className="me-2 h-4 w-4" />
                  {t('linkCard.edit')}
                </DropdownMenuItem>
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

      {/* Edit Dialog */}
      <LinkEditDialog
        link={currentLink}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={handleEditSuccess}
      />
    </Card>
  );
}
