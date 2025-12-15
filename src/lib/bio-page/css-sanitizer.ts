/**
 * CSS Sanitizer for Bio Pages
 *
 * Sanitizes custom CSS to prevent CSS injection attacks.
 * Removes potentially dangerous CSS properties and values.
 */

// Dangerous CSS properties that can execute JavaScript or load external resources
const DANGEROUS_PROPERTIES = [
  'behavior',                    // IE-specific, can execute HTC files
  '-moz-binding',                // Firefox XBL bindings
  '-webkit-binding',             // Webkit binding
  '-o-link',                     // Opera link
  '-o-link-source',              // Opera link source
];

// Dangerous CSS values/functions
const DANGEROUS_VALUE_PATTERNS = [
  /expression\s*\(/gi,           // IE expression() - executes JavaScript
  /javascript\s*:/gi,            // JavaScript URLs
  /vbscript\s*:/gi,              // VBScript URLs
  /-moz-binding\s*:/gi,          // Mozilla XBL bindings
  /behavior\s*:/gi,              // IE behaviors
];
// Note: data: URLs are handled separately in URL sanitization to allow data:image/*

// Dangerous at-rules
const DANGEROUS_AT_RULES = [
  /@import/gi,                   // Can load external stylesheets
  /@charset/gi,                  // Can change character encoding
  /@namespace/gi,                // Namespace declarations
  /@document/gi,                 // Document-specific rules
];

// URL patterns in CSS
const URL_PATTERN = /url\s*\(\s*['"]?\s*([^'")\s]+)\s*['"]?\s*\)/gi;

// Allowed URL schemes for url()
const ALLOWED_URL_SCHEMES = ['https:', 'data:image/'];

export interface CssSanitizeResult {
  sanitized: string;
  warnings: string[];
  removed: string[];
}

/**
 * Sanitize custom CSS to prevent injection attacks
 */
export function sanitizeCss(css: string | null | undefined): CssSanitizeResult {
  if (!css || typeof css !== 'string') {
    return { sanitized: '', warnings: [], removed: [] };
  }

  const warnings: string[] = [];
  const removed: string[] = [];
  let sanitized = css.trim();

  // Limit CSS length (prevent DoS)
  const MAX_CSS_LENGTH = 50000;
  if (sanitized.length > MAX_CSS_LENGTH) {
    sanitized = sanitized.substring(0, MAX_CSS_LENGTH);
    warnings.push(`CSS truncated to ${MAX_CSS_LENGTH} characters`);
  }

  // Remove HTML comments that could be used for injection
  const htmlCommentPattern = /<!--[\s\S]*?-->/g;
  if (htmlCommentPattern.test(sanitized)) {
    sanitized = sanitized.replace(htmlCommentPattern, '');
    removed.push('HTML comments');
  }

  // Remove dangerous at-rules
  for (const pattern of DANGEROUS_AT_RULES) {
    if (pattern.test(sanitized)) {
      const ruleName = pattern.source.replace(/[\\@]/g, '');
      removed.push(`@${ruleName} rules`);
      // Remove the entire at-rule block
      sanitized = sanitized.replace(new RegExp(`${pattern.source}[^;{]*(?:;|{[^}]*})`, 'gi'), '');
    }
  }

  // Remove dangerous properties
  for (const prop of DANGEROUS_PROPERTIES) {
    const propPattern = new RegExp(`${prop}\\s*:[^;]*;?`, 'gi');
    if (propPattern.test(sanitized)) {
      sanitized = sanitized.replace(propPattern, '');
      removed.push(`${prop} property`);
    }
  }

  // Remove dangerous values
  for (const pattern of DANGEROUS_VALUE_PATTERNS) {
    if (pattern.test(sanitized)) {
      // Extract a readable name from the pattern
      const valueName = pattern.source
        .replace(/\\s\*/g, '')
        .replace(/\\s\+/g, '')
        .replace(/\\\(/g, '')
        .replace(/\\/g, '');
      removed.push(`${valueName} values`);
      // Replace with safe value
      sanitized = sanitized.replace(pattern, 'invalid');
    }
  }

  // Sanitize URL values - only allow safe URLs
  sanitized = sanitized.replace(URL_PATTERN, (match, url) => {
    const trimmedUrl = url.trim().toLowerCase();

    // Allow relative URLs (no scheme)
    if (!trimmedUrl.includes(':')) {
      return match;
    }

    // Check if URL starts with allowed schemes
    const isAllowed = ALLOWED_URL_SCHEMES.some(scheme =>
      trimmedUrl.startsWith(scheme)
    );

    if (!isAllowed) {
      removed.push(`url(${url.substring(0, 50)}${url.length > 50 ? '...' : ''})`);
      return 'url(about:blank)';
    }

    // For data: URLs, only allow images
    if (trimmedUrl.startsWith('data:')) {
      if (!trimmedUrl.startsWith('data:image/')) {
        removed.push('non-image data URL');
        return 'url(about:blank)';
      }
    }

    return match;
  });

  // Remove potential script injection via CSS selectors
  // Block selectors that could trigger behaviors on specific elements
  const scriptInjectionPatterns = [
    /on[a-z]+\s*=/gi,            // onclick, onerror, etc.
    /<\s*script/gi,               // Script tags
    /<\s*\/\s*script/gi,          // Closing script tags
    /<\s*style/gi,                // Nested style tags
    /<\s*\/\s*style/gi,           // Closing style tags
    /<\s*link/gi,                 // Link tags
    /<\s*iframe/gi,               // Iframe tags
  ];

  for (const pattern of scriptInjectionPatterns) {
    if (pattern.test(sanitized)) {
      sanitized = sanitized.replace(pattern, 'blocked');
      removed.push('potential script injection');
    }
  }

  // Remove null bytes and other control characters
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Normalize whitespace
  sanitized = sanitized.replace(/\s+/g, ' ').trim();

  if (removed.length > 0) {
    warnings.push(`Removed potentially dangerous content: ${removed.join(', ')}`);
  }

  return { sanitized, warnings, removed };
}

/**
 * Validate CSS - returns true if CSS is safe to use
 */
export function isValidCss(css: string | null | undefined): boolean {
  if (!css) return true;

  const result = sanitizeCss(css);
  return result.removed.length === 0;
}

/**
 * Sanitize CSS and return just the sanitized string
 */
export function sanitizeCssString(css: string | null | undefined): string {
  return sanitizeCss(css).sanitized;
}
