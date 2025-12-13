'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Globe,
  CheckCircle2,
  XCircle,
  Clock,
  Shield,
  Copy,
  Check,
  Trash2,
  RefreshCw,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CustomDomain, SslStatus } from '@/types';

interface DomainCardProps {
  domain: CustomDomain & {
    instructions?: {
      steps: {
        title: string;
        description: string;
        records?: { type: string; name: string; value: string; purpose: string }[];
      }[];
    };
  };
  onVerify: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onRetrySSL: (id: string) => Promise<void>;
}

const SSL_STATUS_ICONS: Record<SslStatus, React.ReactNode> = {
  PENDING: <Clock className="h-4 w-4 text-muted-foreground" />,
  PROVISIONING: <Loader2 className="h-4 w-4 text-yellow-500 animate-spin" />,
  ACTIVE: <Shield className="h-4 w-4 text-green-500" />,
  FAILED: <XCircle className="h-4 w-4 text-destructive" />,
};

export function DomainCard({
  domain,
  onVerify,
  onDelete,
  onRetrySSL,
}: DomainCardProps) {
  const t = useTranslations('domains');
  const [copied, setCopied] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [showInstructions, setShowInstructions] = useState(!domain.verified);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleVerify = async () => {
    setIsVerifying(true);
    try {
      await onVerify(domain.id);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(t('deleteConfirm'))) return;

    setIsDeleting(true);
    try {
      await onDelete(domain.id);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRetrySSL = async () => {
    setIsRetrying(true);
    try {
      await onRetrySSL(domain.id);
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Globe className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">{domain.domain}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {domain.verified ? (
              <span className="flex items-center gap-1 text-sm text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                {t('verified')}
              </span>
            ) : (
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                {t('unverified')}
              </span>
            )}
            <span className="flex items-center gap-1 text-sm">
              {SSL_STATUS_ICONS[domain.sslStatus]}
              {t(`ssl${domain.sslStatus.charAt(0).toUpperCase() + domain.sslStatus.slice(1).toLowerCase()}`)}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Verification Instructions */}
        {!domain.verified && domain.instructions && (
          <div className="space-y-3">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-between"
              onClick={() => setShowInstructions(!showInstructions)}
            >
              <span className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-yellow-500" />
                {t('verificationInstructions')}
              </span>
              {showInstructions ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>

            {showInstructions && (
              <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  {t('addDnsRecord')}
                </p>

                {domain.instructions.steps[0]?.records?.map((record, index) => (
                  <div key={index} className="space-y-2">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="font-medium">{t('dnsHost')}</p>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {record.name}
                        </code>
                      </div>
                      <div>
                        <p className="font-medium">{t('dnsValue')}</p>
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-muted px-2 py-1 rounded truncate max-w-[200px]">
                            {record.value}
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleCopy(record.value)}
                          >
                            {copied ? (
                              <Check className="h-3 w-3 text-green-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                <p className="text-xs text-muted-foreground">
                  {t('dnsNote')}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Stats */}
        {domain._count && (
          <div className="text-sm text-muted-foreground">
            {t('linksCount', { count: domain._count.links })}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2">
          {!domain.verified && (
            <Button
              size="sm"
              onClick={handleVerify}
              disabled={isVerifying}
            >
              {isVerifying ? (
                <>
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                  {t('verifying')}
                </>
              ) : (
                t('verify')
              )}
            </Button>
          )}

          {domain.verified && domain.sslStatus === 'FAILED' && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleRetrySSL}
              disabled={isRetrying}
            >
              {isRetrying ? (
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="me-2 h-4 w-4" />
              )}
              {t('retrySSL')}
            </Button>
          )}

          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <Loader2 className="me-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="me-2 h-4 w-4" />
            )}
            {t('delete')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
