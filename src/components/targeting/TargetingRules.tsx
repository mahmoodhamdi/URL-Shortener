'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Plus, ChevronDown, Trash2, Target, Loader2, AlertCircle } from 'lucide-react';
import { getTargetTypeOptions } from '@/lib/targeting/matcher';
import type { LinkTarget, TargetType } from '@/types';

interface TargetingRulesProps {
  linkId: string;
  disabled?: boolean;
  onTargetsChange?: (targets: LinkTarget[]) => void;
}

interface NewTarget {
  type: TargetType;
  value: string;
  targetUrl: string;
  priority: number;
}

const TARGET_TYPES: { value: TargetType; label: string }[] = [
  { value: 'DEVICE', label: 'Device' },
  { value: 'OS', label: 'Operating System' },
  { value: 'BROWSER', label: 'Browser' },
  { value: 'COUNTRY', label: 'Country' },
  { value: 'LANGUAGE', label: 'Language' },
];

export function TargetingRules({ linkId, disabled, onTargetsChange }: TargetingRulesProps) {
  const t = useTranslations('targeting');
  const [isOpen, setIsOpen] = useState(false);
  const [targets, setTargets] = useState<LinkTarget[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newTarget, setNewTarget] = useState<NewTarget>({
    type: 'DEVICE',
    value: '',
    targetUrl: '',
    priority: 0,
  });

  // Fetch targets when component mounts or linkId changes
  useEffect(() => {
    if (linkId) {
      fetchTargets();
    }
  }, [linkId]);

  const fetchTargets = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/links/${linkId}/targets`);
      if (response.ok) {
        const data = await response.json();
        setTargets(data);
        onTargetsChange?.(data);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to fetch targets');
      }
    } catch (err) {
      setError('Failed to fetch targets');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTarget = async () => {
    if (!newTarget.value || !newTarget.targetUrl) {
      setError('Please fill in all required fields');
      return;
    }

    setIsAdding(true);
    setError(null);
    try {
      const response = await fetch(`/api/links/${linkId}/targets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTarget),
      });

      if (response.ok) {
        const target = await response.json();
        const updatedTargets = [...targets, target];
        setTargets(updatedTargets);
        onTargetsChange?.(updatedTargets);
        // Reset form
        setNewTarget({
          type: 'DEVICE',
          value: '',
          targetUrl: '',
          priority: 0,
        });
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to add target');
      }
    } catch (err) {
      setError('Failed to add target');
    } finally {
      setIsAdding(false);
    }
  };

  const handleToggleTarget = async (targetId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/links/${linkId}/targets/${targetId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      });

      if (response.ok) {
        const updatedTargets = targets.map(t =>
          t.id === targetId ? { ...t, isActive } : t
        );
        setTargets(updatedTargets);
        onTargetsChange?.(updatedTargets);
      }
    } catch (err) {
      setError('Failed to update target');
    }
  };

  const handleDeleteTarget = async (targetId: string) => {
    try {
      const response = await fetch(`/api/links/${linkId}/targets/${targetId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const updatedTargets = targets.filter(t => t.id !== targetId);
        setTargets(updatedTargets);
        onTargetsChange?.(updatedTargets);
      }
    } catch (err) {
      setError('Failed to delete target');
    }
  };

  const valueOptions = getTargetTypeOptions(newTarget.type);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="space-y-2">
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="w-full justify-between p-0 h-auto">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            <span className="font-medium">{t('title')}</span>
            {targets.length > 0 && (
              <span className="text-xs text-muted-foreground">
                ({targets.length} {t('rules')})
              </span>
            )}
          </div>
          <ChevronDown
            className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Existing targets */}
            {targets.length > 0 && (
              <div className="space-y-2">
                {targets.map((target) => (
                  <div
                    key={target.id}
                    className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium">{target.type}</span>
                        <span className="text-muted-foreground">→</span>
                        <span className="text-primary">{target.value}</span>
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {target.targetUrl}
                      </div>
                    </div>
                    <Switch
                      checked={target.isActive}
                      onCheckedChange={(checked) =>
                        handleToggleTarget(target.id, checked)
                      }
                      disabled={disabled}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteTarget(target.id)}
                      disabled={disabled}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Add new target form */}
            <div className="space-y-3 pt-2 border-t">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">{t('type')}</Label>
                  <Select
                    value={newTarget.type}
                    onValueChange={(value: TargetType) => {
                      setNewTarget({ ...newTarget, type: value, value: '' });
                    }}
                    disabled={disabled}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TARGET_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t('value')}</Label>
                  <Select
                    value={newTarget.value}
                    onValueChange={(value) =>
                      setNewTarget({ ...newTarget, value })
                    }
                    disabled={disabled}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('selectValue')} />
                    </SelectTrigger>
                    <SelectContent>
                      {valueOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t('targetUrl')}</Label>
                <Input
                  type="url"
                  value={newTarget.targetUrl}
                  onChange={(e) =>
                    setNewTarget({ ...newTarget, targetUrl: e.target.value })
                  }
                  placeholder="https://example.com/mobile"
                  disabled={disabled}
                />
              </div>
              <Button
                onClick={handleAddTarget}
                disabled={disabled || isAdding || !newTarget.value || !newTarget.targetUrl}
                size="sm"
                className="w-full"
              >
                {isAdding ? (
                  <Loader2 className="h-4 w-4 animate-spin me-2" />
                ) : (
                  <Plus className="h-4 w-4 me-2" />
                )}
                {t('addRule')}
              </Button>
            </div>

            {/* Error message */}
            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}
          </>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
