'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, X, Plus, Eye, EyeOff, Lock, Unlock } from 'lucide-react';
import type { Link as LinkType, Folder, Tag } from '@/types';

interface LinkEditDialogProps {
  link: LinkType | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (updatedLink: LinkType) => void;
}

export function LinkEditDialog({
  link,
  open,
  onOpenChange,
  onSuccess,
}: LinkEditDialogProps) {
  const t = useTranslations();

  // Form state
  const [originalUrl, setOriginalUrl] = useState('');
  const [customAlias, setCustomAlias] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);
  const [changePassword, setChangePassword] = useState(false);
  const [folderId, setFolderId] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  // Data state
  const [folders, setFolders] = useState<Folder[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch folders and tags
  const fetchData = useCallback(async () => {
    setIsFetching(true);
    try {
      const [foldersRes, tagsRes] = await Promise.all([
        fetch('/api/folders'),
        fetch('/api/tags'),
      ]);

      if (foldersRes.ok) {
        const foldersData = await foldersRes.json();
        setFolders(foldersData);
      }

      if (tagsRes.ok) {
        const tagsData = await tagsRes.json();
        setAvailableTags(tagsData);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setIsFetching(false);
    }
  }, []);

  // Initialize form when link changes
  useEffect(() => {
    if (link && open) {
      setOriginalUrl(link.originalUrl);
      setCustomAlias(link.customAlias || '');
      setTitle(link.title || '');
      setDescription(link.description || '');
      setExpiresAt(
        link.expiresAt ? new Date(link.expiresAt).toISOString().slice(0, 16) : ''
      );
      setHasPassword(!!link.password);
      setPassword('');
      setChangePassword(false);
      setFolderId(link.folderId);
      setTags(link.tags?.map((tag) => tag.name) || []);
      setError(null);
      fetchData();
    }
  }, [link, open, fetchData]);

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim().toLowerCase();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!link) return;

    setError(null);
    setIsLoading(true);

    try {
      // Update link data
      const updateData: Record<string, unknown> = {
        originalUrl,
        customAlias: customAlias || undefined,
        title: title || undefined,
        description: description || undefined,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      };

      // Handle password changes
      if (changePassword) {
        updateData.password = password || null;
      }

      const linkResponse = await fetch(`/api/links/${link.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (!linkResponse.ok) {
        const errorData = await linkResponse.json();
        throw new Error(errorData.error || t('errors.serverError'));
      }

      // Update folder
      const folderResponse = await fetch(`/api/links/${link.id}/folder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId }),
      });

      if (!folderResponse.ok) {
        console.error('Failed to update folder');
      }

      // Update tags
      const tagsResponse = await fetch(`/api/links/${link.id}/tags`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags }),
      });

      if (!tagsResponse.ok) {
        console.error('Failed to update tags');
      }

      // Get the final updated link
      const updatedLinkResponse = await fetch(`/api/links/${link.id}`);
      const updatedLink = await updatedLinkResponse.json();

      if (onSuccess) {
        onSuccess(updatedLink);
      }

      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.serverError'));
    } finally {
      setIsLoading(false);
    }
  };

  const formatDatetimeLocal = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toISOString().slice(0, 16);
    } catch {
      return '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('linkEdit.title')}</DialogTitle>
          <DialogDescription>{t('linkEdit.description')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Original URL */}
          <div className="space-y-2">
            <Label htmlFor="originalUrl">{t('linkEdit.originalUrl')}</Label>
            <Input
              id="originalUrl"
              type="url"
              value={originalUrl}
              onChange={(e) => setOriginalUrl(e.target.value)}
              placeholder="https://example.com/long-url"
              required
            />
          </div>

          {/* Custom Alias */}
          <div className="space-y-2">
            <Label htmlFor="customAlias">{t('linkEdit.customAlias')}</Label>
            <Input
              id="customAlias"
              type="text"
              value={customAlias}
              onChange={(e) => setCustomAlias(e.target.value)}
              placeholder={t('home.aliasPlaceholder')}
              pattern="^[a-zA-Z0-9-]*$"
            />
            <p className="text-xs text-muted-foreground">
              {t('linkEdit.aliasHelp')}
            </p>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">{t('linkEdit.linkTitle')}</Label>
            <Input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('linkEdit.titlePlaceholder')}
              maxLength={200}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">{t('linkEdit.linkDescription')}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('linkEdit.descriptionPlaceholder')}
              maxLength={500}
              rows={2}
            />
          </div>

          {/* Expiration */}
          <div className="space-y-2">
            <Label htmlFor="expiresAt">{t('linkEdit.expiration')}</Label>
            <Input
              id="expiresAt"
              type="datetime-local"
              value={formatDatetimeLocal(expiresAt)}
              onChange={(e) => setExpiresAt(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
            />
            {expiresAt && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setExpiresAt('')}
                className="text-xs"
              >
                {t('linkEdit.clearExpiration')}
              </Button>
            )}
          </div>

          {/* Password */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t('linkEdit.password')}</Label>
              {hasPassword && !changePassword && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Lock className="h-3 w-3" />
                  {t('linkEdit.passwordSet')}
                </span>
              )}
            </div>

            {hasPassword && !changePassword ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setChangePassword(true)}
                className="w-full"
              >
                <Unlock className="me-2 h-4 w-4" />
                {t('linkEdit.changePassword')}
              </Button>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={
                      hasPassword
                        ? t('linkEdit.newPasswordPlaceholder')
                        : t('linkEdit.passwordPlaceholder')
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute end-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {hasPassword && (
                  <p className="text-xs text-muted-foreground">
                    {t('linkEdit.passwordClearHelp')}
                  </p>
                )}
                {changePassword && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setChangePassword(false);
                      setPassword('');
                    }}
                  >
                    {t('common.cancel')}
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Folder */}
          <div className="space-y-2">
            <Label>{t('linkEdit.folder')}</Label>
            <Select
              value={folderId || 'none'}
              onValueChange={(value) =>
                setFolderId(value === 'none' ? null : value)
              }
              disabled={isFetching}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('folders.uncategorized')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t('folders.uncategorized')}</SelectItem>
                {folders.map((folder) => (
                  <SelectItem key={folder.id} value={folder.id}>
                    <span className="flex items-center gap-2">
                      {folder.color && (
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: folder.color }}
                        />
                      )}
                      {folder.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>{t('linkEdit.tags')}</Label>
            <div className="flex gap-2">
              <Input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagInputKeyDown}
                placeholder={t('tags.addPlaceholder')}
                list="available-tags"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleAddTag}
                disabled={!tagInput.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <datalist id="available-tags">
              {availableTags.map((tag) => (
                <option key={tag.id} value={tag.name} />
              ))}
            </datalist>

            {/* Tags list */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-1 text-sm bg-secondary rounded-md"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                  {t('linkEdit.saving')}
                </>
              ) : (
                t('common.save')
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
