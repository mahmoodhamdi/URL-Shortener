/**
 * Records a short product walkthrough as a webm via Playwright, then transcodes
 * it to mp4 with ffmpeg. The recording is deterministic — every run captures
 * the same flow at the same pace — so re-running overwrites a clean asset.
 *
 * Output:
 *   marketing/videos/demo-short.mp4 (~30–45 s)
 *
 * Usage:
 *   PORT=3001 npx tsx marketing/scripts/demo-video.ts
 *
 * ffmpeg is required on PATH. On Ubuntu: `sudo apt install ffmpeg`.
 */
import { chromium, type Page } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs/promises';

const BASE_URL =
  process.env.BASE_URL || `http://127.0.0.1:${process.env.PORT || 3000}`;
const OUT_DIR = path.resolve(process.cwd(), 'marketing/videos');
const TMP_DIR = path.join(OUT_DIR, '.tmp');

async function pause(page: Page, ms: number) {
  await page.waitForTimeout(ms);
}

async function recordShort() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.mkdir(TMP_DIR, { recursive: true });

  const browser = await chromium.launch({
    channel: 'chrome',
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: TMP_DIR, size: { width: 1280, height: 720 } },
  });
  const page = await context.newPage();

  // 1. Land on home (EN, light)
  await page.goto(`${BASE_URL}/en`, { waitUntil: 'networkidle' });
  await pause(page, 1800);

  // 2. Type a URL
  const input = page.getByRole('textbox').first();
  if (await input.isVisible().catch(() => false)) {
    await input.click();
    await input.pressSequentially('https://anthropic.com/news', { delay: 60 });
    await pause(page, 800);
  }

  // 3. Submit (best effort — selector tolerant)
  const submit = page.getByRole('button', { name: /shorten|create|generate/i }).first();
  if (await submit.isVisible().catch(() => false)) {
    await submit.click().catch(() => null);
    await pause(page, 2500);
  }

  // 4. Visit pricing
  await page.goto(`${BASE_URL}/en/pricing`, { waitUntil: 'networkidle' });
  await pause(page, 2500);

  // 5. Switch to Arabic to show RTL
  await page.goto(`${BASE_URL}/ar`, { waitUntil: 'networkidle' });
  await pause(page, 2500);

  // 6. Status page
  await page.goto(`${BASE_URL}/en/status`, { waitUntil: 'networkidle' });
  await pause(page, 2200);

  const video = page.video();
  await context.close();
  await browser.close();

  if (!video) throw new Error('Playwright did not produce a recording');

  const rawPath = await video.path();
  const target = path.join(OUT_DIR, 'demo-short.mp4');
  const result = spawnSync(
    'ffmpeg',
    [
      '-y',
      '-i', rawPath,
      '-vf', 'fps=30,scale=1280:-2:flags=lanczos',
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

recordShort().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
