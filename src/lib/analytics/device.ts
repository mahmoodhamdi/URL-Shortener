import UAParser from 'ua-parser-js';

export interface DeviceInfo {
  device: string;
  browser: string;
  os: string;
}

export function parseUserAgent(userAgent: string | null): DeviceInfo {
  if (!userAgent) {
    return {
      device: 'unknown',
      browser: 'unknown',
      os: 'unknown',
    };
  }

  const parser = new UAParser(userAgent);
  const result = parser.getResult();

  // Determine device type
  let device = 'desktop';
  if (result.device.type === 'mobile') {
    device = 'mobile';
  } else if (result.device.type === 'tablet') {
    device = 'tablet';
  }

  return {
    device,
    browser: result.browser.name || 'unknown',
    os: result.os.name || 'unknown',
  };
}

export function getDeviceType(userAgent: string | null): string {
  const { device } = parseUserAgent(userAgent);
  return device;
}

export function getBrowser(userAgent: string | null): string {
  const { browser } = parseUserAgent(userAgent);
  return browser;
}

export function getOS(userAgent: string | null): string {
  const { os } = parseUserAgent(userAgent);
  return os;
}
