'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Globe, Plus, Loader2, AlertCircle } from 'lucide-react';
import { DomainCard } from '@/components/domains/DomainCard';
import type { CustomDomain } from '@/types';

interface DomainWithInstructions extends CustomDomain {
  instructions?: {
    steps: {
      title: string;
      description: string;
      records?: { type: string; name: string; value: string; purpose: string }[];
    }[];
  };
}

export default function DomainsPage() {
  const t = useTranslations('domains');
  const { data: session, status } = useSession();
  const router = useRouter();

  const [domains, setDomains] = useState<DomainWithInstructions[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDomains = useCallback(async () => {
    try {
      const response = await fetch('/api/domains');
      if (response.ok) {
        const data = await response.json();
        setDomains(data);
      }
    } catch (err) {
      console.error('Failed to fetch domains:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated') {
      fetchDomains();
    }
  }, [status, router, fetchDomains]);

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsAdding(true);

    try {
      const response = await fetch('/api/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: newDomain }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t('addError'));
      }

      // Fetch the full domain with instructions
      const domainResponse = await fetch(`/api/domains/${data.id}`);
      const fullDomain = await domainResponse.json();

      setDomains([fullDomain, ...domains]);
      setNewDomain('');
      setIsAddDialogOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('addError'));
    } finally {
      setIsAdding(false);
    }
  };

  const handleVerify = async (id: string) => {
    try {
      const response = await fetch(`/api/domains/${id}/verify`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t('verifyError'));
      }

      // Update the domain in the list
      setDomains(domains.map(d =>
        d.id === id ? { ...d, ...data.domain } : d
      ));
    } catch (err) {
      alert(err instanceof Error ? err.message : t('verifyError'));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/domains/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete domain');
      }

      setDomains(domains.filter(d => d.id !== id));
    } catch (err) {
      console.error('Failed to delete domain:', err);
    }
  };

  const handleRetrySSL = async (id: string) => {
    try {
      const response = await fetch(`/api/domains/${id}/ssl`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      // Update the domain's SSL status
      setDomains(domains.map(d =>
        d.id === id ? { ...d, sslStatus: 'PROVISIONING' } : d
      ));
    } catch (err) {
      console.error('Failed to retry SSL:', err);
    }
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="container mx-auto py-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground mt-1">{t('subtitle')}</p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="me-2 h-4 w-4" />
          {t('addDomain')}
        </Button>
      </div>

      {/* Domains List */}
      {domains.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Globe className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">{t('noDomains')}</h3>
            <p className="text-muted-foreground mb-6">{t('noDomainsDesc')}</p>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="me-2 h-4 w-4" />
              {t('addNew')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {domains.map((domain) => (
            <DomainCard
              key={domain.id}
              domain={domain}
              onVerify={handleVerify}
              onDelete={handleDelete}
              onRetrySSL={handleRetrySSL}
            />
          ))}
        </div>
      )}

      {/* Add Domain Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('addNew')}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddDomain} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="domain">{t('domain')}</Label>
              <Input
                id="domain"
                type="text"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                placeholder={t('domainPlaceholder')}
                required
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddDialogOpen(false)}
                disabled={isAdding}
              >
                {t('cancel')}
              </Button>
              <Button type="submit" disabled={isAdding || !newDomain.trim()}>
                {isAdding ? (
                  <>
                    <Loader2 className="me-2 h-4 w-4 animate-spin" />
                    {t('addDomain')}
                  </>
                ) : (
                  t('addDomain')
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
