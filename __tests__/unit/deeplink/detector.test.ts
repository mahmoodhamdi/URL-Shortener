import { describe, it, expect } from 'vitest';
import {
  detectPlatform,
  detectDeviceType,
  getDeviceInfo,
  supportsDeepLinking,
  getAppStoreUrl,
} from '@/lib/deeplink/detector';
import type { Platform, DeviceInfo } from '@/lib/deeplink/detector';

describe('Deep Link Detector', () => {
  describe('detectPlatform', () => {
    describe('iOS detection', () => {
      it('should detect iPhone', () => {
        const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15';
        expect(detectPlatform(ua)).toBe('ios');
      });

      it('should detect iPad', () => {
        const ua = 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15';
        expect(detectPlatform(ua)).toBe('ios');
      });

      it('should detect iPod', () => {
        const ua = 'Mozilla/5.0 (iPod touch; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15';
        expect(detectPlatform(ua)).toBe('ios');
      });

      it('should be case-insensitive for iOS', () => {
        const ua = 'Mozilla/5.0 (IPHONE; CPU iPhone OS 17_0 like Mac OS X)';
        expect(detectPlatform(ua)).toBe('ios');
      });
    });

    describe('Android detection', () => {
      it('should detect Android phone', () => {
        const ua = 'Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36';
        expect(detectPlatform(ua)).toBe('android');
      });

      it('should detect Android tablet', () => {
        const ua = 'Mozilla/5.0 (Linux; Android 13; SM-T870) AppleWebKit/537.36';
        expect(detectPlatform(ua)).toBe('android');
      });

      it('should be case-insensitive for Android', () => {
        const ua = 'Mozilla/5.0 (Linux; ANDROID 14; Pixel 8)';
        expect(detectPlatform(ua)).toBe('android');
      });
    });

    describe('Desktop detection', () => {
      it('should detect Windows desktop', () => {
        const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
        expect(detectPlatform(ua)).toBe('desktop');
      });

      it('should detect macOS desktop', () => {
        const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';
        expect(detectPlatform(ua)).toBe('desktop');
      });

      it('should detect Linux desktop', () => {
        const ua = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36';
        expect(detectPlatform(ua)).toBe('desktop');
      });

      it('should not detect as desktop if mobile keyword present', () => {
        const ua = 'Mozilla/5.0 (Linux; Mobile) AppleWebKit/537.36';
        expect(detectPlatform(ua)).toBe('unknown');
      });
    });

    describe('Unknown platform', () => {
      it('should return unknown for unrecognized user agents', () => {
        const ua = 'Some/Unknown Browser 1.0';
        expect(detectPlatform(ua)).toBe('unknown');
      });

      it('should return unknown for empty string', () => {
        expect(detectPlatform('')).toBe('unknown');
      });

      it('should return unknown for mobile without specific platform', () => {
        const ua = 'Mozilla/5.0 Mobile Safari';
        expect(detectPlatform(ua)).toBe('unknown');
      });
    });
  });

  describe('detectDeviceType', () => {
    describe('Tablet detection', () => {
      it('should detect iPad as tablet', () => {
        const ua = 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15';
        expect(detectDeviceType(ua)).toBe('tablet');
      });

      it('should detect Android tablet (no mobile keyword)', () => {
        const ua = 'Mozilla/5.0 (Linux; Android 13; SM-T870) AppleWebKit/537.36';
        expect(detectDeviceType(ua)).toBe('tablet');
      });
    });

    describe('Mobile detection', () => {
      it('should detect iPhone as mobile', () => {
        const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15';
        expect(detectDeviceType(ua)).toBe('mobile');
      });

      it('should detect iPod as mobile', () => {
        const ua = 'Mozilla/5.0 (iPod touch; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15';
        expect(detectDeviceType(ua)).toBe('mobile');
      });

      it('should detect Android mobile', () => {
        const ua = 'Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 Mobile';
        expect(detectDeviceType(ua)).toBe('mobile');
      });

      it('should detect generic mobile', () => {
        const ua = 'Mozilla/5.0 Mobile Safari';
        expect(detectDeviceType(ua)).toBe('mobile');
      });
    });

    describe('Desktop detection', () => {
      it('should detect Windows as desktop', () => {
        const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
        expect(detectDeviceType(ua)).toBe('desktop');
      });

      it('should detect macOS as desktop', () => {
        const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';
        expect(detectDeviceType(ua)).toBe('desktop');
      });

      it('should detect Linux as desktop', () => {
        const ua = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36';
        expect(detectDeviceType(ua)).toBe('desktop');
      });
    });

    describe('Unknown device type', () => {
      it('should return unknown for unrecognized user agents', () => {
        const ua = 'SomeBot/1.0';
        expect(detectDeviceType(ua)).toBe('unknown');
      });

      it('should return unknown for empty string', () => {
        expect(detectDeviceType('')).toBe('unknown');
      });
    });
  });

  describe('getDeviceInfo', () => {
    it('should return complete device info for iPhone', () => {
      const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15';
      const info = getDeviceInfo(ua);

      expect(info.platform).toBe('ios');
      expect(info.deviceType).toBe('mobile');
      expect(info.isIOS).toBe(true);
      expect(info.isAndroid).toBe(false);
      expect(info.isMobile).toBe(true);
      expect(info.isTablet).toBe(false);
      expect(info.isDesktop).toBe(false);
      expect(info.userAgent).toBe(ua);
    });

    it('should return complete device info for iPad', () => {
      const ua = 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15';
      const info = getDeviceInfo(ua);

      expect(info.platform).toBe('ios');
      expect(info.deviceType).toBe('tablet');
      expect(info.isIOS).toBe(true);
      expect(info.isAndroid).toBe(false);
      expect(info.isMobile).toBe(false);
      expect(info.isTablet).toBe(true);
      expect(info.isDesktop).toBe(false);
    });

    it('should return complete device info for Android phone', () => {
      const ua = 'Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 Mobile';
      const info = getDeviceInfo(ua);

      expect(info.platform).toBe('android');
      expect(info.deviceType).toBe('mobile');
      expect(info.isIOS).toBe(false);
      expect(info.isAndroid).toBe(true);
      expect(info.isMobile).toBe(true);
      expect(info.isTablet).toBe(false);
      expect(info.isDesktop).toBe(false);
    });

    it('should return complete device info for Android tablet', () => {
      const ua = 'Mozilla/5.0 (Linux; Android 13; SM-T870) AppleWebKit/537.36';
      const info = getDeviceInfo(ua);

      expect(info.platform).toBe('android');
      expect(info.deviceType).toBe('tablet');
      expect(info.isIOS).toBe(false);
      expect(info.isAndroid).toBe(true);
      expect(info.isMobile).toBe(false);
      expect(info.isTablet).toBe(true);
      expect(info.isDesktop).toBe(false);
    });

    it('should return complete device info for desktop', () => {
      const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
      const info = getDeviceInfo(ua);

      expect(info.platform).toBe('desktop');
      expect(info.deviceType).toBe('desktop');
      expect(info.isIOS).toBe(false);
      expect(info.isAndroid).toBe(false);
      expect(info.isMobile).toBe(false);
      expect(info.isTablet).toBe(false);
      expect(info.isDesktop).toBe(true);
    });

    it('should return unknown values for unrecognized user agent', () => {
      const ua = 'SomeBot/1.0';
      const info = getDeviceInfo(ua);

      expect(info.platform).toBe('unknown');
      expect(info.deviceType).toBe('unknown');
      expect(info.isIOS).toBe(false);
      expect(info.isAndroid).toBe(false);
      expect(info.isMobile).toBe(false);
      expect(info.isTablet).toBe(false);
      expect(info.isDesktop).toBe(false);
    });
  });

  describe('supportsDeepLinking', () => {
    it('should return true for iOS devices', () => {
      const deviceInfo: DeviceInfo = {
        platform: 'ios',
        deviceType: 'mobile',
        isIOS: true,
        isAndroid: false,
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        userAgent: 'iPhone',
      };
      expect(supportsDeepLinking(deviceInfo)).toBe(true);
    });

    it('should return true for Android devices', () => {
      const deviceInfo: DeviceInfo = {
        platform: 'android',
        deviceType: 'mobile',
        isIOS: false,
        isAndroid: true,
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        userAgent: 'Android',
      };
      expect(supportsDeepLinking(deviceInfo)).toBe(true);
    });

    it('should return false for desktop devices', () => {
      const deviceInfo: DeviceInfo = {
        platform: 'desktop',
        deviceType: 'desktop',
        isIOS: false,
        isAndroid: false,
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        userAgent: 'Windows',
      };
      expect(supportsDeepLinking(deviceInfo)).toBe(false);
    });

    it('should return false for unknown devices', () => {
      const deviceInfo: DeviceInfo = {
        platform: 'unknown',
        deviceType: 'unknown',
        isIOS: false,
        isAndroid: false,
        isMobile: false,
        isTablet: false,
        isDesktop: false,
        userAgent: 'Unknown',
      };
      expect(supportsDeepLinking(deviceInfo)).toBe(false);
    });
  });

  describe('getAppStoreUrl', () => {
    const config = {
      iosAppStoreUrl: 'https://apps.apple.com/app/myapp/id123456789',
      androidPlayStoreUrl: 'https://play.google.com/store/apps/details?id=com.example.myapp',
    };

    it('should return iOS App Store URL for iOS platform', () => {
      const url = getAppStoreUrl('ios', config);
      expect(url).toBe(config.iosAppStoreUrl);
    });

    it('should return Android Play Store URL for Android platform', () => {
      const url = getAppStoreUrl('android', config);
      expect(url).toBe(config.androidPlayStoreUrl);
    });

    it('should return null for desktop platform', () => {
      const url = getAppStoreUrl('desktop', config);
      expect(url).toBeNull();
    });

    it('should return null for unknown platform', () => {
      const url = getAppStoreUrl('unknown', config);
      expect(url).toBeNull();
    });

    it('should return null if iOS URL is not configured', () => {
      const url = getAppStoreUrl('ios', { androidPlayStoreUrl: config.androidPlayStoreUrl });
      expect(url).toBeNull();
    });

    it('should return null if Android URL is not configured', () => {
      const url = getAppStoreUrl('android', { iosAppStoreUrl: config.iosAppStoreUrl });
      expect(url).toBeNull();
    });

    it('should return null for empty config', () => {
      expect(getAppStoreUrl('ios', {})).toBeNull();
      expect(getAppStoreUrl('android', {})).toBeNull();
    });
  });
});
