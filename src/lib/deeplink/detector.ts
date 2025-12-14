/**
 * Device and platform detection utilities for deep linking
 */

export type Platform = 'ios' | 'android' | 'desktop' | 'unknown';
export type DeviceType = 'mobile' | 'tablet' | 'desktop' | 'unknown';

export interface DeviceInfo {
  platform: Platform;
  deviceType: DeviceType;
  isIOS: boolean;
  isAndroid: boolean;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  userAgent: string;
}

/**
 * Detect platform from user agent string
 */
export function detectPlatform(userAgent: string): Platform {
  const ua = userAgent.toLowerCase();

  // iOS detection (iPhone, iPad, iPod)
  if (/iphone|ipad|ipod/.test(ua)) {
    return 'ios';
  }

  // Android detection
  if (/android/.test(ua)) {
    return 'android';
  }

  // Desktop detection
  if (/windows|macintosh|linux/.test(ua) && !/mobile/.test(ua)) {
    return 'desktop';
  }

  return 'unknown';
}

/**
 * Detect device type from user agent string
 */
export function detectDeviceType(userAgent: string): DeviceType {
  const ua = userAgent.toLowerCase();

  // Tablet detection
  if (/ipad/.test(ua) || (/android/.test(ua) && !/mobile/.test(ua))) {
    return 'tablet';
  }

  // Mobile detection
  if (/iphone|ipod|android.*mobile|mobile/.test(ua)) {
    return 'mobile';
  }

  // Desktop detection
  if (/windows|macintosh|linux/.test(ua)) {
    return 'desktop';
  }

  return 'unknown';
}

/**
 * Get comprehensive device info from user agent
 */
export function getDeviceInfo(userAgent: string): DeviceInfo {
  const platform = detectPlatform(userAgent);
  const deviceType = detectDeviceType(userAgent);

  return {
    platform,
    deviceType,
    isIOS: platform === 'ios',
    isAndroid: platform === 'android',
    isMobile: deviceType === 'mobile',
    isTablet: deviceType === 'tablet',
    isDesktop: deviceType === 'desktop',
    userAgent,
  };
}

/**
 * Check if the device supports deep linking
 */
export function supportsDeepLinking(deviceInfo: DeviceInfo): boolean {
  return deviceInfo.isIOS || deviceInfo.isAndroid;
}

/**
 * Get app store URL for platform
 */
export function getAppStoreUrl(
  platform: Platform,
  config: {
    iosAppStoreUrl?: string;
    androidPlayStoreUrl?: string;
  }
): string | null {
  if (platform === 'ios' && config.iosAppStoreUrl) {
    return config.iosAppStoreUrl;
  }

  if (platform === 'android' && config.androidPlayStoreUrl) {
    return config.androidPlayStoreUrl;
  }

  return null;
}
