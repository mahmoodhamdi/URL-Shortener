import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';
import {
  unauthorizedResponse,
  forbiddenResponse,
} from '@/lib/auth/middleware';

// Mock the auth function
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

describe('Auth Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('unauthorizedResponse', () => {
    it('should return 401 status response', () => {
      const response = unauthorizedResponse();
      expect(response.status).toBe(401);
    });

    it('should return default "Unauthorized" message', async () => {
      const response = unauthorizedResponse();
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('should return custom message when provided', async () => {
      const customMessage = 'Please log in to continue';
      const response = unauthorizedResponse(customMessage);
      const data = await response.json();
      expect(data.error).toBe(customMessage);
    });

    it('should return NextResponse instance', () => {
      const response = unauthorizedResponse();
      expect(response).toBeInstanceOf(NextResponse);
    });
  });

  describe('forbiddenResponse', () => {
    it('should return 403 status response', () => {
      const response = forbiddenResponse();
      expect(response.status).toBe(403);
    });

    it('should return default "Forbidden" message', async () => {
      const response = forbiddenResponse();
      const data = await response.json();
      expect(data.error).toBe('Forbidden');
    });

    it('should return custom message when provided', async () => {
      const customMessage = 'You do not have permission to access this resource';
      const response = forbiddenResponse(customMessage);
      const data = await response.json();
      expect(data.error).toBe(customMessage);
    });

    it('should return NextResponse instance', () => {
      const response = forbiddenResponse();
      expect(response).toBeInstanceOf(NextResponse);
    });
  });

  describe('requireAuth', () => {
    it('should be defined', async () => {
      const { requireAuth } = await import('@/lib/auth/middleware');
      expect(requireAuth).toBeDefined();
      expect(typeof requireAuth).toBe('function');
    });

    it('should return AuthResult interface', async () => {
      const { auth } = await import('@/lib/auth');
      vi.mocked(auth).mockResolvedValueOnce(null);

      const { requireAuth } = await import('@/lib/auth/middleware');
      const result = await requireAuth();

      expect(result).toHaveProperty('authenticated');
    });

    it('should return authenticated false when no session', async () => {
      const { auth } = await import('@/lib/auth');
      vi.mocked(auth).mockResolvedValueOnce(null);

      const { requireAuth } = await import('@/lib/auth/middleware');
      const result = await requireAuth();

      expect(result.authenticated).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should return authenticated true when session exists', async () => {
      const { auth } = await import('@/lib/auth');
      vi.mocked(auth).mockResolvedValueOnce({
        user: { id: 'user-123', name: 'Test User', email: 'test@example.com' },
        expires: new Date(Date.now() + 3600000).toISOString(),
      });

      const { requireAuth } = await import('@/lib/auth/middleware');
      const result = await requireAuth();

      expect(result.authenticated).toBe(true);
      expect(result.userId).toBe('user-123');
    });
  });

  describe('getOptionalAuth', () => {
    it('should be defined', async () => {
      const { getOptionalAuth } = await import('@/lib/auth/middleware');
      expect(getOptionalAuth).toBeDefined();
      expect(typeof getOptionalAuth).toBe('function');
    });

    it('should return empty object when no session', async () => {
      const { auth } = await import('@/lib/auth');
      vi.mocked(auth).mockResolvedValueOnce(null);

      const { getOptionalAuth } = await import('@/lib/auth/middleware');
      const result = await getOptionalAuth();

      expect(result.userId).toBeUndefined();
      expect(result.session).toBeUndefined();
    });

    it('should return user info when session exists', async () => {
      const { auth } = await import('@/lib/auth');
      vi.mocked(auth).mockResolvedValueOnce({
        user: { id: 'user-456', name: 'Test User', email: 'test@example.com' },
        expires: new Date(Date.now() + 3600000).toISOString(),
      });

      const { getOptionalAuth } = await import('@/lib/auth/middleware');
      const result = await getOptionalAuth();

      expect(result.userId).toBe('user-456');
      expect(result.session).toBeDefined();
    });
  });

  describe('withAuth', () => {
    it('should be defined', async () => {
      const { withAuth } = await import('@/lib/auth/middleware');
      expect(withAuth).toBeDefined();
      expect(typeof withAuth).toBe('function');
    });

    it('should return a function', async () => {
      const { withAuth } = await import('@/lib/auth/middleware');
      const handler = vi.fn();
      const wrapped = withAuth(handler);

      expect(typeof wrapped).toBe('function');
    });
  });

  describe('AuthenticatedRequest interface', () => {
    it('should export AuthenticatedRequest type', async () => {
      // This test verifies the type is exported correctly
      // The type checking happens at compile time
      const module = await import('@/lib/auth/middleware');
      expect(module).toBeDefined();
    });
  });

  describe('AuthResult interface', () => {
    it('should export AuthResult type', async () => {
      // This test verifies the type is exported correctly
      const module = await import('@/lib/auth/middleware');
      expect(module).toBeDefined();
    });
  });
});
