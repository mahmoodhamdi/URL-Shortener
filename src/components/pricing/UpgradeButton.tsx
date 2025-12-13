'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Zap } from 'lucide-react';
import { Plan } from '@/types';
import { useTranslations } from 'next-intl';

interface UpgradeButtonProps {
  currentPlan: Plan;
  targetPlan?: Plan;
  locale?: string;
  variant?: 'default' | 'small' | 'outline';
}

export function UpgradeButton({
  currentPlan,
  targetPlan = 'PRO',
  locale = 'en',
  variant = 'default',
}: UpgradeButtonProps) {
  const t = useTranslations('pricing');
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Don't show upgrade button if already on target plan or higher
  const planOrder: Plan[] = ['FREE', 'STARTER', 'PRO', 'BUSINESS', 'ENTERPRISE'];
  if (planOrder.indexOf(currentPlan) >= planOrder.indexOf(targetPlan)) {
    return null;
  }

  const handleUpgrade = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: targetPlan, billingPeriod: 'monthly' }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Checkout error:', error);
      // Redirect to pricing page as fallback
      router.push(`/${locale}/pricing`);
    } finally {
      setIsLoading(false);
    }
  };

  const baseClasses = 'inline-flex items-center gap-2 font-medium transition-colors';
  const variantClasses = {
    default: 'bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90',
    small: 'bg-primary text-primary-foreground px-3 py-1.5 text-sm rounded-md hover:bg-primary/90',
    outline: 'border border-primary text-primary px-4 py-2 rounded-lg hover:bg-primary/10',
  };

  return (
    <button
      onClick={handleUpgrade}
      disabled={isLoading}
      className={`${baseClasses} ${variantClasses[variant]}`}
    >
      {isLoading ? (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : (
        <Zap className="w-4 h-4" />
      )}
      {t('upgradeTo')} {targetPlan}
    </button>
  );
}
