import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, unstable_setRequestLocale } from 'next-intl/server';
import { locales, type Locale, localeDirection } from '@/i18n/config';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileNav } from '@/components/layout/MobileNav';
import { Toaster } from '@/components/ui/toaster';
import '../globals.css';

const inter = Inter({ subsets: ['latin'] });

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export const metadata: Metadata = {
  title: 'URL Shortener',
  description: 'Create short, memorable URLs with analytics and QR codes',
};

export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: Locale };
}) {
  unstable_setRequestLocale(locale);
  const messages = await getMessages();
  const dir = localeDirection[locale];

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <body className={inter.className}>
        <NextIntlClientProvider messages={messages}>
          <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1 main-content">{children}</main>
            <Footer />
            <MobileNav />
          </div>
          <Toaster />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
