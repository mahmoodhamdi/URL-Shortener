/**
 * Deep link page templates for iOS and Android
 */

import { escapeHtml } from '@/lib/cloaking/templates';
import { validateUrlForSSRF } from '@/lib/security/ssrf';

export interface DeepLinkConfig {
  ios?: {
    scheme?: string;         // e.g., "myapp://"
    universalLink?: string;  // e.g., "https://myapp.com"
    appStoreId?: string;     // e.g., "123456789"
    appStoreUrl?: string;    // Full App Store URL
  };
  android?: {
    scheme?: string;         // e.g., "myapp://"
    package?: string;        // e.g., "com.example.myapp"
    playStoreUrl?: string;   // Full Play Store URL
  };
  fallbackUrl: string;       // Web fallback URL
  waitTime?: number;         // ms to wait before fallback (default: 2500)
}

export interface DeepLinkPageOptions {
  config: DeepLinkConfig;
  path?: string;             // Path to append to scheme
  title?: string;            // Page title
}

/**
 * Validate deep link configuration
 */
export function validateDeepLinkConfig(config: unknown): {
  valid: boolean;
  error?: string;
} {
  if (!config || typeof config !== 'object') {
    return { valid: false, error: 'Configuration is required' };
  }

  const cfg = config as Record<string, unknown>;

  // Validate fallback URL
  if (!cfg.fallbackUrl || typeof cfg.fallbackUrl !== 'string') {
    return { valid: false, error: 'Fallback URL is required' };
  }

  try {
    new URL(cfg.fallbackUrl as string);
  } catch {
    return { valid: false, error: 'Fallback URL is not a valid URL' };
  }

  // Validate fallback URL against SSRF attacks
  const ssrfCheck = validateUrlForSSRF(cfg.fallbackUrl as string);
  if (!ssrfCheck.safe) {
    return { valid: false, error: `Fallback URL is not safe: ${ssrfCheck.reason}` };
  }

  // Validate iOS config if present
  if (cfg.ios && typeof cfg.ios === 'object') {
    const ios = cfg.ios as Record<string, unknown>;
    if (ios.appStoreUrl) {
      try {
        const url = new URL(ios.appStoreUrl as string);
        if (!url.hostname.includes('apple.com')) {
          return { valid: false, error: 'iOS App Store URL must be an Apple URL' };
        }
      } catch {
        return { valid: false, error: 'iOS App Store URL is not valid' };
      }
    }
  }

  // Validate Android config if present
  if (cfg.android && typeof cfg.android === 'object') {
    const android = cfg.android as Record<string, unknown>;
    if (android.playStoreUrl) {
      try {
        const url = new URL(android.playStoreUrl as string);
        if (!url.hostname.includes('play.google.com')) {
          return { valid: false, error: 'Android Play Store URL must be a Google Play URL' };
        }
      } catch {
        return { valid: false, error: 'Android Play Store URL is not valid' };
      }
    }
  }

  // Validate wait time if present
  if (cfg.waitTime !== undefined) {
    if (typeof cfg.waitTime !== 'number' || cfg.waitTime < 0 || cfg.waitTime > 10000) {
      return { valid: false, error: 'Wait time must be between 0 and 10000 milliseconds' };
    }
  }

  return { valid: true };
}

/**
 * Generate iOS deep link page HTML
 */
