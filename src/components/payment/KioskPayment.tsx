'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Copy, Check, Clock, Store } from 'lucide-react';

interface KioskPaymentProps {
  billReference: string;
  expiresAt: Date;
  amount: number;
  currency: string;
  onClose: () => void;
}

export function KioskPayment({
  billReference,
  expiresAt,
  amount,
  currency,
  onClose,
}: KioskPaymentProps) {
  const t = useTranslations('payment');
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const expiry = new Date(expiresAt);
      const diff = expiry.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft('Expired');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(
        `${hours.toString().padStart(2, '0')}:${minutes
          .toString()
          .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(billReference);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = billReference;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount / 100);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Store className="h-12 w-12 mx-auto text-primary mb-4" />
        <h3 className="text-lg font-semibold">{t('kiosk.title')}</h3>
        <p className="text-sm text-muted-foreground mt-1">
          {t('kiosk.referenceDesc')}
        </p>
      </div>

      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">
              {t('kiosk.reference')}
            </p>
            <div className="flex items-center justify-center gap-2">
              <code className="text-2xl font-mono font-bold tracking-wider">
                {billReference}
              </code>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCopy}
                className="h-8 w-8"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between text-sm">
        <div>
          <span className="text-muted-foreground">Amount: </span>
          <span className="font-semibold">{formatAmount(amount, currency)}</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Expires in: </span>
          <span className={`font-mono font-semibold ${timeLeft === 'Expired' ? 'text-destructive' : ''}`}>
            {timeLeft}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="font-medium">{t('kiosk.instructions')}</h4>
        <ol className="space-y-2 text-sm text-muted-foreground">
          <li className="flex gap-2">
            <span className="font-semibold text-foreground">1.</span>
            {t('kiosk.step1')}
          </li>
          <li className="flex gap-2">
            <span className="font-semibold text-foreground">2.</span>
            {t('kiosk.step2')}
          </li>
          <li className="flex gap-2">
            <span className="font-semibold text-foreground">3.</span>
            {t('kiosk.step3')}
          </li>
          <li className="flex gap-2">
            <span className="font-semibold text-foreground">4.</span>
            {t('kiosk.step4')}
          </li>
          <li className="flex gap-2">
            <span className="font-semibold text-foreground">5.</span>
            {t('kiosk.step5')}
          </li>
        </ol>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        {t('kiosk.note')}
      </p>

      <Button onClick={onClose} variant="outline" className="w-full">
        Done
      </Button>
    </div>
  );
}
