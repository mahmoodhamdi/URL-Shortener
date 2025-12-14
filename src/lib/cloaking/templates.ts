/**
 * Link Cloaking - HTML Templates
 * Templates for different cloaking methods
 */

import type { CloakingType } from '@prisma/client';

interface CloakedPageOptions {
  destinationUrl: string;
  title?: string | null;
  favicon?: string | null;
}

/**
 * Escape HTML special characters to prevent XSS
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  return text.replace(/[&<>"'/]/g, (char) => map[char]);
}

/**
 * Generate iFrame cloaked page HTML
 * Loads destination in an iFrame, keeping the short URL in the address bar
 */
export function generateIframePage(options: CloakedPageOptions): string {
  const title = escapeHtml(options.title || 'Redirecting...');
  const favicon = options.favicon ? escapeHtml(options.favicon) : '/favicon.ico';
  const url = escapeHtml(options.destinationUrl);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow">
  <title>${title}</title>
  <link rel="icon" href="${favicon}">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; }
    iframe { border: none; width: 100%; height: 100%; display: block; }
    .fallback {
      display: none;
      text-align: center;
      padding: 50px;
      font-family: system-ui, -apple-system, sans-serif;
    }
    .fallback a { color: #0066cc; text-decoration: underline; }
  </style>
</head>
<body>
  <iframe id="frame" src="${url}" allowfullscreen loading="eager"></iframe>
  <div class="fallback" id="fallback">
    <h1>Unable to load content</h1>
    <p>The destination site may not allow embedding.</p>
    <p><a href="${url}" rel="noopener">Click here to continue</a></p>
  </div>
  <script>
    (function() {
      var frame = document.getElementById('frame');
      var fallback = document.getElementById('fallback');
      var timeout = setTimeout(function() {
        // If page hasn't loaded in 10 seconds, show fallback
        fallback.style.display = 'block';
        frame.style.display = 'none';
      }, 10000);

      frame.onload = function() {
        clearTimeout(timeout);
        // Try to detect if frame loaded successfully
        try {
          var doc = frame.contentDocument || frame.contentWindow.document;
          if (!doc || doc.body.innerHTML === '') {
            throw new Error('Empty frame');
          }
        } catch (e) {
          // Cross-origin or blocked, show fallback
          fallback.style.display = 'block';
          frame.style.display = 'none';
        }
      };

      frame.onerror = function() {
        clearTimeout(timeout);
        fallback.style.display = 'block';
        frame.style.display = 'none';
      };
    })();
  </script>
</body>
</html>`;
}

/**
 * Generate JavaScript redirect page HTML
 * Uses JavaScript to redirect after a short delay
 */
export function generateJavaScriptPage(options: CloakedPageOptions): string {
  const title = escapeHtml(options.title || 'Redirecting...');
  const favicon = options.favicon ? escapeHtml(options.favicon) : '/favicon.ico';
  const url = escapeHtml(options.destinationUrl);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow">
  <title>${title}</title>
  <link rel="icon" href="${favicon}">
  <style>
    body {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
      font-family: system-ui, -apple-system, sans-serif;
      background: #f5f5f5;
    }
    .loader {
      text-align: center;
    }
    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid #e0e0e0;
      border-top-color: #0066cc;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 20px;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    a { color: #0066cc; }
  </style>
</head>
<body>
  <div class="loader">
    <div class="spinner"></div>
    <p>Redirecting...</p>
    <noscript>
      <p><a href="${url}">Click here if not redirected</a></p>
    </noscript>
  </div>
  <script>
    setTimeout(function() {
      window.location.replace('${url}');
    }, 100);
  </script>
  <noscript>
    <meta http-equiv="refresh" content="0;url=${url}">
  </noscript>
</body>
</html>`;
}

/**
 * Generate meta refresh page HTML
 * Uses meta refresh tag for redirect
 */
export function generateMetaRefreshPage(options: CloakedPageOptions): string {
  const title = escapeHtml(options.title || 'Redirecting...');
  const favicon = options.favicon ? escapeHtml(options.favicon) : '/favicon.ico';
  const url = escapeHtml(options.destinationUrl);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow">
  <meta http-equiv="refresh" content="0;url=${url}">
  <title>${title}</title>
  <link rel="icon" href="${favicon}">
  <style>
    body {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
      font-family: system-ui, -apple-system, sans-serif;
      background: #f5f5f5;
    }
    a { color: #0066cc; }
  </style>
</head>
<body>
  <p>Redirecting... <a href="${url}">Click here if not redirected</a></p>
</body>
</html>`;
}

/**
 * Generate cloaked page based on cloaking type
 */
export function generateCloakedPage(
  type: CloakingType,
  options: CloakedPageOptions
): string {
  switch (type) {
    case 'IFRAME':
      return generateIframePage(options);
    case 'JAVASCRIPT':
      return generateJavaScriptPage(options);
    case 'META_REFRESH':
      return generateMetaRefreshPage(options);
    default:
      return generateJavaScriptPage(options);
  }
}

/**
 * Get content type for cloaked pages
 */
export function getCloakedPageContentType(): string {
  return 'text/html; charset=utf-8';
}

/**
 * Get cloaking type display name
 */
export function getCloakingTypeName(type: CloakingType): string {
  const names: Record<CloakingType, string> = {
    IFRAME: 'iFrame Cloaking',
    JAVASCRIPT: 'JavaScript Redirect',
    META_REFRESH: 'Meta Refresh Redirect',
  };
  return names[type];
}

/**
 * Get cloaking type description
 */
export function getCloakingTypeDescription(type: CloakingType): string {
  const descriptions: Record<CloakingType, string> = {
    IFRAME: 'Loads destination in an iFrame, keeping your short URL in the address bar',
    JAVASCRIPT: 'Uses JavaScript to redirect, hiding destination from simple inspection',
    META_REFRESH: 'Uses HTML meta refresh tag for redirect, most compatible',
  };
  return descriptions[type];
}
