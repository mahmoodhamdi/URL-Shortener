import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  SSL_STATUS_INFO,
  getDomainSetupInstructions,
} from '@/lib/domains/ssl';
import type { SslStatus } from '@/types';

// Mock prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    customDomain: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe('Domain SSL', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('SSL_STATUS_INFO', () => {
    it('should have all SSL status types', () => {
      const statuses: SslStatus[] = ['PENDING', 'PROVISIONING', 'ACTIVE', 'FAILED'];
      statuses.forEach(status => {
        expect(SSL_STATUS_INFO[status]).toBeDefined();
        expect(SSL_STATUS_INFO[status].label).toBeDefined();
        expect(SSL_STATUS_INFO[status].description).toBeDefined();
      });
    });

    it('should have PENDING status info', () => {
      expect(SSL_STATUS_INFO.PENDING.label).toBe('Pending');
      expect(SSL_STATUS_INFO.PENDING.description).toContain('verification');
    });

    it('should have PROVISIONING status info', () => {
      expect(SSL_STATUS_INFO.PROVISIONING.label).toBe('Provisioning');
      expect(SSL_STATUS_INFO.PROVISIONING.description).toContain('provisioned');
    });

    it('should have ACTIVE status info', () => {
      expect(SSL_STATUS_INFO.ACTIVE.label).toBe('Active');
      expect(SSL_STATUS_INFO.ACTIVE.description).toContain('secure');
    });

    it('should have FAILED status info', () => {
      expect(SSL_STATUS_INFO.FAILED.label).toBe('Failed');
      expect(SSL_STATUS_INFO.FAILED.description).toContain('failed');
    });
  });

  describe('getDomainSetupInstructions', () => {
    const testDomain = 'custom.example.com';
    const testToken = 'verify-token-12345';

    it('should return setup instructions object', () => {
      const instructions = getDomainSetupInstructions(testDomain, testToken);
      expect(instructions).toBeDefined();
      expect(instructions.steps).toBeDefined();
      expect(instructions.tips).toBeDefined();
    });

    it('should include correct number of steps', () => {
      const instructions = getDomainSetupInstructions(testDomain, testToken);
      expect(instructions.steps).toHaveLength(3);
    });

    it('should include DNS records step', () => {
      const instructions = getDomainSetupInstructions(testDomain, testToken);
      const dnsStep = instructions.steps[0];

      expect(dnsStep.title).toContain('DNS');
      expect(dnsStep.records).toBeDefined();
      expect(dnsStep.records!.length).toBeGreaterThan(0);
    });

    it('should include TXT record for verification', () => {
      const instructions = getDomainSetupInstructions(testDomain, testToken);
      const dnsStep = instructions.steps[0];
      const txtRecord = dnsStep.records!.find(r => r.type === 'TXT');

      expect(txtRecord).toBeDefined();
      expect(txtRecord?.name).toContain(testDomain);
      expect(txtRecord?.value).toContain(testToken);
      expect(txtRecord?.purpose).toContain('verification');
    });

    it('should include CNAME record for routing', () => {
      const instructions = getDomainSetupInstructions(testDomain, testToken);
      const dnsStep = instructions.steps[0];
      const cnameRecord = dnsStep.records!.find(r => r.type === 'CNAME');

      expect(cnameRecord).toBeDefined();
      expect(cnameRecord?.name).toBe(testDomain);
      expect(cnameRecord?.value).toContain('url-shortener');
      expect(cnameRecord?.purpose).toContain('traffic');
    });

    it('should include verification step', () => {
      const instructions = getDomainSetupInstructions(testDomain, testToken);
      const verifyStep = instructions.steps[1];

      expect(verifyStep.title).toContain('Verify');
      expect(verifyStep.description).toContain('verify');
    });

    it('should include SSL certificate step', () => {
      const instructions = getDomainSetupInstructions(testDomain, testToken);
      const sslStep = instructions.steps[2];

      expect(sslStep.title).toContain('SSL');
      expect(sslStep.description).toContain('certificate');
    });

    it('should include helpful tips', () => {
      const instructions = getDomainSetupInstructions(testDomain, testToken);

      expect(instructions.tips.length).toBeGreaterThan(0);
      expect(instructions.tips.some(tip => tip.includes('DNS'))).toBe(true);
      expect(instructions.tips.some(tip => tip.includes('propagation'))).toBe(true);
    });

    it('should handle subdomain correctly', () => {
      const subDomain = 'links.my-company.com';
      const instructions = getDomainSetupInstructions(subDomain, testToken);
      const dnsStep = instructions.steps[0];

      expect(dnsStep.records!.some(r => r.name.includes(subDomain))).toBe(true);
    });

    it('should use correct TXT record format', () => {
      const instructions = getDomainSetupInstructions(testDomain, testToken);
      const dnsStep = instructions.steps[0];
      const txtRecord = dnsStep.records!.find(r => r.type === 'TXT');

      expect(txtRecord?.name).toBe(`_url-shortener.${testDomain}`);
      expect(txtRecord?.value).toBe(`url-shortener-verify=${testToken}`);
    });
  });

  describe('updateSslStatus', () => {
    it('should be defined', async () => {
      const { updateSslStatus } = await import('@/lib/domains/ssl');
      expect(updateSslStatus).toBeDefined();
    });
  });

  describe('isSslActive', () => {
    it('should be defined', async () => {
      const { isSslActive } = await import('@/lib/domains/ssl');
      expect(isSslActive).toBeDefined();
    });
  });

  describe('provisionSsl', () => {
    it('should be defined', async () => {
      const { provisionSsl } = await import('@/lib/domains/ssl');
      expect(provisionSsl).toBeDefined();
    });
  });

  describe('checkDomainHealth', () => {
    it('should be defined', async () => {
      const { checkDomainHealth } = await import('@/lib/domains/ssl');
      expect(checkDomainHealth).toBeDefined();
    });
  });
});
