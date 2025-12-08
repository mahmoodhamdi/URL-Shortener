import { useTranslations } from 'next-intl';
import { unstable_setRequestLocale } from 'next-intl/server';
import { UrlShortener } from '@/components/url/UrlShortener';
import { Zap, BarChart3, QrCode, Shield } from 'lucide-react';
import type { Locale } from '@/i18n/config';

interface PageProps {
  params: { locale: Locale };
}

export default function HomePage({ params: { locale } }: PageProps) {
  unstable_setRequestLocale(locale);
  const t = useTranslations();

  const features = [
    {
      icon: Zap,
      title: t('home.features.fast'),
      description: t('home.features.fastDesc'),
    },
    {
      icon: BarChart3,
      title: t('home.features.analytics'),
      description: t('home.features.analyticsDesc'),
    },
    {
      icon: QrCode,
      title: t('home.features.qr'),
      description: t('home.features.qrDesc'),
    },
    {
      icon: Shield,
      title: t('home.features.secure'),
      description: t('home.features.secureDesc'),
    },
  ];

  return (
    <div className="container py-12">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          {t('home.title')}
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          {t('home.subtitle')}
        </p>
      </div>

      {/* URL Shortener Form */}
      <UrlShortener />

      {/* Features Section */}
      <div className="mt-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature) => (
            <div key={feature.title} className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-4">
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
