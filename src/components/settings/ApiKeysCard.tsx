'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, Check, Loader2, Plus, Trash2 } from 'lucide-react';

type ApiKey = {
  id: string;
  name: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
};

export function ApiKeysCard() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [revealedKey, setRevealedKey] = useState<{ id: string; key: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [pendingRevoke, setPendingRevoke] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/api-keys', { cache: 'no-store' });
      if (res.status === 401) {
        setError('Sign in to manage API keys.');
        setKeys([]);
        return;
      }
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = (await res.json()) as { apiKeys: ApiKey[] };
      setKeys(data.apiKeys);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load API keys');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error || `HTTP ${res.status}`);
      }
      const data = (await res.json()) as { apiKey: ApiKey & { key: string } };
      setRevealedKey({ id: data.apiKey.id, key: data.apiKey.key });
      setNewName('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create key');
    } finally {
      setCreating(false);
    }
  };

  const revoke = async (id: string) => {
    setPendingRevoke(id);
    try {
      const res = await fetch(`/api/api-keys/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to revoke');
    } finally {
      setPendingRevoke(null);
    }
  };

  const copy = async () => {
    if (!revealedKey) return;
    try {
      await navigator.clipboard.writeText(revealedKey.key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard blocked — user can still select & copy from the input
    }
  };

  return (
    <Card data-testid="api-keys-card">
      <CardHeader>
        <CardTitle>API Keys</CardTitle>
        <CardDescription>
          Programmatic access for scripts, integrations, and the browser
          extension. Plaintext keys are shown exactly once at creation — store
          them in your secret manager before closing this dialog.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div
            className="p-3 rounded-md border border-destructive/50 text-destructive text-sm"
            data-testid="api-keys-error"
          >
            {error}
          </div>
        )}

        {revealedKey && (
          <div
            className="p-3 rounded-md border bg-muted space-y-2"
            data-testid="api-keys-reveal"
          >
            <Label className="text-xs">Copy this key now — it won&apos;t be shown again.</Label>
            <div className="flex gap-2">
              <Input
                readOnly
                value={revealedKey.key}
                className="font-mono text-xs"
                onFocus={(e) => e.currentTarget.select()}
              />
              <Button
                variant="outline"
                size="icon"
                onClick={copy}
                aria-label="Copy API key"
              >
                {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setRevealedKey(null)}>
                Dismiss
              </Button>
            </div>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void create();
          }}
          className="flex gap-2"
          data-testid="api-keys-create-form"
        >
          <Input
            placeholder="Key name (e.g. CI deploy, my-laptop)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            disabled={creating}
            maxLength={100}
            aria-label="API key name"
          />
          <Button type="submit" disabled={creating || !newName.trim()}>
            {creating ? (
              <>
                <Loader2 className="me-2 h-4 w-4 animate-spin" aria-hidden />
                Creating
              </>
            ) : (
              <>
                <Plus className="me-2 h-4 w-4" aria-hidden />
                Create
              </>
            )}
          </Button>
        </form>

        <div className="border rounded-md divide-y" data-testid="api-keys-list">
          {loading ? (
            <div className="p-4 text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Loading…
            </div>
          ) : keys.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">
              No API keys yet. Create one above to start using the REST API.
            </div>
          ) : (
            keys.map((k) => (
              <div
                key={k.id}
                className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 p-3"
                data-testid={`api-key-${k.id}`}
              >
                <div className="min-w-0">
                  <div className="font-medium truncate">{k.name}</div>
                  <div className="text-xs text-muted-foreground">
                    Created {new Date(k.createdAt).toLocaleDateString()}
                    {k.lastUsedAt
                      ? ` · Last used ${new Date(k.lastUsedAt).toLocaleDateString()}`
                      : ' · Never used'}
                    {k.expiresAt
                      ? ` · Expires ${new Date(k.expiresAt).toLocaleDateString()}`
                      : ''}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => revoke(k.id)}
                  disabled={pendingRevoke === k.id}
                  aria-label={`Revoke ${k.name}`}
                >
                  {pendingRevoke === k.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <Trash2 className="h-4 w-4 me-2" aria-hidden />
                  )}
                  Revoke
                </Button>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
