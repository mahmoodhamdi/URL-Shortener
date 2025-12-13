/**
 * Device, OS, Browser, Country, and Language detection utilities
 */

export type DeviceType = 'mobile' | 'desktop' | 'tablet';
export type OSType = 'ios' | 'android' | 'windows' | 'macos' | 'linux' | 'chromeos' | 'unknown';
export type BrowserType = 'chrome' | 'safari' | 'firefox' | 'edge' | 'opera' | 'samsung' | 'unknown';

export interface DetectedInfo {
  device: DeviceType;
  os: OSType;
  browser: BrowserType;
  country: string | null;
  language: string | null;
}

/**
 * Detect device type from User-Agent
 */
export function detectDevice(userAgent: string | null): DeviceType {
  if (!userAgent) return 'desktop';

  const ua = userAgent.toLowerCase();

  // Check for tablets first (they often contain mobile keywords too)
  if (
    ua.includes('ipad') ||
    ua.includes('tablet') ||
    (ua.includes('android') && !ua.includes('mobile')) ||
    ua.includes('kindle') ||
    ua.includes('silk')
  ) {
    return 'tablet';
  }

  // Check for mobile devices
  if (
    ua.includes('mobile') ||
    ua.includes('iphone') ||
    ua.includes('ipod') ||
    ua.includes('android') ||
    ua.includes('blackberry') ||
    ua.includes('windows phone') ||
    ua.includes('opera mini') ||
    ua.includes('iemobile')
  ) {
    return 'mobile';
  }

  return 'desktop';
}

/**
 * Detect operating system from User-Agent
 */
export function detectOS(userAgent: string | null): OSType {
  if (!userAgent) return 'unknown';

  const ua = userAgent.toLowerCase();

  // iOS detection (iPhone, iPad, iPod)
  if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) {
    return 'ios';
  }

  // Android detection
  if (ua.includes('android')) {
    return 'android';
  }

  // Windows detection
  if (ua.includes('windows')) {
    return 'windows';
  }

  // macOS detection
  if (ua.includes('macintosh') || ua.includes('mac os x')) {
    return 'macos';
  }

  // Chrome OS detection
  if (ua.includes('cros')) {
    return 'chromeos';
  }

  // Linux detection (after Chrome OS since CrOS also contains Linux)
  if (ua.includes('linux')) {
    return 'linux';
  }

  return 'unknown';
}

/**
 * Detect browser from User-Agent
 */
export function detectBrowser(userAgent: string | null): BrowserType {
  if (!userAgent) return 'unknown';

  const ua = userAgent.toLowerCase();

  // Order matters - check more specific browsers first

  // Samsung Browser
  if (ua.includes('samsungbrowser')) {
    return 'samsung';
  }

  // Opera (check before Chrome since Opera includes Chrome in UA)
  if (ua.includes('opera') || ua.includes('opr/')) {
    return 'opera';
  }

  // Edge (check before Chrome since new Edge includes Chrome in UA)
  if (ua.includes('edg/') || ua.includes('edge/')) {
    return 'edge';
  }

  // Firefox
  if (ua.includes('firefox') || ua.includes('fxios')) {
    return 'firefox';
  }

  // Chrome (including CriOS for Chrome on iOS)
  // Check CriOS first before Safari
  if (ua.includes('crios')) {
    return 'chrome';
  }

  // Safari (check before Chrome since Chrome desktop includes Safari in UA)
  // Safari doesn't include 'Chrome' in its UA
  if (ua.includes('safari') && !ua.includes('chrome') && !ua.includes('chromium')) {
    return 'safari';
  }

  // Chrome
  if (ua.includes('chrome') || ua.includes('chromium')) {
    return 'chrome';
  }

  return 'unknown';
}

/**
 * Detect country from request headers
 * Supports Vercel, Cloudflare, and custom headers
 */
export function detectCountry(headers: Headers): string | null {
  // Vercel Edge
  const vercelCountry = headers.get('x-vercel-ip-country');
  if (vercelCountry) return vercelCountry.toUpperCase();

  // Cloudflare
  const cfCountry = headers.get('cf-ipcountry');
  if (cfCountry) return cfCountry.toUpperCase();

  // AWS CloudFront
  const cloudFrontCountry = headers.get('cloudfront-viewer-country');
  if (cloudFrontCountry) return cloudFrontCountry.toUpperCase();

  // Generic geo header (some reverse proxies)
  const geoCountry = headers.get('x-geo-country');
  if (geoCountry) return geoCountry.toUpperCase();

  return null;
}

/**
 * Detect primary language from Accept-Language header
 */
export function detectLanguage(headers: Headers): string | null {
  const acceptLanguage = headers.get('accept-language');
  if (!acceptLanguage) return null;

  // Parse Accept-Language header
  // Format: en-US,en;q=0.9,ar;q=0.8
  const languages = acceptLanguage
    .split(',')
    .map(lang => {
      const [code, qValue] = lang.trim().split(';q=');
      return {
        code: code.split('-')[0].toLowerCase(), // Get primary language code
        q: qValue ? parseFloat(qValue) : 1.0,
      };
    })
    .sort((a, b) => b.q - a.q);

  return languages.length > 0 ? languages[0].code : null;
}

/**
 * Detect all information from request
 */
export function detectAll(userAgent: string | null, headers: Headers): DetectedInfo {
  return {
    device: detectDevice(userAgent),
    os: detectOS(userAgent),
    browser: detectBrowser(userAgent),
    country: detectCountry(headers),
    language: detectLanguage(headers),
  };
}
