'use client';

import { Check } from 'lucide-react';
import { Plan } from '@/types';
import { PlanConfig, formatPrice } from '@/lib/stripe/plans';
import { useTranslations } from 'next-intl';

interface PlanCardProps {
  plan: Plan;
  config: PlanConfig;
  billingPeriod: 'monthly' | 'yearly';
  currentPlan?: Plan;
  onSelect: (plan: Plan) => void;
  isLoading?: boolean;
}

export function PlanCard({
  plan,
  config,
  billingPeriod,
  currentPlan,
  onSelect,
  isLoading,
}: PlanCardProps) {
  const t = useTranslations('pricing');
  const isCurrentPlan = plan === currentPlan;
  const price = billingPeriod === 'yearly' ? config.yearlyPrice : config.price;
  const isFree = plan === 'FREE';

  return (
    <div
      className={`relative rounded-2xl border p-6 flex flex-col ${
        config.popular
          ? 'border-primary ring-2 ring-primary'
          : 'border-gray-200 dark:border-gray-700'
      }`}
    >
      {config.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-primary text-primary-foreground text-sm font-medium px-3 py-1 rounded-full">
            {t('mostPopular')}
          </span>
        </div>
      )}

      <div className="mb-4">
        <h3 className="text-xl font-bold">{config.name}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {config.description}
        </p>
      </div>

      <div className="mb-6">
        <div className="flex items-baseline">
          <span className="text-4xl font-bold">
            {isFree ? t('free') : `$${billingPeriod === 'yearly' ? Math.round(price / 12) : price}`}
          </span>
          {!isFree && (
            <span className="text-gray-600 dark:text-gray-400 ml-1">/mo</span>
          )}
        </div>
        {!isFree && billingPeriod === 'yearly' && (
          <p className="text-sm text-gray-500 mt-1">
            ${price} {t('billedYearly')}
          </p>
        )}
      </div>

      <div className="mb-6 flex-1">
        <p className="text-sm font-medium mb-3">{t('limits')}:</p>
        <ul className="space-y-2 text-sm">
          <li className="flex items-center gap-2">
            <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
            <span>
              {config.limits.linksPerMonth === -1
                ? t('unlimited')
                : config.limits.linksPerMonth.toLocaleString()}{' '}
              {t('linksPerMonth')}
            </span>
          </li>
          <li className="flex items-center gap-2">
            <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
            <span>
              {config.limits.clicksTracked === -1
                ? t('unlimited')
                : config.limits.clicksTracked.toLocaleString()}{' '}
              {t('clicksTracked')}
            </span>
          </li>
          <li className="flex items-center gap-2">
            <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
            <span>
              {config.limits.customDomains === -1
                ? t('unlimited')
                : config.limits.customDomains}{' '}
              {t('customDomains')}
            </span>
          </li>
          <li className="flex items-center gap-2">
            <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
            <span>
              {config.limits.teamMembers === -1
                ? t('unlimited')
                : config.limits.teamMembers}{' '}
              {t('teamMembers')}
            </span>
          </li>
          <li className="flex items-center gap-2">
            <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
            <span>
              {config.limits.analyticsRetentionDays === -1
                ? t('unlimited')
                : config.limits.analyticsRetentionDays}{' '}
              {t('daysAnalytics')}
            </span>
          </li>
        </ul>
      </div>

      <div className="mb-6">
        <p className="text-sm font-medium mb-3">{t('features')}:</p>
        <ul className="space-y-2 text-sm">
          {config.features.slice(0, 5).map((feature) => (
            <li key={feature} className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span>{feature}</span>
            </li>
          ))}
          {config.features.length > 5 && (
            <li className="text-gray-500">
              +{config.features.length - 5} {t('moreFeatures')}
            </li>
          )}
        </ul>
      </div>

      <button
        onClick={() => onSelect(plan)}
        disabled={isCurrentPlan || isLoading}
        className={`w-full py-2.5 px-4 rounded-lg font-medium transition-colors ${
          isCurrentPlan
            ? 'bg-gray-100 text-gray-500 cursor-not-allowed dark:bg-gray-800'
            : config.popular
            ? 'bg-primary text-primary-foreground hover:bg-primary/90'
            : 'bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100'
        }`}
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
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
            {t('processing')}
          </span>
        ) : isCurrentPlan ? (
          t('currentPlan')
        ) : isFree ? (
          t('getStarted')
        ) : (
          t('upgrade')
        )}
      </button>
    </div>
  );
}
