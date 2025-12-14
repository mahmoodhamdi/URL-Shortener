import { describe, it, expect } from 'vitest';
import {
  generateWebhookSecret,
  generateSignature,
  verifySignature,
  parseSignatureHeader,
  getTimestamp,
  isTimestampValid,
} from '@/lib/webhooks/signature';

describe('Webhook Signature', () => {
  describe('generateWebhookSecret', () => {
    it('should generate a 32-character secret', () => {
      const secret = generateWebhookSecret();
      expect(secret).toHaveLength(32);
    });

    it('should generate unique secrets', () => {
      const secret1 = generateWebhookSecret();
      const secret2 = generateWebhookSecret();
      expect(secret1).not.toBe(secret2);
    });
  });

  describe('generateSignature', () => {
    it('should generate a sha256 signature', () => {
      const secret = 'test-secret';
      const timestamp = '1234567890';
      const payload = '{"test": "data"}';

      const signature = generateSignature(secret, timestamp, payload);

      expect(signature).toMatch(/^sha256=[a-f0-9]{64}$/);
    });

    it('should generate consistent signatures for same input', () => {
      const secret = 'test-secret';
      const timestamp = '1234567890';
      const payload = '{"test": "data"}';

      const sig1 = generateSignature(secret, timestamp, payload);
      const sig2 = generateSignature(secret, timestamp, payload);

      expect(sig1).toBe(sig2);
    });

    it('should generate different signatures for different secrets', () => {
      const timestamp = '1234567890';
      const payload = '{"test": "data"}';

      const sig1 = generateSignature('secret1', timestamp, payload);
      const sig2 = generateSignature('secret2', timestamp, payload);

      expect(sig1).not.toBe(sig2);
    });

    it('should generate different signatures for different timestamps', () => {
      const secret = 'test-secret';
      const payload = '{"test": "data"}';

      const sig1 = generateSignature(secret, '1234567890', payload);
      const sig2 = generateSignature(secret, '1234567891', payload);

      expect(sig1).not.toBe(sig2);
    });

    it('should generate different signatures for different payloads', () => {
      const secret = 'test-secret';
      const timestamp = '1234567890';

      const sig1 = generateSignature(secret, timestamp, '{"a": 1}');
      const sig2 = generateSignature(secret, timestamp, '{"a": 2}');

      expect(sig1).not.toBe(sig2);
    });
  });

  describe('verifySignature', () => {
    it('should return true for valid signature', () => {
      const secret = 'test-secret';
      const timestamp = '1234567890';
      const payload = '{"test": "data"}';
      const signature = generateSignature(secret, timestamp, payload);

      const result = verifySignature(secret, timestamp, payload, signature);

      expect(result).toBe(true);
    });

    it('should return false for invalid signature', () => {
      const secret = 'test-secret';
      const timestamp = '1234567890';
      const payload = '{"test": "data"}';

      const result = verifySignature(secret, timestamp, payload, 'sha256=invalid');

      expect(result).toBe(false);
    });

    it('should return false for wrong secret', () => {
      const timestamp = '1234567890';
      const payload = '{"test": "data"}';
      const signature = generateSignature('secret1', timestamp, payload);

      const result = verifySignature('secret2', timestamp, payload, signature);

      expect(result).toBe(false);
    });

    it('should return false for modified payload', () => {
      const secret = 'test-secret';
      const timestamp = '1234567890';
      const signature = generateSignature(secret, timestamp, '{"test": "data"}');

      const result = verifySignature(secret, timestamp, '{"test": "modified"}', signature);

      expect(result).toBe(false);
    });
  });

  describe('parseSignatureHeader', () => {
    it('should parse valid signature header', () => {
      const header = 'sha256=abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
      const result = parseSignatureHeader(header);

      expect(result).toEqual({
        algorithm: 'sha256',
        signature: header,
      });
    });

    it('should handle case-insensitive algorithm', () => {
      const header = 'SHA256=abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
      const result = parseSignatureHeader(header);

      expect(result?.algorithm).toBe('sha256');
    });

    it('should return null for invalid format', () => {
      expect(parseSignatureHeader('invalid')).toBeNull();
      expect(parseSignatureHeader('md5=abc')).toBeNull();
      expect(parseSignatureHeader('sha256=')).toBeNull();
      expect(parseSignatureHeader('')).toBeNull();
    });
  });

  describe('getTimestamp', () => {
    it('should return a numeric string', () => {
      const timestamp = getTimestamp();
      expect(timestamp).toMatch(/^\d+$/);
    });

    it('should return reasonable timestamp', () => {
      const timestamp = parseInt(getTimestamp(), 10);
      const now = Math.floor(Date.now() / 1000);

      // Should be within 1 second
      expect(Math.abs(timestamp - now)).toBeLessThanOrEqual(1);
    });
  });

  describe('isTimestampValid', () => {
    it('should return true for current timestamp', () => {
      const timestamp = getTimestamp();
      expect(isTimestampValid(timestamp)).toBe(true);
    });

    it('should return true for timestamp within tolerance', () => {
      const now = Math.floor(Date.now() / 1000);
      const pastTimestamp = (now - 60).toString(); // 1 minute ago

      expect(isTimestampValid(pastTimestamp)).toBe(true);
    });

    it('should return false for timestamp outside tolerance', () => {
      const now = Math.floor(Date.now() / 1000);
      const oldTimestamp = (now - 600).toString(); // 10 minutes ago

      expect(isTimestampValid(oldTimestamp)).toBe(false);
    });

    it('should return false for invalid timestamp', () => {
      expect(isTimestampValid('invalid')).toBe(false);
      expect(isTimestampValid('')).toBe(false);
    });

    it('should respect custom tolerance', () => {
      const now = Math.floor(Date.now() / 1000);
      const timestamp = (now - 100).toString();

      expect(isTimestampValid(timestamp, 60)).toBe(false);
      expect(isTimestampValid(timestamp, 120)).toBe(true);
    });
  });
});
