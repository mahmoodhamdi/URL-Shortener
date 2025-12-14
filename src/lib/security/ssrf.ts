/**
 * SSRF (Server-Side Request Forgery) protection utilities
 */

// Private IP ranges (RFC 1918, RFC 4193, RFC 5737, etc.)
const PRIVATE_IP_PATTERNS = [
  // IPv4 private ranges
  /^127\./,                           // Loopback (127.0.0.0/8)
  /^10\./,                            // Class A private (10.0.0.0/8)
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,   // Class B private (172.16.0.0/12)
  /^192\.168\./,                       // Class C private (192.168.0.0/16)
  /^169\.254\./,                       // Link-local (169.254.0.0/16)
  /^0\./,                              // "This" network (0.0.0.0/8)
  /^100\.(6[4-9]|[7-9][0-9]|1[0-1][0-9]|12[0-7])\./, // Carrier-grade NAT (100.64.0.0/10)
  /^192\.0\.0\./,                      // IETF Protocol Assignments (192.0.0.0/24)
  /^192\.0\.2\./,                      // Documentation (TEST-NET-1) (192.0.2.0/24)
  /^198\.51\.100\./,                   // Documentation (TEST-NET-2) (198.51.100.0/24)
  /^203\.0\.113\./,                    // Documentation (TEST-NET-3) (203.0.113.0/24)
  /^198\.18\./,                        // Benchmarking (198.18.0.0/15)
  /^224\./,                            // Multicast (224.0.0.0/4)
  /^240\./,                            // Reserved (240.0.0.0/4)
  /^255\.255\.255\.255$/,              // Broadcast
];

// Blocked hostnames
const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'localhost.localdomain',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  '::',
  '[::1]',
  '[::ffff:127.0.0.1]',
  // AWS metadata
  '169.254.169.254',
  'metadata.google.internal',
  'metadata.goog',
  // Azure metadata
  '169.254.169.254',
  // Common internal hostnames
  'internal',
  'intranet',
  'corp',
  'local',
]);

// Blocked TLDs for internal use
const BLOCKED_TLDS = new Set([
  'local',
  'localhost',
  'internal',
  'corp',
  'home',
  'lan',
  'localdomain',
]);

export interface SSRFValidationResult {
  safe: boolean;
  reason?: string;
}

/**
 * Check if an IP address is private/internal
 */
export function isPrivateIP(ip: string): boolean {
  // Handle IPv6-mapped IPv4 addresses
  const ipv4Match = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  const normalizedIp = ipv4Match ? ipv4Match[1] : ip;

  // Check against private IP patterns
  for (const pattern of PRIVATE_IP_PATTERNS) {
    if (pattern.test(normalizedIp)) {
      return true;
    }
  }

  // Check IPv6 private ranges
  if (ip.startsWith('fc') || ip.startsWith('fd')) {
    return true; // Unique local addresses (fc00::/7)
  }
  if (ip.startsWith('fe80')) {
    return true; // Link-local (fe80::/10)
  }

  return false;
}

/**
 * Check if a hostname is blocked
 */
export function isBlockedHostname(hostname: string): boolean {
  const normalizedHostname = hostname.toLowerCase().trim();

  // Direct hostname check
  if (BLOCKED_HOSTNAMES.has(normalizedHostname)) {
    return true;
  }

  // Check TLD
  const parts = normalizedHostname.split('.');
  const tld = parts[parts.length - 1];
  if (BLOCKED_TLDS.has(tld)) {
    return true;
  }

  // Check if it's an IP address
  if (/^\d+\.\d+\.\d+\.\d+$/.test(normalizedHostname)) {
    if (isPrivateIP(normalizedHostname)) {
      return true;
    }
  }

  // Check for internal subdomain patterns
  if (normalizedHostname.includes('.internal.') ||
      normalizedHostname.includes('.local.') ||
      normalizedHostname.includes('.corp.') ||
      normalizedHostname.includes('.intranet.')) {
    return true;
  }

  return false;
}

/**
 * Validate a URL for SSRF vulnerabilities
 */
export function validateUrlForSSRF(urlString: string): SSRFValidationResult {
  try {
    const url = new URL(urlString);

    // Check protocol (only allow http/https)
    if (!['http:', 'https:'].includes(url.protocol)) {
      return {
        safe: false,
        reason: `Protocol "${url.protocol.replace(':', '')}" is not allowed. Only HTTP and HTTPS are permitted.`,
      };
    }

    // Check hostname
    const hostname = url.hostname.toLowerCase();

    if (isBlockedHostname(hostname)) {
      return {
        safe: false,
        reason: 'URL points to a blocked or internal hostname.',
      };
    }

    // Check for URL obfuscation techniques
    // Decimal IP notation (e.g., http://2130706433 = 127.0.0.1)
    if (/^\d+$/.test(hostname)) {
      return {
        safe: false,
        reason: 'Numeric IP addresses are not allowed.',
      };
    }

    // Hex IP notation
    if (/^0x[0-9a-f]+$/i.test(hostname)) {
      return {
        safe: false,
        reason: 'Hexadecimal IP addresses are not allowed.',
      };
    }

    // Octal IP notation (e.g., http://0177.0.0.1)
    if (/^0\d+\./.test(hostname)) {
      return {
        safe: false,
        reason: 'Octal IP addresses are not allowed.',
      };
    }

    // Check port - only allow standard ports
    const port = url.port || (url.protocol === 'https:' ? '443' : '80');
    const allowedPorts = ['80', '443', '8080', '8443'];
    if (!allowedPorts.includes(port)) {
      return {
        safe: false,
        reason: `Port ${port} is not allowed. Allowed ports: ${allowedPorts.join(', ')}.`,
      };
    }

    // Check for URL with credentials
    if (url.username || url.password) {
      return {
        safe: false,
        reason: 'URLs with credentials are not allowed.',
      };
    }

    return { safe: true };
  } catch {
    return {
      safe: false,
      reason: 'Invalid URL format.',
    };
  }
}

/**
 * Sanitize and validate a webhook URL
 */
export function validateWebhookUrl(urlString: string): SSRFValidationResult {
  const ssrfResult = validateUrlForSSRF(urlString);
  if (!ssrfResult.safe) {
    return ssrfResult;
  }

  try {
    const url = new URL(urlString);

    // Additional webhook-specific checks
    // Require HTTPS in production
    if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') {
      return {
        safe: false,
        reason: 'Webhook URLs must use HTTPS in production.',
      };
    }

    // Block certain paths that might indicate internal services
    const blockedPaths = [
      '/admin',
      '/internal',
      '/api/internal',
      '/metadata',
      '/status',
      '/health',
      '/.well-known/acme-challenge',
    ];

    const normalizedPath = url.pathname.toLowerCase();
    for (const blockedPath of blockedPaths) {
      if (normalizedPath.startsWith(blockedPath)) {
        return {
          safe: false,
          reason: `Webhook URL path "${blockedPath}" is not allowed.`,
        };
      }
    }

    return { safe: true };
  } catch {
    return {
      safe: false,
      reason: 'Invalid URL format.',
    };
  }
}
