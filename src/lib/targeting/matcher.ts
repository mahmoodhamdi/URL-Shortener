/**
 * Target matching logic for device/geo targeting
 */

import type { DetectedInfo, DeviceType, OSType, BrowserType } from './detector';

export type TargetType = 'DEVICE' | 'OS' | 'BROWSER' | 'COUNTRY' | 'LANGUAGE';

export interface Target {
  id: string;
  type: TargetType;
  value: string;
  targetUrl: string;
  priority: number;
  isActive: boolean;
}

// Valid values for each target type
export const VALID_DEVICE_VALUES: DeviceType[] = ['mobile', 'desktop', 'tablet'];

export const VALID_OS_VALUES: OSType[] = [
  'ios',
  'android',
  'windows',
  'macos',
  'linux',
  'chromeos',
];

export const VALID_BROWSER_VALUES: BrowserType[] = [
  'chrome',
  'safari',
  'firefox',
  'edge',
  'opera',
  'samsung',
];

// Common country codes (ISO 3166-1 alpha-2)
export const COMMON_COUNTRY_CODES = [
  // Arabic-speaking countries
  'EG', 'SA', 'AE', 'KW', 'QA', 'BH', 'OM', 'JO', 'LB', 'IQ', 'SY', 'YE', 'LY', 'TN', 'DZ', 'MA', 'SD', 'PS',
  // Major markets
  'US', 'GB', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'CH',
  'CA', 'AU', 'NZ', 'JP', 'KR', 'CN', 'IN', 'BR', 'MX', 'RU',
  'TR', 'PK', 'ID', 'MY', 'SG', 'TH', 'VN', 'PH',
];

// Common language codes (ISO 639-1)
export const COMMON_LANGUAGE_CODES = [
  'ar', 'en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja',
  'ko', 'hi', 'tr', 'nl', 'pl', 'vi', 'th', 'id', 'ms', 'fa',
];

/**
 * Check if a target value is valid for its type
 */
export function isValidTargetValue(type: TargetType, value: string): boolean {
  const normalizedValue = value.toLowerCase();

  switch (type) {
    case 'DEVICE':
      return VALID_DEVICE_VALUES.includes(normalizedValue as DeviceType);
    case 'OS':
      return VALID_OS_VALUES.includes(normalizedValue as OSType);
    case 'BROWSER':
      return VALID_BROWSER_VALUES.includes(normalizedValue as BrowserType);
    case 'COUNTRY':
      // Country codes are 2 letters
      return /^[A-Z]{2}$/i.test(value);
    case 'LANGUAGE':
      // Language codes are 2-3 letters
      return /^[a-z]{2,3}$/i.test(value);
    default:
      return false;
  }
}

/**
 * Normalize target value for storage
 */
export function normalizeTargetValue(type: TargetType, value: string): string {
  switch (type) {
    case 'COUNTRY':
      return value.toUpperCase();
    case 'LANGUAGE':
    case 'DEVICE':
    case 'OS':
    case 'BROWSER':
      return value.toLowerCase();
    default:
      return value;
  }
}

/**
 * Check if a single target matches the detected info
 */
export function matchesTarget(target: Target, detected: DetectedInfo): boolean {
  if (!target.isActive) return false;

  const normalizedValue = target.value.toLowerCase();

  switch (target.type) {
    case 'DEVICE':
      return detected.device === normalizedValue;

    case 'OS':
      return detected.os === normalizedValue;

    case 'BROWSER':
      return detected.browser === normalizedValue;

    case 'COUNTRY':
      return detected.country?.toUpperCase() === target.value.toUpperCase();

    case 'LANGUAGE':
      return detected.language?.toLowerCase() === normalizedValue;

    default:
      return false;
  }
}

/**
 * Find the best matching target URL from a list of targets
 * Returns null if no targets match
 */
export function findMatchingTarget(targets: Target[], detected: DetectedInfo): Target | null {
  if (!targets || targets.length === 0) return null;

  // Filter active targets and sort by priority (descending)
  const activeTargets = targets
    .filter(t => t.isActive)
    .sort((a, b) => b.priority - a.priority);

  // Find first matching target
  for (const target of activeTargets) {
    if (matchesTarget(target, detected)) {
      return target;
    }
  }

  return null;
}

/**
 * Get the target URL for a link based on detected info
 * Falls back to original URL if no targets match
 */
