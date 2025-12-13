import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/lib/auth';
import { getUserSubscription } from '@/lib/stripe/subscription';
import { PricingTable } from '@/components/pricing';

// This page needs dynamic rendering because it checks user session
export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'pricing' });

  return {
    title: t('title'),
    description: t('subtitle'),
  };
}

export default async function PricingPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string };
  searchParams: { upgrade?: string };
}) {
  const t = await getTranslations('pricing');
  const session = await auth();

  let currentPlan = undefined;

  if (session?.user?.id) {
    const subscription = await getUserSubscription(session.user.id);
    currentPlan = subscription.plan;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            {t('title')}
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            {t('subtitle')}
          </p>
        </div>

        {/* Status Messages */}
        {searchParams.upgrade === 'success' && (
          <div className="mb-8 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-center">
            <p className="text-green-800 dark:text-green-200 font-medium">
              {t('upgradeSuccess')}
            </p>
          </div>
        )}
        {searchParams.upgrade === 'canceled' && (
          <div className="mb-8 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-center">
            <p className="text-yellow-800 dark:text-yellow-200 font-medium">
              {t('upgradeCanceled')}
            </p>
          </div>
        )}

        {/* Pricing Table */}
        <PricingTable currentPlan={currentPlan} locale={locale} />

        {/* FAQ Section */}
        <div className="mt-20">
          <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-8">
            {t('faqTitle')}
          </h2>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
              <h3 className="font-semibold mb-2">{t('faq1Question')}</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                {t('faq1Answer')}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
              <h3 className="font-semibold mb-2">{t('faq2Question')}</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                {t('faq2Answer')}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
              <h3 className="font-semibold mb-2">{t('faq3Question')}</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                {t('faq3Answer')}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
              <h3 className="font-semibold mb-2">{t('faq4Question')}</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                {t('faq4Answer')}
              </p>
            </div>
          </div>
        </div>

        {/* Guarantee */}
        <div className="mt-16 text-center">
          <div className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <svg
              className="w-5 h-5 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
            <span>{t('moneyBackGuarantee')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
