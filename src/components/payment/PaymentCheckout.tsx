'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PaymentMethodSelector } from './PaymentMethodSelector';
import { PaymentMethod } from './PaymentMethodCard';
import { KioskPayment } from './KioskPayment';
import { WalletPayment } from './WalletPayment';
import { PLANS } from '@/lib/stripe/plans';
import { Plan } from '@/types';
import { Loader2, ShieldCheck, ArrowLeft } from 'lucide-react';

type CheckoutState =
  | 'loading'
  | 'selecting'
  | 'processing'
  | 'kiosk'
  | 'wallet'
  | 'wallet-success'
  | 'redirecting'
  | 'error';

interface KioskData {
  billReference: string;
  expiresAt: Date;
  amount: number;
  currency: string;
}

interface PaymentCheckoutProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: Plan;
  billingCycle: 'monthly' | 'yearly';
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function PaymentCheckout({
  open,
  onOpenChange,
  planId,
  billingCycle,
  onSuccess,
  onCancel,
}: PaymentCheckoutProps) {
  const t = useTranslations('payment');
  const tPricing = useTranslations('pricing');

  const [state, setState] = useState<CheckoutState>('loading');
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [preferredGateway, setPreferredGateway] = useState<string>('stripe');
  const [error, setError] = useState<string>('');
  const [kioskData, setKioskData] = useState<KioskData | null>(null);

  const plan = PLANS[planId];
  const price = billingCycle === 'yearly' ? plan.yearlyPrice : plan.price;

  // Fetch available payment methods
  const fetchPaymentMethods = useCallback(async () => {
    try {
      setState('loading');
      setError('');

      const response = await fetch('/api/payment/methods');

      if (!response.ok) {
        if (response.status === 401) {
          // Not authenticated, will be handled by redirect
          window.location.href = '/login?callbackUrl=/pricing';
          return;
        }
        throw new Error('Failed to fetch payment methods');
      }

      const data = await response.json();

      setMethods(data.paymentMethods || []);
      setPreferredGateway(data.preferredGateway || 'stripe');

      // Auto-select first method
      if (data.paymentMethods?.length > 0) {
        setSelectedMethod(data.paymentMethods[0].id);
      }

      setState('selecting');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payment methods');
      setState('error');
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchPaymentMethods();
    } else {
      // Reset state when dialog closes
      setState('loading');
      setSelectedMethod(null);
      setError('');
      setKioskData(null);
    }
  }, [open, fetchPaymentMethods]);

  const handleCheckout = async () => {
    if (!selectedMethod) return;

    try {
      setState('processing');
      setError('');

      const response = await fetch('/api/payment/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId,
          billingCycle,
          paymentMethod: selectedMethod,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Checkout failed');
      }

      // Handle different payment methods
      if (selectedMethod === 'kiosk' && data.kioskData) {
        setKioskData({
          billReference: data.kioskData.billReference,
          expiresAt: new Date(data.kioskData.expiresAt),
          amount: data.kioskData.amount,
          currency: data.kioskData.currency,
        });
        setState('kiosk');
      } else if (selectedMethod === 'wallet') {
        setState('wallet');
      } else if (data.checkoutUrl) {
        // Redirect to external checkout
        setState('redirecting');
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error('Invalid checkout response');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed');
      setState('error');
    }
  };

  const handleWalletSubmit = async (phoneNumber: string) => {
    try {
      setError('');

      const response = await fetch('/api/payment/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId,
          billingCycle,
          paymentMethod: 'wallet',
          phoneNumber,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Wallet payment failed');
      }

      setState('wallet-success');

      // If redirect URL provided, redirect after delay
      if (data.redirectUrl) {
        setTimeout(() => {
          window.location.href = data.redirectUrl;
        }, 2000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Wallet payment failed');
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    onCancel?.();
  };

  const handleBack = () => {
    setState('selecting');
    setError('');
  };

  const formatPrice = (price: number) => {
    if (price === 0) return tPricing('free');
    return `$${price}${billingCycle === 'monthly' ? '/mo' : '/yr'}`;
  };

  const getProviderLabel = () => {
    const labels: Record<string, string> = {
      stripe: 'Stripe',
      paymob: 'Paymob',
      paytabs: 'PayTabs',
      paddle: 'Paddle',
    };
    return labels[preferredGateway] || preferredGateway;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {(state === 'kiosk' || state === 'wallet' || state === 'wallet-success') && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 -ml-2"
                onClick={handleBack}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            {t('selectMethod')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Plan Summary */}
          {state !== 'kiosk' && state !== 'wallet' && state !== 'wallet-success' && (
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div>
                <p className="font-medium">{plan.name} Plan</p>
                <p className="text-sm text-muted-foreground">
                  {billingCycle === 'yearly' ? tPricing('billedYearly') : tPricing('monthly')}
                </p>
              </div>
              <p className="text-xl font-bold">{formatPrice(price)}</p>
            </div>
          )}

          {/* Loading State */}
          {state === 'loading' && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Method Selection */}
          {state === 'selecting' && (
            <>
              <PaymentMethodSelector
                methods={methods}
                selectedMethod={selectedMethod}
                onSelect={setSelectedMethod}
              />

              <Button
                onClick={handleCheckout}
                disabled={!selectedMethod}
                className="w-full"
              >
                {t('checkout')}
              </Button>
            </>
          )}

          {/* Processing State */}
          {state === 'processing' && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">{t('processing')}</p>
            </div>
          )}

          {/* Redirecting State */}
          {state === 'redirecting' && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Redirecting to payment...</p>
            </div>
          )}

          {/* Kiosk Payment */}
          {state === 'kiosk' && kioskData && (
            <KioskPayment
              billReference={kioskData.billReference}
              expiresAt={kioskData.expiresAt}
              amount={kioskData.amount}
              currency={kioskData.currency}
              onClose={handleClose}
            />
          )}

          {/* Wallet Payment */}
          {(state === 'wallet' || state === 'wallet-success') && (
            <WalletPayment
              onSubmit={handleWalletSubmit}
              isLoading={state === 'processing'}
              error={error}
              success={state === 'wallet-success'}
            />
          )}

          {/* Error State */}
          {state === 'error' && (
            <div className="space-y-4">
              <div className="p-4 text-sm text-destructive bg-destructive/10 rounded-lg">
                {error || t('errors.paymentFailed')}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClose} className="flex-1">
                  {t('cancelled')}
                </Button>
                <Button onClick={fetchPaymentMethods} className="flex-1">
                  {t('tryAgain')}
                </Button>
              </div>
            </div>
          )}

          {/* Security Footer */}
          {state === 'selecting' && (
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4" />
              <span>
                {t('security.secure')} · {t('security.encrypted')}
              </span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
