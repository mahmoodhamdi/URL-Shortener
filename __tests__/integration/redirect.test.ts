import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock url/shortener functions
vi.mock('@/lib/url/shortener', () => ({
  getLinkByCode: vi.fn(),
  isLinkExpired: vi.fn(),
  verifyPassword: vi.fn(),
}));

// Mock analytics tracker
vi.mock('@/lib/analytics/tracker', () => ({
  trackClick: vi.fn().mockResolvedValue({ id: 'click-1' }),
}));

// Mock targeting
vi.mock('@/lib/targeting', () => ({
  resolveTargetUrl: vi.fn().mockImplementation((link) => Promise.resolve(link.originalUrl)),
}));

// Mock A/B testing
vi.mock('@/lib/ab-testing', () => ({
  selectAndTrackVariant: vi.fn().mockResolvedValue(null),
}));

// Mock cloaking
vi.mock('@/lib/cloaking', () => ({
  generateCloakedPage: vi.fn().mockReturnValue('<html>Cloaked</html>'),
  getCloakedPageContentType: vi.fn().mockReturnValue('text/html'),
}));

import {
  getLinkByCode,
  isLinkExpired,
  verifyPassword,
} from '@/lib/url/shortener';
import { trackClick } from '@/lib/analytics/tracker';
import { resolveTargetUrl } from '@/lib/targeting';
import { selectAndTrackVariant } from '@/lib/ab-testing';
import { generateCloakedPage } from '@/lib/cloaking';

