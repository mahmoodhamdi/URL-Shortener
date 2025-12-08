import { describe, it, expect } from 'vitest';
import {
  generateQrDataUrl,
  generateQrSvg,
} from '@/lib/url/qr';

describe('QR Code Generator', () => {
  describe('generateQrDataUrl', () => {
    it('should generate a data URL for a valid URL', async () => {
      const result = await generateQrDataUrl('https://example.com');

      expect(result).toMatch(/^data:image\/png;base64,/);
    });

    it('should generate QR with custom options', async () => {
      const result = await generateQrDataUrl('https://example.com', {
        width: 512,
        margin: 4,
        color: {
          dark: '#ff0000',
          light: '#ffffff',
        },
      });

      expect(result).toMatch(/^data:image\/png;base64,/);
    });

    it('should work with short URLs', async () => {
      const result = await generateQrDataUrl('https://a.bc');

      expect(result).toMatch(/^data:image\/png;base64,/);
    });
  });

  describe('generateQrSvg', () => {
    it('should generate an SVG string', async () => {
      const result = await generateQrSvg('https://example.com');

      expect(result).toContain('<svg');
      expect(result).toContain('</svg>');
    });

    it('should generate SVG with custom colors', async () => {
      const result = await generateQrSvg('https://example.com', {
        color: {
          dark: '#0000ff',
          light: '#ffff00',
        },
      });

      expect(result).toContain('<svg');
    });
  });
});
