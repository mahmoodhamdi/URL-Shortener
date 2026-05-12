import type { MetadataRoute } from 'next';

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
  'http://localhost:3000';

const PUBLIC_PATHS = [
  '',
  '/pricing',
  '/api-docs',
  '/login',
  '/register',
  '/status',
];

const LOCALES = ['en', 'ar'] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [];

  for (const path of PUBLIC_PATHS) {
    for (const locale of LOCALES) {
      entries.push({
        url: `${APP_URL}/${locale}${path}`,
        lastModified: now,
        changeFrequency: path === '' ? 'daily' : 'weekly',
        priority: path === '' ? 1 : 0.7,
        alternates: {
          languages: Object.fromEntries(
            LOCALES.map((l) => [l, `${APP_URL}/${l}${path}`])
          ),
        },
      });
    }
  }

  return entries;
}
