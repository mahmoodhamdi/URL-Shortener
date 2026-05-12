/**
 * Idempotent screenshot generator for the marketing/sales package.
 *
 * Captures a curated, deterministic set of screenshots at desktop, tablet, and
 * mobile resolutions, in English and Arabic, light and dark themes. Output
 * lands in `marketing/screenshots/`.
 *
 * Usage:
 *   PORT=3001 npx tsx marketing/scripts/screenshots.ts
 *
 * The script expects a Next.js server running on `BASE_URL` (default
 * `http://localhost:${PORT||3000}`). Re-running overwrites the same filenames,
 * which makes it safe to commit a known set.
 */
import { chromium, type Page } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs/promises';

const BASE_URL =
  process.env.BASE_URL || `http://127.0.0.1:${process.env.PORT || 3000}`;
const OUT_DIR = path.resolve(process.cwd(), 'marketing/screenshots');

type Viewport = { width: number; height: number };

const DESKTOP: Viewport = { width: 1920, height: 1080 };
const TABLET: Viewport = { width: 1024, height: 768 };
const MOBILE: Viewport = { width: 390, height: 844 };

type Shot = {
  name: string;
  url: string;
  viewport: Viewport;
  theme: 'light' | 'dark';
  fullPage?: boolean;
};

const SHOTS: Shot[] = [
  // Home
  { name: '01-home-en-desktop-light', url: '/en', viewport: DESKTOP, theme: 'light', fullPage: true },
  { name: '02-home-en-desktop-dark', url: '/en', viewport: DESKTOP, theme: 'dark', fullPage: true },
  { name: '03-home-ar-desktop-light', url: '/ar', viewport: DESKTOP, theme: 'light', fullPage: true },
  // Tablet
  { name: '04-home-en-tablet-light', url: '/en', viewport: TABLET, theme: 'light' },
  { name: '05-home-en-tablet-dark', url: '/en', viewport: TABLET, theme: 'dark' },
  // Mobile
  { name: '06-home-en-mobile-light', url: '/en', viewport: MOBILE, theme: 'light' },
  { name: '07-home-ar-mobile-light', url: '/ar', viewport: MOBILE, theme: 'light' },
  // Other pages
  { name: '08-pricing-en-desktop', url: '/en/pricing', viewport: DESKTOP, theme: 'light', fullPage: true },
  { name: '09-pricing-ar-desktop', url: '/ar/pricing', viewport: DESKTOP, theme: 'light', fullPage: true },
  { name: '10-bulk-en-desktop', url: '/en/bulk', viewport: DESKTOP, theme: 'light', fullPage: true },
  { name: '11-api-docs-en-desktop', url: '/en/api-docs', viewport: DESKTOP, theme: 'light' },
  { name: '12-status-en-desktop', url: '/en/status', viewport: DESKTOP, theme: 'light' },
];

async function applyTheme(page: Page, theme: 'light' | 'dark') {
  await page.evaluate((t) => {
    if (t === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, theme);
}

async function capture(page: Page, shot: Shot) {
  await page.setViewportSize(shot.viewport);
  await page.goto(`${BASE_URL}${shot.url}`, { waitUntil: 'networkidle' });
  await applyTheme(page, shot.theme);
  await page.waitForTimeout(400);
  await page.screenshot({
    path: path.join(OUT_DIR, `${shot.name}.png`),
    fullPage: !!shot.fullPage,
  });
  console.log(`captured: ${shot.name}.png`);
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({
    channel: 'chrome',
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
  });
  const context = await browser.newContext();
  const page = await context.newPage();
  for (const shot of SHOTS) {
    try {
      await capture(page, shot);
    } catch (e) {
      console.error(`failed: ${shot.name}`, e instanceof Error ? e.message : e);
    }
  }
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
