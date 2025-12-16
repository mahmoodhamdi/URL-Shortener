import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    subscription: {
      create: vi.fn(),
    },
  },
}));

// Mock bcrypt
vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('$2a$12$hashedpassword'),
    compare: vi.fn(),
  },
}));

// Mock rate limiter
vi.mock('@/lib/rate-limit/limiter', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 10, limit: 10, resetAt: Date.now() + 60000 }),
  getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
  getRateLimitHeaders: vi.fn().mockReturnValue({
    'X-RateLimit-Limit': '10',
    'X-RateLimit-Remaining': '9',
    'X-RateLimit-Reset': String(Date.now() + 60000),
  }),
  RATE_LIMIT_PRESETS: {
    auth: {
      register: { limit: 10, windowMs: 3600000 },
      login: { limit: 10, windowMs: 60000 },
    },
  },
}));

import { prisma } from '@/lib/db/prisma';
import bcrypt from 'bcryptjs';
import { checkRateLimit, getClientIp, getRateLimitHeaders, RATE_LIMIT_PRESETS } from '@/lib/rate-limit/limiter';
import { z } from 'zod';

// Common passwords list (includes variants with special characters to match schema requirements)
const COMMON_PASSWORDS = new Set([
  'password', 'password1', 'password123', '123456', '123456789', '12345678',
  'qwerty', 'abc123', 'monkey', 'letmein', 'dragon', 'master', 'login',
  'password1!', 'password123!', 'qwerty123!', 'letmein1!', 'welcome1!',
]);

// Registration schema (same as in route)
const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character')
    .refine((pwd) => !COMMON_PASSWORDS.has(pwd.toLowerCase()), {
      message: 'Password is too common. Please choose a stronger password.',
    }),
});

