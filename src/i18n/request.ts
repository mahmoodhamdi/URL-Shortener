import { getRequestConfig } from 'next-intl/server';
import { locales, type Locale } from './config';

export default getRequestConfig(async ({ locale }) => {
  const validLocale: Locale = locales.includes(locale as Locale)
    ? (locale as Locale)
    : 'en';

  return {
    locale: validLocale,
    messages: (await import(`../messages/${validLocale}.json`)).default,
  };
});
