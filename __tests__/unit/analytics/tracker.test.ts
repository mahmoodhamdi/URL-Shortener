import { describe, it, expect } from 'vitest';
import {
  exportStatsToCSV,
  exportStatsToJSON,
} from '@/lib/analytics/tracker';
import type { LinkStats } from '@/types';

describe('Analytics Tracker', () => {
  const mockStats: LinkStats = {
    totalClicks: 1250,
    uniqueVisitors: 980,
    lastClick: new Date('2025-12-15T10:30:00Z'),
    clicksByDate: [
      { date: '2025-12-13', count: 400 },
      { date: '2025-12-14', count: 500 },
      { date: '2025-12-15', count: 350 },
    ],
    topCountries: [
      { country: 'United States', count: 500 },
      { country: 'United Kingdom', count: 250 },
      { country: 'Germany', count: 150 },
      { country: 'France', count: 100 },
      { country: 'Canada', count: 80 },
    ],
    topReferrers: [
      { referrer: 'google.com', count: 400 },
      { referrer: 'Direct', count: 350 },
      { referrer: 'twitter.com', count: 200 },
      { referrer: 'linkedin.com', count: 150 },
    ],
    devices: [
      { device: 'Desktop', count: 750 },
      { device: 'Mobile', count: 400 },
      { device: 'Tablet', count: 100 },
    ],
    browsers: [
      { browser: 'Chrome', count: 600 },
      { browser: 'Safari', count: 300 },
      { browser: 'Firefox', count: 200 },
      { browser: 'Edge', count: 100 },
      { browser: 'Unknown', count: 50 },
    ],
    os: [
      { os: 'Windows', count: 500 },
      { os: 'macOS', count: 350 },
      { os: 'iOS', count: 200 },
      { os: 'Android', count: 150 },
      { os: 'Linux', count: 50 },
    ],
  };

  describe('exportStatsToCSV', () => {
    it('should export stats to CSV format', () => {
      const csv = exportStatsToCSV(mockStats);

      expect(csv).toBeDefined();
      expect(typeof csv).toBe('string');
    });

    it('should include overview section', () => {
      const csv = exportStatsToCSV(mockStats);

      expect(csv).toContain('Overview');
      expect(csv).toContain('Total Clicks,1250');
      expect(csv).toContain('Unique Visitors,980');
      expect(csv).toContain('Last Click');
    });

    it('should include clicks by date section', () => {
      const csv = exportStatsToCSV(mockStats);

      expect(csv).toContain('Clicks by Date');
      expect(csv).toContain('Date,Count');
      expect(csv).toContain('2025-12-13,400');
      expect(csv).toContain('2025-12-14,500');
      expect(csv).toContain('2025-12-15,350');
    });

    it('should include top countries section', () => {
      const csv = exportStatsToCSV(mockStats);

      expect(csv).toContain('Top Countries');
      expect(csv).toContain('Country,Count');
      expect(csv).toContain('United States,500');
      expect(csv).toContain('United Kingdom,250');
    });

    it('should include devices section', () => {
      const csv = exportStatsToCSV(mockStats);

      expect(csv).toContain('Devices');
      expect(csv).toContain('Device,Count');
      expect(csv).toContain('Desktop,750');
      expect(csv).toContain('Mobile,400');
      expect(csv).toContain('Tablet,100');
    });

    it('should handle empty stats', () => {
      const emptyStats: LinkStats = {
        totalClicks: 0,
        uniqueVisitors: 0,
        lastClick: null,
        clicksByDate: [],
        topCountries: [],
        topReferrers: [],
        devices: [],
        browsers: [],
        os: [],
      };

      const csv = exportStatsToCSV(emptyStats);

      expect(csv).toContain('Total Clicks,0');
      expect(csv).toContain('Unique Visitors,0');
      expect(csv).toContain('Last Click,N/A');
    });

    it('should handle stats with no lastClick', () => {
      const statsWithoutLastClick = { ...mockStats, lastClick: null };
      const csv = exportStatsToCSV(statsWithoutLastClick);

      expect(csv).toContain('Last Click,N/A');
    });

    it('should produce valid CSV with proper line breaks', () => {
      const csv = exportStatsToCSV(mockStats);
      const lines = csv.split('\n');

      expect(lines.length).toBeGreaterThan(10);
      // Check that some lines have proper CSV format
      expect(lines.some(line => line.includes(','))).toBe(true);
    });
  });

  describe('exportStatsToJSON', () => {
    it('should export stats to JSON format', () => {
      const json = exportStatsToJSON(mockStats);

      expect(json).toBeDefined();
      expect(typeof json).toBe('string');
    });

    it('should produce valid JSON', () => {
      const json = exportStatsToJSON(mockStats);

      expect(() => JSON.parse(json)).not.toThrow();
    });

    it('should include all stats fields', () => {
      const json = exportStatsToJSON(mockStats);
      const parsed = JSON.parse(json);

      expect(parsed.totalClicks).toBe(1250);
      expect(parsed.uniqueVisitors).toBe(980);
      expect(parsed.clicksByDate).toHaveLength(3);
      expect(parsed.topCountries).toHaveLength(5);
      expect(parsed.topReferrers).toHaveLength(4);
      expect(parsed.devices).toHaveLength(3);
      expect(parsed.browsers).toHaveLength(5);
      expect(parsed.os).toHaveLength(5);
    });

    it('should be pretty-printed with indentation', () => {
      const json = exportStatsToJSON(mockStats);

      // Pretty-printed JSON should have newlines and indentation
      expect(json).toContain('\n');
      expect(json).toContain('  '); // 2-space indentation
    });

    it('should handle empty stats', () => {
      const emptyStats: LinkStats = {
        totalClicks: 0,
        uniqueVisitors: 0,
        lastClick: null,
        clicksByDate: [],
        topCountries: [],
        topReferrers: [],
        devices: [],
        browsers: [],
        os: [],
      };

      const json = exportStatsToJSON(emptyStats);
      const parsed = JSON.parse(json);

      expect(parsed.totalClicks).toBe(0);
      expect(parsed.uniqueVisitors).toBe(0);
      expect(parsed.lastClick).toBeNull();
      expect(parsed.clicksByDate).toEqual([]);
    });

    it('should preserve date format in lastClick', () => {
      const json = exportStatsToJSON(mockStats);
      const parsed = JSON.parse(json);

      // Date will be serialized as ISO string
      expect(parsed.lastClick).toBe('2025-12-15T10:30:00.000Z');
    });

    it('should preserve nested array structures', () => {
      const json = exportStatsToJSON(mockStats);
      const parsed = JSON.parse(json);

      expect(Array.isArray(parsed.clicksByDate)).toBe(true);
      expect(parsed.clicksByDate[0]).toHaveProperty('date');
      expect(parsed.clicksByDate[0]).toHaveProperty('count');

      expect(parsed.topCountries[0]).toHaveProperty('country');
      expect(parsed.topCountries[0]).toHaveProperty('count');
    });
  });
});
