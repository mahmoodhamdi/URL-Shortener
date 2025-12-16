import { prisma } from '@/lib/db/prisma';
import { parseUserAgent } from './device';
import type { Click, LinkStats, TimePeriod } from '@/types';

export interface TrackClickInput {
  linkId: string;
  ip?: string;
  userAgent?: string;
  referrer?: string;
  country?: string;
  city?: string;
}

export async function trackClick(input: TrackClickInput): Promise<Click> {
  const deviceInfo = parseUserAgent(input.userAgent || null);

  const click = await prisma.click.create({
    data: {
      linkId: input.linkId,
      ip: input.ip || null,
      userAgent: input.userAgent || null,
      referrer: input.referrer || null,
      country: input.country || null,
      city: input.city || null,
      device: deviceInfo.device,
      browser: deviceInfo.browser,
      os: deviceInfo.os,
    },
  });

  return click as Click;
}

/**
 * Track click asynchronously (fire-and-forget)
 * Use this for redirect handlers where response speed is critical.
 * The click is tracked in the background without blocking the redirect.
 *
 * @param input - Click tracking data
 * @returns void - Does not wait for the database write to complete
 */
export function trackClickAsync(input: TrackClickInput): void {
  // Fire and forget - don't await
  trackClick(input).catch((error) => {
    // Log error but don't throw - we don't want to affect the redirect
    console.error('[Analytics] Failed to track click asynchronously:', error);
  });
}

/**
 * Track click with optional background processing
 * Allows choosing between synchronous (for accuracy) and async (for speed)
 *
 * @param input - Click tracking data
 * @param options - Processing options
 * @returns Promise<Click | void> depending on async option
 */
export async function trackClickWithOptions(
  input: TrackClickInput,
  options: { async?: boolean } = {}
): Promise<Click | void> {
  if (options.async) {
    trackClickAsync(input);
    return;
  }
  return trackClick(input);
}

export async function getClicksByLinkId(linkId: string): Promise<Click[]> {
  const clicks = await prisma.click.findMany({
    where: { linkId },
    orderBy: { clickedAt: 'desc' },
  });

  return clicks as Click[];
}

function getDateRangeFilter(period: TimePeriod): Date | null {
  const now = new Date();
  switch (period) {
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case '90d':
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    default:
      return null;
  }
}

export async function getLinkStats(linkId: string, period: TimePeriod = 'all'): Promise<LinkStats> {
  const dateFilter = getDateRangeFilter(period);
  const whereClause: Record<string, unknown> = { linkId };

  if (dateFilter) {
    whereClause.clickedAt = { gte: dateFilter };
  }

  const clicks = await prisma.click.findMany({
    where: whereClause,
    orderBy: { clickedAt: 'desc' },
  });

  const totalClicks = clicks.length;

  // Unique visitors by IP
  const uniqueIps = new Set(clicks.map((c) => c.ip).filter(Boolean));
  const uniqueVisitors = uniqueIps.size || totalClicks;

  const lastClick = clicks.length > 0 ? clicks[0].clickedAt : null;

  // Clicks by date
  const clicksByDateMap = new Map<string, number>();
  clicks.forEach((click) => {
    const date = click.clickedAt.toISOString().split('T')[0];
    clicksByDateMap.set(date, (clicksByDateMap.get(date) || 0) + 1);
  });
  const clicksByDate = Array.from(clicksByDateMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Top countries
  const countriesMap = new Map<string, number>();
  clicks.forEach((click) => {
    const country = click.country || 'Unknown';
    countriesMap.set(country, (countriesMap.get(country) || 0) + 1);
  });
  const topCountries = Array.from(countriesMap.entries())
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Top referrers
  const referrersMap = new Map<string, number>();
  clicks.forEach((click) => {
    const referrer = click.referrer || 'Direct';
    referrersMap.set(referrer, (referrersMap.get(referrer) || 0) + 1);
  });
  const topReferrers = Array.from(referrersMap.entries())
    .map(([referrer, count]) => ({ referrer, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Devices
  const devicesMap = new Map<string, number>();
  clicks.forEach((click) => {
    const device = click.device || 'Unknown';
    devicesMap.set(device, (devicesMap.get(device) || 0) + 1);
  });
  const devices = Array.from(devicesMap.entries())
    .map(([device, count]) => ({ device, count }))
    .sort((a, b) => b.count - a.count);

  // Browsers
  const browsersMap = new Map<string, number>();
  clicks.forEach((click) => {
    const browser = click.browser || 'Unknown';
    browsersMap.set(browser, (browsersMap.get(browser) || 0) + 1);
  });
  const browsers = Array.from(browsersMap.entries())
    .map(([browser, count]) => ({ browser, count }))
    .sort((a, b) => b.count - a.count);

  // OS
  const osMap = new Map<string, number>();
  clicks.forEach((click) => {
    const os = click.os || 'Unknown';
    osMap.set(os, (osMap.get(os) || 0) + 1);
  });
  const os = Array.from(osMap.entries())
    .map(([osName, count]) => ({ os: osName, count }))
    .sort((a, b) => b.count - a.count);

  return {
    totalClicks,
    uniqueVisitors,
    lastClick,
    clicksByDate,
    topCountries,
    topReferrers,
    devices,
    browsers,
    os,
  };
}

export function exportStatsToCSV(stats: LinkStats): string {
  const lines: string[] = [];

  // Header section
  lines.push('Overview');
  lines.push(`Total Clicks,${stats.totalClicks}`);
  lines.push(`Unique Visitors,${stats.uniqueVisitors}`);
  lines.push(`Last Click,${stats.lastClick?.toISOString() || 'N/A'}`);
  lines.push('');

  // Clicks by date
  lines.push('Clicks by Date');
  lines.push('Date,Count');
  stats.clicksByDate.forEach((item) => {
    lines.push(`${item.date},${item.count}`);
  });
  lines.push('');

  // Top countries
  lines.push('Top Countries');
  lines.push('Country,Count');
  stats.topCountries.forEach((item) => {
    lines.push(`${item.country},${item.count}`);
  });
  lines.push('');

  // Devices
  lines.push('Devices');
  lines.push('Device,Count');
  stats.devices.forEach((item) => {
    lines.push(`${item.device},${item.count}`);
  });

  return lines.join('\n');
}

export function exportStatsToJSON(stats: LinkStats): string {
  return JSON.stringify(stats, null, 2);
}