export function generateIOSDeepLinkPage(options: DeepLinkPageOptions): string {
  const { config, path = '', title = 'Redirecting...' } = options;
  const ios = config.ios || {};
  const waitTime = config.waitTime || 2500;

  const scheme = escapeHtml(ios.scheme || '');
  const appStoreUrl = escapeHtml(ios.appStoreUrl || '');
  const fallbackUrl = escapeHtml(config.fallbackUrl);
  const escapedPath = escapeHtml(path);
  const escapedTitle = escapeHtml(title);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow">
  <title>${escapedTitle}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      text-align: center;
      padding: 20px;
    }
    .container { max-width: 400px; }
    .spinner {
      width: 50px;
      height: 50px;
      border: 3px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 20px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    h1 { font-size: 24px; margin-bottom: 10px; }
    p { opacity: 0.9; margin-bottom: 20px; }
    .fallback-link {
      color: white;
      text-decoration: underline;
      opacity: 0.8;
    }
    .fallback-link:hover { opacity: 1; }
  </style>
</head>
<body>
  <div class="container">
    <div class="spinner"></div>
    <h1>Opening App...</h1>
    <p>If the app doesn't open, you'll be redirected automatically.</p>
    <a href="${fallbackUrl}" class="fallback-link">Continue to website</a>
  </div>
  <script>
    (function() {
      var scheme = '${scheme}';
      var path = '${escapedPath}';
      var appStoreUrl = '${appStoreUrl}';
      var fallbackUrl = '${fallbackUrl}';
      var waitTime = ${waitTime};
      var startTime = Date.now();
      var appOpened = false;

      // Listen for visibility change (app opened)
      document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
          appOpened = true;
        }
      });

      // Try to open the app via scheme
      if (scheme) {
        window.location.href = scheme + path;
      }

      // Fallback after wait time
      setTimeout(function() {
        if (!appOpened && !document.hidden) {
          // App didn't open, redirect to store or fallback
          window.location.href = appStoreUrl || fallbackUrl;
        }
      }, waitTime);
    })();
  </script>
</body>
</html>`;
}

/**
 * Generate Android deep link page HTML
 */
export function generateAndroidDeepLinkPage(options: DeepLinkPageOptions): string {
  const { config, path = '', title = 'Redirecting...' } = options;
  const android = config.android || {};
  const waitTime = config.waitTime || 2500;

  const scheme = escapeHtml(android.scheme || '');
  const packageName = escapeHtml(android.package || '');
  const playStoreUrl = escapeHtml(android.playStoreUrl || '');
  const fallbackUrl = escapeHtml(config.fallbackUrl);
  const escapedPath = escapeHtml(path);
  const escapedTitle = escapeHtml(title);

  // Build intent URL for Android
  const intentUrl = packageName
    ? `intent://${escapedPath}#Intent;scheme=${scheme.replace('://', '')};package=${packageName};end`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow">
  <title>${escapedTitle}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      text-align: center;
      padding: 20px;
    }
    .container { max-width: 400px; }
    .spinner {
      width: 50px;
      height: 50px;
      border: 3px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 20px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    h1 { font-size: 24px; margin-bottom: 10px; }
    p { opacity: 0.9; margin-bottom: 20px; }
    .fallback-link {
      color: white;
      text-decoration: underline;
      opacity: 0.8;
    }
    .fallback-link:hover { opacity: 1; }
  </style>
</head>
<body>
  <div class="container">
    <div class="spinner"></div>
    <h1>Opening App...</h1>
    <p>If the app doesn't open, you'll be redirected automatically.</p>
    <a href="${fallbackUrl}" class="fallback-link">Continue to website</a>
  </div>
  <script>
    (function() {
      var intentUrl = '${intentUrl}';
      var scheme = '${scheme}';
      var path = '${escapedPath}';
      var playStoreUrl = '${playStoreUrl}';
      var fallbackUrl = '${fallbackUrl}';
      var waitTime = ${waitTime};
      var appOpened = false;

      // Listen for visibility change (app opened)
      document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
          appOpened = true;
        }
      });

      // Try intent URL first (handles fallback to Play Store)
      if (intentUrl) {
        window.location.href = intentUrl;
      } else if (scheme) {
        window.location.href = scheme + path;
      }

      // Fallback after wait time
      setTimeout(function() {
        if (!appOpened && !document.hidden) {
          window.location.href = playStoreUrl || fallbackUrl;
        }
      }, waitTime);
    })();
  </script>
</body>
</html>`;
}

/**
 * Generate desktop fallback page (simple redirect)
 */
export function generateDesktopFallbackPage(options: DeepLinkPageOptions): string {
  const { config, title = 'Redirecting...' } = options;
  const fallbackUrl = escapeHtml(config.fallbackUrl);
  const escapedTitle = escapeHtml(title);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow">
  <meta http-equiv="refresh" content="0;url=${fallbackUrl}">
  <title>${escapedTitle}</title>
</head>
<body>
  <p>Redirecting... <a href="${fallbackUrl}">Click here if not redirected</a></p>
  <script>window.location.href = '${fallbackUrl}';</script>
</body>
</html>`;
}

/**
 * Get content type for deep link pages
 */
export function getDeepLinkContentType(): string {
  return 'text/html; charset=utf-8';
}
