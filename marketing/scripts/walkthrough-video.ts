/**
 * Records a long-form product walkthrough as a webm via Playwright, then
 * transcodes it to mp4 with ffmpeg. Target output is 50-70 s, suitable for
 * the sales deck's "show, don't tell" segment.
 *
 * Output:
 *   marketing/videos/walkthrough.mp4
 *
 * Usage:
 *   PORT=3001 npx tsx marketing/scripts/walkthrough-video.ts
 *
 * ffmpeg is required on PATH.
 */
import { chromium, type Page } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs/promises';

const BASE_URL =
  process.env.BASE_URL || `http://127.0.0.1:${process.env.PORT || 3000}`;
const OUT_DIR = path.resolve(process.cwd(), 'marketing/videos');
const TMP_DIR = path.join(OUT_DIR, '.tmp-walkthrough');

async function pause(page: Page, ms: number) {
  await page.waitForTimeout(ms);
}

async function record() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.rm(TMP_DIR, { recursive: true, force: true });
  await fs.mkdir(TMP_DIR, { recursive: true });

  const browser = await chromium.launch({
    channel: 'chrome',
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 810 },
    recordVideo: { dir: TMP_DIR, size: { width: 1440, height: 810 } },
  });
  const page = await context.newPage();

  // 1. Land on the English home page.
  await page.goto(`${BASE_URL}/en`, { waitUntil: 'networkidle' });
  await pause(page, 2500);

  // 2. Type a URL into the shortener form (selectors are tolerant — if the
  //    landing form changes shape later, the recorder simply skips this step).
  const input = page.getByRole('textbox').first();
  if (await input.isVisible().catch(() => false)) {
    await input.click();
    await input.pressSequentially('https://example.com/articles/long-marketing-url-with-tracking', { delay: 45 });
    await pause(page, 800);

    const submit = page.getByRole('button', { name: /shorten|create|generate/i }).first();
    if (await submit.isVisible().catch(() => false)) {
      await submit.click().catch(() => null);
      await pause(page, 3000);
    }
  }

  // 3. Tour the bulk shortener.
  await page.goto(`${BASE_URL}/en/bulk`, { waitUntil: 'networkidle' });
  await pause(page, 3000);

  // 4. Pricing in English.
  await page.goto(`${BASE_URL}/en/pricing`, { waitUntil: 'networkidle' });
  await pause(page, 4500);

  // 5. Scroll through the pricing page so all four paid tiers are visible.
  await page.evaluate(() => window.scrollBy({ top: 600, behavior: 'smooth' }));
  await pause(page, 2500);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await pause(page, 1500);

  // 6. Switch locale to Arabic — full RTL flip.
  await page.goto(`${BASE_URL}/ar`, { waitUntil: 'networkidle' });
  await pause(page, 3500);

  // 7. Arabic pricing — visual proof of bilingual support.
  await page.goto(`${BASE_URL}/ar/pricing`, { waitUntil: 'networkidle' });
  await pause(page, 3500);

  // 8. Public API documentation.
  await page.goto(`${BASE_URL}/en/api-docs`, { waitUntil: 'networkidle' });
  await pause(page, 4000);

  // 9. Public status board — closes the loop with the operations story.
  await page.goto(`${BASE_URL}/en/status`, { waitUntil: 'networkidle' });
  await pause(page, 3500);

  // 10. Privacy placeholder — shows that legal scaffolding exists.
  await page.goto(`${BASE_URL}/en/privacy`, { waitUntil: 'networkidle' });
  await pause(page, 2500);

  const video = page.video();
  await context.close();
  await browser.close();

  if (!video) throw new Error('Playwright did not produce a recording');

  const rawPath = await video.path();
  const target = path.join(OUT_DIR, 'walkthrough.mp4');
  const result = spawnSync(
    'ffmpeg',
    [
      '-y',
      '-i', rawPath,
      '-vf', 'fps=30,scale=1440:-2:flags=lanczos',
      '-c:v', 'libx264',
      '-preset', 'medium',
      '-crf', '23',
      '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart',
      target,
    ],
    { stdio: 'inherit' }
  );
  if (result.status !== 0) {
    throw new Error('ffmpeg transcode failed');
  }
  await fs.rm(TMP_DIR, { recursive: true, force: true });
  console.log(`wrote: ${target}`);
}

record().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