export function getTargetUrl(
  originalUrl: string,
  targets: Target[],
  detected: DetectedInfo
): string {
  const matchedTarget = findMatchingTarget(targets, detected);
  return matchedTarget ? matchedTarget.targetUrl : originalUrl;
}

/**
 * Get display label for target type
 */
export function getTargetTypeLabel(type: TargetType): string {
  const labels: Record<TargetType, string> = {
    DEVICE: 'Device',
    OS: 'Operating System',
    BROWSER: 'Browser',
    COUNTRY: 'Country',
    LANGUAGE: 'Language',
  };
  return labels[type];
}

/**
 * Get options for a target type
 */
export function getTargetTypeOptions(type: TargetType): { value: string; label: string }[] {
  switch (type) {
    case 'DEVICE':
      return [
        { value: 'mobile', label: 'Mobile' },
        { value: 'desktop', label: 'Desktop' },
        { value: 'tablet', label: 'Tablet' },
      ];

    case 'OS':
      return [
        { value: 'ios', label: 'iOS' },
        { value: 'android', label: 'Android' },
        { value: 'windows', label: 'Windows' },
        { value: 'macos', label: 'macOS' },
        { value: 'linux', label: 'Linux' },
        { value: 'chromeos', label: 'Chrome OS' },
      ];

    case 'BROWSER':
      return [
        { value: 'chrome', label: 'Chrome' },
        { value: 'safari', label: 'Safari' },
        { value: 'firefox', label: 'Firefox' },
        { value: 'edge', label: 'Edge' },
        { value: 'opera', label: 'Opera' },
        { value: 'samsung', label: 'Samsung Browser' },
      ];

    case 'COUNTRY':
      // Return common country codes with names
      return COMMON_COUNTRY_CODES.map(code => ({
        value: code,
        label: getCountryName(code),
      }));

    case 'LANGUAGE':
      return COMMON_LANGUAGE_CODES.map(code => ({
        value: code,
        label: getLanguageName(code),
      }));

    default:
      return [];
  }
}

/**
 * Get country name from ISO code
 */
function getCountryName(code: string): string {
  const countries: Record<string, string> = {
    // Arabic-speaking
    EG: 'Egypt',
    SA: 'Saudi Arabia',
    AE: 'UAE',
    KW: 'Kuwait',
    QA: 'Qatar',
    BH: 'Bahrain',
    OM: 'Oman',
    JO: 'Jordan',
    LB: 'Lebanon',
    IQ: 'Iraq',
    SY: 'Syria',
    YE: 'Yemen',
    LY: 'Libya',
    TN: 'Tunisia',
    DZ: 'Algeria',
    MA: 'Morocco',
    SD: 'Sudan',
    PS: 'Palestine',
    // Major markets
    US: 'United States',
    GB: 'United Kingdom',
    DE: 'Germany',
    FR: 'France',
    IT: 'Italy',
    ES: 'Spain',
    NL: 'Netherlands',
    BE: 'Belgium',
    AT: 'Austria',
    CH: 'Switzerland',
    CA: 'Canada',
    AU: 'Australia',
    NZ: 'New Zealand',
    JP: 'Japan',
    KR: 'South Korea',
    CN: 'China',
    IN: 'India',
    BR: 'Brazil',
    MX: 'Mexico',
    RU: 'Russia',
    TR: 'Turkey',
    PK: 'Pakistan',
    ID: 'Indonesia',
    MY: 'Malaysia',
    SG: 'Singapore',
    TH: 'Thailand',
    VN: 'Vietnam',
    PH: 'Philippines',
  };
  return countries[code] || code;
}

/**
 * Get language name from ISO code
 */
function getLanguageName(code: string): string {
  const languages: Record<string, string> = {
    ar: 'Arabic',
    en: 'English',
    es: 'Spanish',
    fr: 'French',
    de: 'German',
    it: 'Italian',
    pt: 'Portuguese',
    ru: 'Russian',
    zh: 'Chinese',
    ja: 'Japanese',
    ko: 'Korean',
    hi: 'Hindi',
    tr: 'Turkish',
    nl: 'Dutch',
    pl: 'Polish',
    vi: 'Vietnamese',
    th: 'Thai',
    id: 'Indonesian',
    ms: 'Malay',
    fa: 'Persian',
  };
  return languages[code] || code;
}
