'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Smartphone, CheckCircle } from 'lucide-react';

interface WalletPaymentProps {
  onSubmit: (phoneNumber: string) => Promise<void>;
  isLoading: boolean;
  error?: string;
  success?: boolean;
}

const WALLET_PROVIDERS = [
  { id: 'vodafone', name: 'Vodafone Cash', prefix: '010' },
  { id: 'orange', name: 'Orange Money', prefix: '012' },
  { id: 'etisalat', name: 'Etisalat Cash', prefix: '011' },
  { id: 'we', name: 'WE Pay', prefix: '015' },
];

export function WalletPayment({
  onSubmit,
  isLoading,
  error,
  success = false,
}: WalletPaymentProps) {
  const t = useTranslations('payment');
  const [phoneNumber, setPhoneNumber] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber || phoneNumber.length < 10) return;

    // Format phone number with Egypt country code
    const formattedPhone = phoneNumber.startsWith('+')
      ? phoneNumber
      : `+2${phoneNumber.startsWith('0') ? phoneNumber : '0' + phoneNumber}`;

    await onSubmit(formattedPhone);
  };

  const detectProvider = (phone: string) => {
    const prefix = phone.replace(/\D/g, '').slice(0, 3);
    return WALLET_PROVIDERS.find((p) => p.prefix === prefix);
  };

  const detectedProvider = detectProvider(phoneNumber);

  if (success) {
    return (
      <div className="text-center py-8 space-y-4">
        <CheckCircle className="h-16 w-16 mx-auto text-green-500" />
        <h3 className="text-lg font-semibold">{t('wallet.requestSent')}</h3>
        <p className="text-sm text-muted-foreground">
          {t('wallet.checkPhone')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Smartphone className="h-12 w-12 mx-auto text-primary mb-4" />
        <h3 className="text-lg font-semibold">{t('wallet.title')}</h3>
        <p className="text-sm text-muted-foreground mt-1">
          {t('wallet.phoneHelp')}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="phone">{t('wallet.phoneNumber')}</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              +20
            </span>
            <Input
              id="phone"
              type="tel"
              placeholder="10X XXX XXXX"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
              className="pl-12"
              maxLength={11}
              disabled={isLoading}
            />
          </div>
          {detectedProvider && (
            <p className="text-xs text-muted-foreground">
              Detected: <span className="font-medium">{detectedProvider.name}</span>
            </p>
          )}
        </div>

        {error && (
          <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 text-xs">
          {WALLET_PROVIDERS.map((provider) => (
            <div
              key={provider.id}
              className="flex items-center gap-2 p-2 rounded bg-muted/50"
            >
              <span className="font-mono">{provider.prefix}</span>
              <span className="text-muted-foreground">{provider.name}</span>
            </div>
          ))}
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={isLoading || phoneNumber.length < 10}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('processing')}
            </>
          ) : (
            t('wallet.sendRequest')
          )}
        </Button>
      </form>
    </div>
  );
}