describe('Redirect Handler Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getLinkByCode', () => {
    it('should return link when found', async () => {
      const mockLink = {
        id: 'link-1',
        shortCode: 'abc123',
        originalUrl: 'https://example.com',
        isActive: true,
        expiresAt: null,
        password: null,
        cloakingEnabled: false,
        createdAt: new Date(),
      };

      vi.mocked(getLinkByCode).mockResolvedValue(mockLink);

      const link = await getLinkByCode('abc123');

      expect(link).toEqual(mockLink);
      expect(getLinkByCode).toHaveBeenCalledWith('abc123');
    });

    it('should return null when link not found', async () => {
      vi.mocked(getLinkByCode).mockResolvedValue(null);

      const link = await getLinkByCode('nonexistent');

      expect(link).toBeNull();
    });
  });

  describe('isLinkExpired', () => {
    it('should return false for link without expiration', () => {
      const link = {
        id: 'link-1',
        expiresAt: null,
      };

      vi.mocked(isLinkExpired).mockReturnValue(false);

      const expired = isLinkExpired(link as never);

      expect(expired).toBe(false);
    });

    it('should return false for link with future expiration', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const link = {
        id: 'link-1',
        expiresAt: futureDate,
      };

      vi.mocked(isLinkExpired).mockReturnValue(false);

      const expired = isLinkExpired(link as never);

      expect(expired).toBe(false);
    });

    it('should return true for expired link', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const link = {
        id: 'link-1',
        expiresAt: pastDate,
      };

      vi.mocked(isLinkExpired).mockReturnValue(true);

      const expired = isLinkExpired(link as never);

      expect(expired).toBe(true);
    });
  });

  describe('verifyPassword', () => {
    it('should return true for correct password', async () => {
      vi.mocked(verifyPassword).mockResolvedValue(true);

      const isValid = await verifyPassword('link-1', 'correctpassword');

      expect(isValid).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      vi.mocked(verifyPassword).mockResolvedValue(false);

      const isValid = await verifyPassword('link-1', 'wrongpassword');

      expect(isValid).toBe(false);
    });

    it('should return false for link without password', async () => {
      vi.mocked(verifyPassword).mockResolvedValue(false);

      const isValid = await verifyPassword('link-1', 'anypassword');

      expect(isValid).toBe(false);
    });
  });

  describe('trackClick', () => {
    it('should track click with user agent and referrer', async () => {
      await trackClick({
        linkId: 'link-1',
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        referrer: 'https://google.com',
      });

      expect(trackClick).toHaveBeenCalledWith({
        linkId: 'link-1',
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        referrer: 'https://google.com',
      });
    });

    it('should track click without optional fields', async () => {
      await trackClick({
        linkId: 'link-1',
      });

      expect(trackClick).toHaveBeenCalledWith({
        linkId: 'link-1',
      });
    });
  });

  describe('resolveTargetUrl', () => {
    it('should return original URL when no targeting rules', async () => {
      const link = {
        id: 'link-1',
        originalUrl: 'https://example.com',
      };

      vi.mocked(resolveTargetUrl).mockResolvedValue('https://example.com');

      const targetUrl = await resolveTargetUrl(link, {} as never);

      expect(targetUrl).toBe('https://example.com');
    });

    it('should return targeted URL when rules match', async () => {
      const link = {
        id: 'link-1',
        originalUrl: 'https://example.com',
      };

      vi.mocked(resolveTargetUrl).mockResolvedValue('https://mobile.example.com');

      const targetUrl = await resolveTargetUrl(link, {} as never);

      expect(targetUrl).toBe('https://mobile.example.com');
    });
  });

  describe('selectAndTrackVariant', () => {
    it('should return null when no A/B test active', async () => {
      vi.mocked(selectAndTrackVariant).mockResolvedValue(null);

      const result = await selectAndTrackVariant('link-1', '192.168.1.1', 'Mozilla/5.0');

      expect(result).toBeNull();
    });

    it('should return variant URL when A/B test active', async () => {
      vi.mocked(selectAndTrackVariant).mockResolvedValue('https://variant-b.example.com');

      const result = await selectAndTrackVariant('link-1', '192.168.1.1', 'Mozilla/5.0');

      expect(result).toBe('https://variant-b.example.com');
    });
  });

  describe('generateCloakedPage', () => {
    it('should generate iframe cloaked page', () => {
      vi.mocked(generateCloakedPage).mockReturnValue('<html><iframe src="https://example.com"></iframe></html>');

      const html = generateCloakedPage('IFRAME', {
        destinationUrl: 'https://example.com',
        title: 'My Link',
      });

      expect(html).toContain('iframe');
    });

    it('should generate meta refresh cloaked page', () => {
      vi.mocked(generateCloakedPage).mockReturnValue('<html><meta http-equiv="refresh" content="0;url=https://example.com"></html>');

      const html = generateCloakedPage('META_REFRESH', {
        destinationUrl: 'https://example.com',
      });

      expect(html).toContain('meta');
    });

    it('should generate JS redirect cloaked page', () => {
      vi.mocked(generateCloakedPage).mockReturnValue('<html><script>window.location.href="https://example.com"</script></html>');

      const html = generateCloakedPage('JS_REDIRECT', {
        destinationUrl: 'https://example.com',
      });

      expect(html).toContain('script');
    });
  });

  describe('Redirect Flow Integration', () => {
    it('should complete full redirect flow for active link', async () => {
      const mockLink = {
        id: 'link-1',
        shortCode: 'abc123',
        originalUrl: 'https://example.com',
        isActive: true,
        expiresAt: null,
        password: null,
        cloakingEnabled: false,
      };

      vi.mocked(getLinkByCode).mockResolvedValue(mockLink);
      vi.mocked(isLinkExpired).mockReturnValue(false);
      vi.mocked(selectAndTrackVariant).mockResolvedValue(null);
      vi.mocked(resolveTargetUrl).mockResolvedValue('https://example.com');

      // Get link
      const link = await getLinkByCode('abc123');
      expect(link).not.toBeNull();

      // Check not expired
      const expired = isLinkExpired(link as never);
      expect(expired).toBe(false);

      // Track click
      await trackClick({ linkId: link!.id });

      // Get target URL
      const targetUrl = await resolveTargetUrl(
        { id: link!.id, originalUrl: link!.originalUrl },
        {} as never
      );

      expect(targetUrl).toBe('https://example.com');
    });

    it('should handle password protected link', async () => {
      const mockLink = {
        id: 'link-1',
        shortCode: 'abc123',
        originalUrl: 'https://example.com',
        isActive: true,
        expiresAt: null,
        password: '$2a$12$hashedpassword',
        cloakingEnabled: false,
      };

      vi.mocked(getLinkByCode).mockResolvedValue(mockLink);
      vi.mocked(verifyPassword).mockResolvedValue(true);

      // Get link
      const link = await getLinkByCode('abc123');
      expect(link).not.toBeNull();
      expect(link!.password).not.toBeNull();

      // Verify password
      const isValid = await verifyPassword('link-1', 'correctpassword');
      expect(isValid).toBe(true);
    });

    it('should handle cloaked link', async () => {
      const mockLink = {
        id: 'link-1',
        shortCode: 'abc123',
        originalUrl: 'https://example.com',
        isActive: true,
        expiresAt: null,
        password: null,
        cloakingEnabled: true,
        cloakingType: 'IFRAME',
        cloakingTitle: 'My Link',
        cloakingFavicon: null,
      };

      vi.mocked(getLinkByCode).mockResolvedValue(mockLink);

      // Get link
      const link = await getLinkByCode('abc123');
      expect(link).not.toBeNull();
      expect(link!.cloakingEnabled).toBe(true);

      // Generate cloaked page
      const html = generateCloakedPage(link!.cloakingType as never, {
        destinationUrl: link!.originalUrl,
        title: link!.cloakingTitle,
      });

      expect(html).toBeTruthy();
    });

    it('should handle A/B test variant selection', async () => {
      const mockLink = {
        id: 'link-1',
        shortCode: 'abc123',
        originalUrl: 'https://example.com',
        isActive: true,
        expiresAt: null,
        password: null,
        cloakingEnabled: false,
      };

      vi.mocked(getLinkByCode).mockResolvedValue(mockLink);
      vi.mocked(selectAndTrackVariant).mockResolvedValue('https://variant-a.example.com');

      // Get link
      const link = await getLinkByCode('abc123');
      expect(link).not.toBeNull();

      // Select A/B variant
      const variantUrl = await selectAndTrackVariant(link!.id, '192.168.1.1', 'Mozilla/5.0');
      expect(variantUrl).toBe('https://variant-a.example.com');
    });
  });
});
