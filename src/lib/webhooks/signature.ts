/**
 * Webhook Signature Generation and Verification
 * Uses HMAC-SHA256 for secure webhook authentication
 */

import crypto from 'crypto';
import { nanoid } from 'nanoid';

/**
 * Generate a secure webhook secret
 */
export function generateWebhookSecret(): string {
  return nanoid(32);
}

/**
 * Generate HMAC-SHA256 signature for webhook payload
 */
export function generateSignature(
  secret: string,
  timestamp: string,
  payload: string
): string {
  const data = `${timestamp}.${payload}`;
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(data);
  return `sha256=${hmac.digest('hex')}`;
}

/**
 * Verify webhook signature
 */
export function verifySignature(
  secret: string,
  timestamp: string,
  payload: string,
  signature: string
): boolean {
  const expectedSignature = generateSignature(secret, timestamp, payload);

  // Use constant-time comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
}

/**
 * Parse signature header
 * Format: "sha256=<hex_digest>"
 */
export function parseSignatureHeader(header: string): { algorithm: string; signature: string } | null {
  const match = header.match(/^(sha256)=([a-f0-9]+)$/i);
  if (!match) return null;

  return {
    algorithm: match[1].toLowerCase(),
    signature: match[0],
  };
}

/**
 * Get current timestamp for signature
 */
export function getTimestamp(): string {
  return Math.floor(Date.now() / 1000).toString();
}

/**
 * Check if timestamp is within tolerance (5 minutes)
 */
export function isTimestampValid(timestamp: string, toleranceSeconds: number = 300): boolean {
  const timestampNum = parseInt(timestamp, 10);
  if (isNaN(timestampNum)) return false;

  const now = Math.floor(Date.now() / 1000);
  const diff = Math.abs(now - timestampNum);

  return diff <= toleranceSeconds;
}