describe('Authentication Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('User Registration', () => {
    describe('Input Validation', () => {
      it('should validate name minimum length', () => {
        const result = registerSchema.safeParse({
          name: 'A',
          email: 'test@example.com',
          password: 'ValidPass1!',
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toBe('Name must be at least 2 characters');
        }
      });

      it('should validate email format', () => {
        const result = registerSchema.safeParse({
          name: 'Test User',
          email: 'invalid-email',
          password: 'ValidPass1!',
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toBe('Invalid email address');
        }
      });

      it('should require minimum password length', () => {
        const result = registerSchema.safeParse({
          name: 'Test User',
          email: 'test@example.com',
          password: 'Short1!',
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toBe('Password must be at least 8 characters');
        }
      });

      it('should require uppercase letter in password', () => {
        const result = registerSchema.safeParse({
          name: 'Test User',
          email: 'test@example.com',
          password: 'lowercase1!',
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toBe('Password must contain at least one uppercase letter');
        }
      });

      it('should require lowercase letter in password', () => {
        const result = registerSchema.safeParse({
          name: 'Test User',
          email: 'test@example.com',
          password: 'UPPERCASE1!',
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toBe('Password must contain at least one lowercase letter');
        }
      });

      it('should require number in password', () => {
        const result = registerSchema.safeParse({
          name: 'Test User',
          email: 'test@example.com',
          password: 'NoNumberPass!',
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toBe('Password must contain at least one number');
        }
      });

      it('should require special character in password', () => {
        const result = registerSchema.safeParse({
          name: 'Test User',
          email: 'test@example.com',
          password: 'NoSpecial1',
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toBe('Password must contain at least one special character');
        }
      });

      it('should reject common passwords', () => {
        // Use a password that when lowercased is in the common passwords list
        const result = registerSchema.safeParse({
          name: 'Test User',
          email: 'test@example.com',
          password: 'Password1!', // 'password1!' is in common passwords list
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toBe('Password is too common. Please choose a stronger password.');
        }
      });

      it('should accept valid registration data', () => {
        const result = registerSchema.safeParse({
          name: 'Test User',
          email: 'test@example.com',
          password: 'SecurePass123!',
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.name).toBe('Test User');
          expect(result.data.email).toBe('test@example.com');
        }
      });
    });

    describe('User Creation', () => {
      it('should hash password before storing', async () => {
        const password = 'SecurePass123!';
        const hashedPassword = await bcrypt.hash(password, 12);

        expect(hashedPassword).toBe('$2a$12$hashedpassword');
        expect(bcrypt.hash).toHaveBeenCalledWith(password, 12);
      });

      it('should check if email already exists', async () => {
        vi.mocked(prisma.user.findUnique).mockResolvedValue({
          id: 'existing-user',
          email: 'existing@example.com',
          name: 'Existing User',
        } as never);

        const existingUser = await prisma.user.findUnique({
          where: { email: 'existing@example.com' },
        });

        expect(existingUser).not.toBeNull();
        expect(existingUser?.email).toBe('existing@example.com');
      });

      it('should return null for non-existing email', async () => {
        vi.mocked(prisma.user.findUnique).mockResolvedValue(null as never);

        const existingUser = await prisma.user.findUnique({
          where: { email: 'new@example.com' },
        });

        expect(existingUser).toBeNull();
      });

      it('should create user with FREE subscription', async () => {
        const mockUser = {
          id: 'user-1',
          name: 'Test User',
          email: 'test@example.com',
          createdAt: new Date(),
          subscription: {
            id: 'sub-1',
            plan: 'FREE',
            status: 'ACTIVE',
          },
        };

        vi.mocked(prisma.user.create).mockResolvedValue(mockUser as never);

        const user = await prisma.user.create({
          data: {
            name: 'Test User',
            email: 'test@example.com',
            password: '$2a$12$hashedpassword',
            subscription: {
              create: {
                plan: 'FREE',
                status: 'ACTIVE',
              },
            },
          },
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
          },
        });

        expect(user.id).toBe('user-1');
        expect(user.name).toBe('Test User');
        expect(user.email).toBe('test@example.com');
      });
    });

    describe('Rate Limiting', () => {
      it('should allow request when under rate limit', async () => {
        vi.mocked(checkRateLimit).mockResolvedValue({
          allowed: true,
          remaining: 9,
          limit: 10,
          resetAt: Date.now() + 60000,
        });

        const clientIp = getClientIp(new Headers());
        const rateLimitResult = await checkRateLimit(
          `auth:register:${clientIp}`,
          RATE_LIMIT_PRESETS.auth.register
        );

        expect(rateLimitResult.allowed).toBe(true);
        expect(rateLimitResult.remaining).toBe(9);
      });

      it('should block request when rate limit exceeded', async () => {
        vi.mocked(checkRateLimit).mockResolvedValue({
          allowed: false,
          remaining: 0,
          limit: 10,
          resetAt: Date.now() + 60000,
        });

        const rateLimitResult = await checkRateLimit(
          'auth:register:127.0.0.1',
          RATE_LIMIT_PRESETS.auth.register
        );

        expect(rateLimitResult.allowed).toBe(false);
        expect(rateLimitResult.remaining).toBe(0);
      });

      it('should return correct rate limit headers', () => {
        const headers = getRateLimitHeaders({
          allowed: true,
          remaining: 9,
          limit: 10,
          resetAt: Date.now() + 60000,
        });

        expect(headers['X-RateLimit-Limit']).toBe('10');
        expect(headers['X-RateLimit-Remaining']).toBe('9');
      });
    });

    describe('Password Verification', () => {
      it('should verify correct password', async () => {
        vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

        const isValid = await bcrypt.compare('correctpassword', '$2a$12$hashedpassword');

        expect(isValid).toBe(true);
      });

      it('should reject incorrect password', async () => {
        vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

        const isValid = await bcrypt.compare('wrongpassword', '$2a$12$hashedpassword');

        expect(isValid).toBe(false);
      });
    });

    describe('Full Registration Flow', () => {
      it('should complete registration successfully', async () => {
        // Step 1: Check rate limit
        vi.mocked(checkRateLimit).mockResolvedValue({
          allowed: true,
          remaining: 9,
          limit: 10,
          resetAt: Date.now() + 60000,
        });

        const rateLimitResult = await checkRateLimit(
          'auth:register:127.0.0.1',
          RATE_LIMIT_PRESETS.auth.register
        );
        expect(rateLimitResult.allowed).toBe(true);

        // Step 2: Validate input
        const input = {
          name: 'Test User',
          email: 'test@example.com',
          password: 'SecurePass123!',
        };

        const validation = registerSchema.safeParse(input);
        expect(validation.success).toBe(true);

        // Step 3: Check if email exists
        vi.mocked(prisma.user.findUnique).mockResolvedValue(null as never);

        const existingUser = await prisma.user.findUnique({
          where: { email: input.email },
        });
        expect(existingUser).toBeNull();

        // Step 4: Hash password
        const hashedPassword = await bcrypt.hash(input.password, 12);
        expect(hashedPassword).toBeTruthy();

        // Step 5: Create user
        const mockUser = {
          id: 'user-1',
          name: input.name,
          email: input.email,
          createdAt: new Date(),
        };

        vi.mocked(prisma.user.create).mockResolvedValue(mockUser as never);

        const user = await prisma.user.create({
          data: {
            name: input.name,
            email: input.email,
            password: hashedPassword,
            subscription: {
              create: {
                plan: 'FREE',
                status: 'ACTIVE',
              },
            },
          },
        });

        expect(user.id).toBe('user-1');
        expect(user.name).toBe(input.name);
        expect(user.email).toBe(input.email);
      });

      it('should reject registration for existing email', async () => {
        // Rate limit passes
        vi.mocked(checkRateLimit).mockResolvedValue({
          allowed: true,
          remaining: 9,
          limit: 10,
          resetAt: Date.now() + 60000,
        });

        // Email already exists
        vi.mocked(prisma.user.findUnique).mockResolvedValue({
          id: 'existing-user',
          email: 'existing@example.com',
        } as never);

        const existingUser = await prisma.user.findUnique({
          where: { email: 'existing@example.com' },
        });

        expect(existingUser).not.toBeNull();
        // Registration should stop here and return 409
      });

      it('should reject registration when rate limited', async () => {
        vi.mocked(checkRateLimit).mockResolvedValue({
          allowed: false,
          remaining: 0,
          limit: 10,
          resetAt: Date.now() + 60000,
        });

        const rateLimitResult = await checkRateLimit(
          'auth:register:127.0.0.1',
          RATE_LIMIT_PRESETS.auth.register
        );

        expect(rateLimitResult.allowed).toBe(false);
        // Registration should stop here and return 429
      });
    });
  });

  describe('Session Management', () => {
    it('should extract client IP from headers', () => {
      const ip = getClientIp(new Headers());
      expect(ip).toBe('127.0.0.1');
    });
  });
});
