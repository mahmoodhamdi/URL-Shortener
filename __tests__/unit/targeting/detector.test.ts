import { describe, it, expect } from 'vitest';
import {
  detectDevice,
  detectOS,
  detectBrowser,
  detectCountry,
  detectLanguage,
  detectAll,
} from '@/lib/targeting/detector';

describe('Device Detection', () => {
  describe('detectDevice', () => {
    it('should detect mobile devices', () => {
      const userAgents = [
        'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        'Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36 Mobile',
        'Mozilla/5.0 (iPod; CPU iPhone OS 14_0 like Mac OS X)',
        'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900)',
        'Mozilla/5.0 (Windows Phone 10.0)',
        'Opera Mini/8.0',
        'Mozilla/5.0 (compatible; MSIE 10.0; Windows Phone 8.0; IEMobile/10.0)',
      ];

      userAgents.forEach(ua => {
        expect(detectDevice(ua)).toBe('mobile');
      });
    });

    it('should detect tablets', () => {
      const userAgents = [
        'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)',
        'Mozilla/5.0 (Linux; Android 10; SM-T500)',
        'Mozilla/5.0 (Linux; Android 10; Kindle Fire)',
        'Mozilla/5.0 (Linux; U; Android 4.0.3; Silk/3.0)',
      ];

      userAgents.forEach(ua => {
        expect(detectDevice(ua)).toBe('tablet');
      });
    });

    it('should detect desktop devices', () => {
      const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
      ];

      userAgents.forEach(ua => {
        expect(detectDevice(ua)).toBe('desktop');
      });
    });

    it('should default to desktop for null/empty user agent', () => {
      expect(detectDevice(null)).toBe('desktop');
      expect(detectDevice('')).toBe('desktop');
    });
  });

  describe('detectOS', () => {
    it('should detect iOS', () => {
      expect(detectOS('Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)')).toBe('ios');
      expect(detectOS('Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)')).toBe('ios');
      expect(detectOS('Mozilla/5.0 (iPod; CPU iPhone OS 14_0 like Mac OS X)')).toBe('ios');
    });

    it('should detect Android', () => {
      expect(detectOS('Mozilla/5.0 (Linux; Android 10; SM-G973F)')).toBe('android');
    });

    it('should detect Windows', () => {
      expect(detectOS('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe('windows');
    });

    it('should detect macOS', () => {
      expect(detectOS('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)')).toBe('macos');
    });

    it('should detect Linux', () => {
      expect(detectOS('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36')).toBe('linux');
    });

    it('should detect Chrome OS', () => {
      expect(detectOS('Mozilla/5.0 (X11; CrOS x86_64 13421.102.0)')).toBe('chromeos');
    });

    it('should return unknown for unrecognized OS', () => {
      expect(detectOS('Unknown User Agent')).toBe('unknown');
      expect(detectOS(null)).toBe('unknown');
    });
  });

  describe('detectBrowser', () => {
    it('should detect Chrome', () => {
      expect(detectBrowser('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/91.0')).toBe('chrome');
      expect(detectBrowser('Mozilla/5.0 (iPhone) CriOS/91.0 Safari/604.1')).toBe('chrome');
    });

    it('should detect Safari', () => {
      expect(detectBrowser('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15')).toBe('safari');
    });

    it('should detect Firefox', () => {
      expect(detectBrowser('Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Firefox/89.0')).toBe('firefox');
      expect(detectBrowser('Mozilla/5.0 (iPhone) FxiOS/34.0 Safari/605.1.15')).toBe('firefox');
    });

    it('should detect Edge', () => {
      expect(detectBrowser('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/91.0 Edg/91.0')).toBe('edge');
      expect(detectBrowser('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Edge/18.0')).toBe('edge');
    });

    it('should detect Opera', () => {
      expect(detectBrowser('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/91.0 OPR/77.0')).toBe('opera');
      expect(detectBrowser('Opera/9.80 (Windows NT 6.1; U)')).toBe('opera');
    });

    it('should detect Samsung Browser', () => {
      expect(detectBrowser('Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 SamsungBrowser/12.0')).toBe('samsung');
    });

    it('should return unknown for unrecognized browser', () => {
      expect(detectBrowser('Unknown User Agent')).toBe('unknown');
      expect(detectBrowser(null)).toBe('unknown');
    });
  });

  describe('detectCountry', () => {
    it('should detect country from Vercel header', () => {
      const headers = new Headers();
      headers.set('x-vercel-ip-country', 'eg');
      expect(detectCountry(headers)).toBe('EG');
    });

    it('should detect country from Cloudflare header', () => {
      const headers = new Headers();
      headers.set('cf-ipcountry', 'sa');
      expect(detectCountry(headers)).toBe('SA');
    });

    it('should detect country from CloudFront header', () => {
      const headers = new Headers();
      headers.set('cloudfront-viewer-country', 'us');
      expect(detectCountry(headers)).toBe('US');
    });

    it('should detect country from generic geo header', () => {
      const headers = new Headers();
      headers.set('x-geo-country', 'gb');
      expect(detectCountry(headers)).toBe('GB');
    });

    it('should prioritize Vercel header', () => {
      const headers = new Headers();
      headers.set('x-vercel-ip-country', 'EG');
      headers.set('cf-ipcountry', 'SA');
      expect(detectCountry(headers)).toBe('EG');
    });

    it('should return null when no country header', () => {
      const headers = new Headers();
      expect(detectCountry(headers)).toBeNull();
    });
  });

  describe('detectLanguage', () => {
    it('should detect primary language', () => {
      const headers = new Headers();
      headers.set('accept-language', 'ar-EG,ar;q=0.9,en;q=0.8');
      expect(detectLanguage(headers)).toBe('ar');
    });

    it('should handle single language', () => {
      const headers = new Headers();
      headers.set('accept-language', 'en-US');
      expect(detectLanguage(headers)).toBe('en');
    });

    it('should handle complex Accept-Language', () => {
      const headers = new Headers();
      headers.set('accept-language', 'en-US,en;q=0.9,fr;q=0.8,de;q=0.7');
      expect(detectLanguage(headers)).toBe('en');
    });

    it('should return null when no Accept-Language header', () => {
      const headers = new Headers();
      expect(detectLanguage(headers)).toBeNull();
    });
  });

  describe('detectAll', () => {
    it('should detect all info at once', () => {
      const userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1';
      const headers = new Headers();
      headers.set('x-vercel-ip-country', 'EG');
      headers.set('accept-language', 'ar-EG,ar;q=0.9');

      const result = detectAll(userAgent, headers);

      expect(result).toEqual({
        device: 'mobile',
        os: 'ios',
        browser: 'safari',
        country: 'EG',
        language: 'ar',
      });
    });

    it('should handle missing headers', () => {
      const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0';
      const headers = new Headers();

      const result = detectAll(userAgent, headers);

      expect(result.device).toBe('desktop');
      expect(result.os).toBe('windows');
      expect(result.browser).toBe('chrome');
      expect(result.country).toBeNull();
      expect(result.language).toBeNull();
    });
  });
});
