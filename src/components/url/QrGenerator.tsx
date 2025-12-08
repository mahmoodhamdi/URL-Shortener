'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';

interface QrGeneratorProps {
  url: string;
  size?: number;
}

export function QrGenerator({ url, size = 256 }: QrGeneratorProps) {
  const t = useTranslations();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchQr = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/qr', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url, width: size }),
        });

        if (!response.ok) {
          throw new Error('Failed to generate QR code');
        }

        const data = await response.json();
        setQrDataUrl(data.dataUrl);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to generate QR');
      } finally {
        setLoading(false);
      }
    };

    fetchQr();
  }, [url, size]);

  const handleDownload = () => {
    if (!qrDataUrl) return;

    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = 'qr-code.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-4 text-destructive">
        {error}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="p-4 bg-white rounded-lg">
        {qrDataUrl && (
          <img
            src={qrDataUrl}
            alt="QR Code"
            width={size}
            height={size}
            className="block"
          />
        )}
      </div>
      <p className="text-sm text-muted-foreground">{t('qr.scanToVisit')}</p>
      <Button onClick={handleDownload}>
        <Download className="me-2 h-4 w-4" />
        {t('qr.downloadPng')}
      </Button>
    </div>
  );
}
