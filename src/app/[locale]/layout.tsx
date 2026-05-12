import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, unstable_setRequestLocale } from 'next-intl/server';
import { locales, type Locale, localeDirection } from '@/i18n/config';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileNav } from '@/components/layout/MobileNav';
import { Toaster } from '@/components/ui/toaster';
import { SessionProvider } from '@/components/auth/SessionProvider';
import { CookieConsent } from '@/components/consent/CookieConsent';
import '../globals.css';

const inter = Inter({ subsets: ['latin'] });

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
  'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: 'URL Shortener — fast links, QR codes, analytics',
    template: '%s | URL Shortener',
  },
  description:
    'Shorten URLs, generate branded QR codes, and track click analytics across devices, countries, and referrers. Bilingual EN/AR with full RTL support.',
  keywords: [
    'URL shortener',
    'short links',
    'QR code generator',
    'link analytics',
    'branded short links',
    'link in bio',
  ],
  applicationName: 'URL Shortener',
  alternates: {
    languages: {
      en: '/en',
      ar: '/ar',
    },
  },
  openGraph: {
    type: 'website',
    siteName: 'URL Shortener',
    title: 'URL Shortener — fast links, QR codes, analytics',
    description:
      'Shorten URLs, generate branded QR codes, and track click analytics. Bilingual EN/AR.',
    url: '/',
    locale: 'en_US',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'URL Shortener',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'URL Shortener — fast links, QR codes, analytics',
    description:
      'Shorten URLs, generate branded QR codes, and track click analytics.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/favicon.ico',
  },
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
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  var isDark = theme === 'dark' || (!theme && prefersDark);
                  if (isDark) {
                    document.documentElement.classList.add('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <SessionProvider>
          <NextIntlClientProvider messages={messages}>
            <div className="min-h-screen flex flex-col">
              <Header />
              <main className="flex-1 main-content">{children}</main>
              <Footer />
              <MobileNav />
            </div>
            <Toaster />
            <CookieConsent />
          </NextIntlClientProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
