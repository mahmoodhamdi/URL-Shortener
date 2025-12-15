import { describe, it, expect } from 'vitest';
import {
  isPrivateIP,
  isBlockedHostname,
  validateUrlForSSRF,
  validateWebhookUrl,
} from '@/lib/security/ssrf';

describe('SSRF Protection', () => {
  describe('isPrivateIP', () => {
    describe('IPv4 private ranges', () => {
      it('should detect loopback addresses (127.x.x.x)', () => {
        expect(isPrivateIP('127.0.0.1')).toBe(true);
        expect(isPrivateIP('127.255.255.255')).toBe(true);
        expect(isPrivateIP('127.0.0.0')).toBe(true);
      });

      it('should detect Class A private (10.x.x.x)', () => {
        expect(isPrivateIP('10.0.0.1')).toBe(true);
        expect(isPrivateIP('10.255.255.255')).toBe(true);
        expect(isPrivateIP('10.10.10.10')).toBe(true);
      });

      it('should detect Class B private (172.16.x.x - 172.31.x.x)', () => {
        expect(isPrivateIP('172.16.0.1')).toBe(true);
        expect(isPrivateIP('172.31.255.255')).toBe(true);
        expect(isPrivateIP('172.20.10.5')).toBe(true);
        // Outside range
        expect(isPrivateIP('172.15.0.1')).toBe(false);
        expect(isPrivateIP('172.32.0.1')).toBe(false);
      });

      it('should detect Class C private (192.168.x.x)', () => {
        expect(isPrivateIP('192.168.0.1')).toBe(true);
        expect(isPrivateIP('192.168.255.255')).toBe(true);
        expect(isPrivateIP('192.168.1.1')).toBe(true);
      });

      it('should detect link-local addresses (169.254.x.x)', () => {
        expect(isPrivateIP('169.254.0.1')).toBe(true);
        expect(isPrivateIP('169.254.169.254')).toBe(true);
      });

      it('should detect "this" network (0.x.x.x)', () => {
        expect(isPrivateIP('0.0.0.0')).toBe(true);
        expect(isPrivateIP('0.0.0.1')).toBe(true);
      });

      it('should detect carrier-grade NAT (100.64.x.x - 100.127.x.x)', () => {
        expect(isPrivateIP('100.64.0.1')).toBe(true);
        expect(isPrivateIP('100.127.255.255')).toBe(true);
        expect(isPrivateIP('100.100.100.100')).toBe(true);
      });

      it('should detect multicast addresses (224.x.x.x)', () => {
        expect(isPrivateIP('224.0.0.1')).toBe(true);
        expect(isPrivateIP('224.255.255.255')).toBe(true);
      });

      it('should detect reserved addresses (240.x.x.x)', () => {
        expect(isPrivateIP('240.0.0.1')).toBe(true);
      });

      it('should detect broadcast address', () => {
        expect(isPrivateIP('255.255.255.255')).toBe(true);
      });

      it('should detect documentation ranges', () => {
        expect(isPrivateIP('192.0.2.1')).toBe(true);    // TEST-NET-1
        expect(isPrivateIP('198.51.100.1')).toBe(true); // TEST-NET-2
        expect(isPrivateIP('203.0.113.1')).toBe(true);  // TEST-NET-3
      });

      it('should allow public IP addresses', () => {
        expect(isPrivateIP('8.8.8.8')).toBe(false);     // Google DNS
        expect(isPrivateIP('1.1.1.1')).toBe(false);     // Cloudflare DNS
        expect(isPrivateIP('208.67.222.222')).toBe(false); // OpenDNS
        expect(isPrivateIP('151.101.1.140')).toBe(false);  // Random public IP
      });
    });

    describe('IPv6 addresses', () => {
      it('should detect IPv6 unique local addresses (fc00::/7)', () => {
        expect(isPrivateIP('fc00::1')).toBe(true);
        expect(isPrivateIP('fd12:3456:789a::1')).toBe(true);
      });

      it('should detect IPv6 link-local addresses (fe80::/10)', () => {
        expect(isPrivateIP('fe80::1')).toBe(true);
        expect(isPrivateIP('fe80::1:2:3:4')).toBe(true);
      });

      it('should handle IPv6-mapped IPv4 addresses', () => {
        expect(isPrivateIP('::ffff:127.0.0.1')).toBe(true);
        expect(isPrivateIP('::ffff:192.168.1.1')).toBe(true);
        expect(isPrivateIP('::ffff:8.8.8.8')).toBe(false);
      });
    });
  });

  describe('isBlockedHostname', () => {
    it('should block localhost variants', () => {
      expect(isBlockedHostname('localhost')).toBe(true);
      expect(isBlockedHostname('LOCALHOST')).toBe(true);
      expect(isBlockedHostname('localhost.localdomain')).toBe(true);
      expect(isBlockedHostname('127.0.0.1')).toBe(true);
      expect(isBlockedHostname('0.0.0.0')).toBe(true);
    });

    it('should block IPv6 localhost', () => {
      expect(isBlockedHostname('::1')).toBe(true);
      expect(isBlockedHostname('[::1]')).toBe(true);
    });

    it('should block cloud metadata endpoints', () => {
      expect(isBlockedHostname('169.254.169.254')).toBe(true);
      expect(isBlockedHostname('metadata.google.internal')).toBe(true);
      expect(isBlockedHostname('metadata.goog')).toBe(true);
    });

    it('should block internal hostnames', () => {
      expect(isBlockedHostname('internal')).toBe(true);
      expect(isBlockedHostname('intranet')).toBe(true);
      expect(isBlockedHostname('corp')).toBe(true);
      expect(isBlockedHostname('local')).toBe(true);
    });

    it('should block internal TLDs', () => {
      expect(isBlockedHostname('myapp.local')).toBe(true);
      expect(isBlockedHostname('server.localhost')).toBe(true);
      expect(isBlockedHostname('api.internal')).toBe(true);
      expect(isBlockedHostname('app.corp')).toBe(true);
      expect(isBlockedHostname('test.home')).toBe(true);
      expect(isBlockedHostname('device.lan')).toBe(true);
    });

    it('should block internal subdomain patterns', () => {
      expect(isBlockedHostname('api.internal.company.com')).toBe(true);
      expect(isBlockedHostname('test.local.domain.com')).toBe(true);
      expect(isBlockedHostname('service.corp.example.com')).toBe(true);
      expect(isBlockedHostname('db.intranet.acme.com')).toBe(true);
    });

    it('should allow public hostnames', () => {
      expect(isBlockedHostname('google.com')).toBe(false);
      expect(isBlockedHostname('api.example.com')).toBe(false);
      expect(isBlockedHostname('webhook.stripe.com')).toBe(false);
      expect(isBlockedHostname('hooks.slack.com')).toBe(false);
    });

    it('should detect private IP addresses as hostnames', () => {
      expect(isBlockedHostname('192.168.1.1')).toBe(true);
      expect(isBlockedHostname('10.0.0.1')).toBe(true);
      expect(isBlockedHostname('172.16.0.1')).toBe(true);
    });
  });

  describe('validateUrlForSSRF', () => {
    describe('protocol validation', () => {
      it('should allow HTTP URLs', () => {
        const result = validateUrlForSSRF('http://example.com');
        expect(result.safe).toBe(true);
      });

      it('should allow HTTPS URLs', () => {
        const result = validateUrlForSSRF('https://example.com');
        expect(result.safe).toBe(true);
      });

      it('should block file:// protocol', () => {
        const result = validateUrlForSSRF('file:///etc/passwd');
        expect(result.safe).toBe(false);
        expect(result.reason).toContain('Protocol');
      });

      it('should block ftp:// protocol', () => {
        const result = validateUrlForSSRF('ftp://example.com/file.txt');
        expect(result.safe).toBe(false);
        expect(result.reason).toContain('Protocol');
      });

      it('should block javascript: protocol', () => {
        const result = validateUrlForSSRF('javascript:alert(1)');
        expect(result.safe).toBe(false);
      });

      it('should block data: protocol', () => {
        const result = validateUrlForSSRF('data:text/html,<script>alert(1)</script>');
        expect(result.safe).toBe(false);
      });
    });

    describe('hostname validation', () => {
      it('should block localhost', () => {
        const result = validateUrlForSSRF('http://localhost/api');
        expect(result.safe).toBe(false);
        expect(result.reason).toContain('blocked');
      });

      it('should block 127.0.0.1', () => {
        const result = validateUrlForSSRF('http://127.0.0.1:8080/api');
        expect(result.safe).toBe(false);
      });

      it('should block private IP addresses', () => {
        expect(validateUrlForSSRF('http://192.168.1.1/admin').safe).toBe(false);
        expect(validateUrlForSSRF('http://10.0.0.1/api').safe).toBe(false);
        expect(validateUrlForSSRF('http://172.16.0.1/webhook').safe).toBe(false);
      });

      it('should block AWS metadata endpoint', () => {
        const result = validateUrlForSSRF('http://169.254.169.254/latest/meta-data/');
        expect(result.safe).toBe(false);
      });

      it('should allow public URLs', () => {
        expect(validateUrlForSSRF('https://api.stripe.com/webhook').safe).toBe(true);
        expect(validateUrlForSSRF('https://hooks.slack.com/services/xxx').safe).toBe(true);
        expect(validateUrlForSSRF('https://api.github.com/webhooks').safe).toBe(true);
      });
    });

    describe('IP obfuscation detection', () => {
      it('should block decimal IP notation', () => {
        // 2130706433 = 127.0.0.1 in decimal
        const result = validateUrlForSSRF('http://2130706433/');
        expect(result.safe).toBe(false);
        // May be blocked as hostname or numeric - either is acceptable
        expect(result.reason).toBeDefined();
      });

      it('should block hexadecimal IP notation', () => {
        const result = validateUrlForSSRF('http://0x7f000001/');
        expect(result.safe).toBe(false);
        // May be blocked as hostname or hexadecimal - either is acceptable
        expect(result.reason).toBeDefined();
      });

      it('should block octal IP notation', () => {
        const result = validateUrlForSSRF('http://0177.0.0.1/');
        expect(result.safe).toBe(false);
        // May be blocked as hostname or octal - either is acceptable
        expect(result.reason).toBeDefined();
      });
    });

    describe('port validation', () => {
      it('should allow standard ports', () => {
        expect(validateUrlForSSRF('http://example.com:80/').safe).toBe(true);
        expect(validateUrlForSSRF('https://example.com:443/').safe).toBe(true);
        expect(validateUrlForSSRF('http://example.com:8080/').safe).toBe(true);
        expect(validateUrlForSSRF('https://example.com:8443/').safe).toBe(true);
      });

      it('should block non-standard ports', () => {
        const result = validateUrlForSSRF('http://example.com:22/');
        expect(result.safe).toBe(false);
        expect(result.reason).toContain('Port');
      });

      it('should block internal service ports', () => {
        expect(validateUrlForSSRF('http://example.com:6379/').safe).toBe(false); // Redis
        expect(validateUrlForSSRF('http://example.com:27017/').safe).toBe(false); // MongoDB
        expect(validateUrlForSSRF('http://example.com:5432/').safe).toBe(false); // PostgreSQL
        expect(validateUrlForSSRF('http://example.com:3306/').safe).toBe(false); // MySQL
      });
    });

    describe('credentials validation', () => {
      it('should block URLs with username', () => {
        const result = validateUrlForSSRF('http://admin@example.com/');
        expect(result.safe).toBe(false);
        expect(result.reason).toContain('credentials');
      });

      it('should block URLs with username and password', () => {
        const result = validateUrlForSSRF('http://admin:password@example.com/');
        expect(result.safe).toBe(false);
        expect(result.reason).toContain('credentials');
      });
    });

    describe('invalid URL handling', () => {
      it('should reject invalid URLs', () => {
        const result = validateUrlForSSRF('not-a-valid-url');
        expect(result.safe).toBe(false);
        expect(result.reason).toContain('Invalid');
      });

      it('should reject empty URLs', () => {
        const result = validateUrlForSSRF('');
        expect(result.safe).toBe(false);
      });
    });
  });

  describe('validateWebhookUrl', () => {
    it('should inherit SSRF validation rules', () => {
      expect(validateWebhookUrl('http://localhost/webhook').safe).toBe(false);
      expect(validateWebhookUrl('http://127.0.0.1/webhook').safe).toBe(false);
      expect(validateWebhookUrl('http://192.168.1.1/webhook').safe).toBe(false);
    });

    it('should allow valid webhook URLs', () => {
      expect(validateWebhookUrl('https://api.example.com/webhook').safe).toBe(true);
      expect(validateWebhookUrl('https://hooks.zapier.com/abc123').safe).toBe(true);
      expect(validateWebhookUrl('http://webhook.site/abc123').safe).toBe(true);
    });

    it('should block internal paths', () => {
      expect(validateWebhookUrl('https://example.com/admin').safe).toBe(false);
      expect(validateWebhookUrl('https://example.com/internal/webhook').safe).toBe(false);
      expect(validateWebhookUrl('https://example.com/api/internal/hook').safe).toBe(false);
      expect(validateWebhookUrl('https://example.com/metadata').safe).toBe(false);
      expect(validateWebhookUrl('https://example.com/status').safe).toBe(false);
      expect(validateWebhookUrl('https://example.com/health').safe).toBe(false);
    });

    it('should block ACME challenge paths', () => {
      const result = validateWebhookUrl('https://example.com/.well-known/acme-challenge/token');
      expect(result.safe).toBe(false);
    });

    it('should allow legitimate webhook paths', () => {
      expect(validateWebhookUrl('https://example.com/api/webhook').safe).toBe(true);
      expect(validateWebhookUrl('https://example.com/webhook/receive').safe).toBe(true);
      expect(validateWebhookUrl('https://example.com/hooks/events').safe).toBe(true);
    });
  });
});
