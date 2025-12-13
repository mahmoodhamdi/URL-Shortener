'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Plan } from '@/types';
import { PLANS } from '@/lib/stripe/plans';
import { PlanCard } from './PlanCard';
import { useTranslations } from 'next-intl';

interface PricingTableProps {
  currentPlan?: Plan;
  locale?: string;
}

export function PricingTable({ currentPlan, locale = 'en' }: PricingTableProps) {
  const t = useTranslations('pricing');
  const router = useRouter();
  const { data: session } = useSession();
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [loadingPlan, setLoadingPlan] = useState<Plan | null>(null);

  const handleSelectPlan = async (plan: Plan) => {
    if (plan === 'FREE') {
      // Already on free or downgrading, redirect to settings
      router.push(`/${locale}/dashboard/settings`);
      return;
    }

    if (!session) {
      // Redirect to login with callback to pricing
      router.push(`/${locale}/login?callbackUrl=/${locale}/pricing`);
      return;
    }

    setLoadingPlan(plan);

    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, billingPeriod }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Checkout error:', error);
      alert(t('checkoutError'));
    } finally {
      setLoadingPlan(null);
    }
  };

  const plans: Plan[] = ['FREE', 'STARTER', 'PRO', 'BUSINESS', 'ENTERPRISE'];

  return (
    <div>
      {/* Billing Toggle */}
      <div className="flex justify-center mb-8">
        <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-lg inline-flex">
          <button
            onClick={() => setBillingPeriod('monthly')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              billingPeriod === 'monthly'
                ? 'bg-white dark:bg-gray-700 shadow-sm'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            {t('monthly')}
          </button>
          <button
            onClick={() => setBillingPeriod('yearly')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              billingPeriod === 'yearly'
                ? 'bg-white dark:bg-gray-700 shadow-sm'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            {t('yearly')}
            <span className="ml-1 text-green-500 text-xs">{t('save20')}</span>
          </button>
        </div>
      </div>

      {/* Pricing Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {plans.map((plan) => (
          <PlanCard
            key={plan}
            plan={plan}
            config={PLANS[plan]}
            billingPeriod={billingPeriod}
            currentPlan={currentPlan}
            onSelect={handleSelectPlan}
            isLoading={loadingPlan === plan}
          />
        ))}
      </div>

      {/* Enterprise CTA */}
      <div className="mt-12 text-center">
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          {t('enterpriseQuestion')}
        </p>
        <a
          href="mailto:sales@example.com"
          className="inline-flex items-center text-primary hover:underline font-medium"
        >
          {t('contactSales')}
        </a>
      </div>
    </div>
  );
}
