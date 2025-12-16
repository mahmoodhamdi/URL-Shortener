import { describe, it, expect, vi } from 'vitest';
import { ZodError, z } from 'zod';
import {
  ErrorCode,
  ApiError,
  createErrorResponse,
  handleZodError,
  handleApiError,
} from '@/lib/api/errors';

describe('ErrorCode', () => {
  it('should have all expected error codes', () => {
    expect(ErrorCode.UNAUTHORIZED).toBe('UNAUTHORIZED');
    expect(ErrorCode.FORBIDDEN).toBe('FORBIDDEN');
    expect(ErrorCode.NOT_FOUND).toBe('NOT_FOUND');
    expect(ErrorCode.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
    expect(ErrorCode.RATE_LIMIT_EXCEEDED).toBe('RATE_LIMIT_EXCEEDED');
    expect(ErrorCode.INTERNAL_ERROR).toBe('INTERNAL_ERROR');
    expect(ErrorCode.PLAN_LIMIT_REACHED).toBe('PLAN_LIMIT_REACHED');
    expect(ErrorCode.ALREADY_EXISTS).toBe('ALREADY_EXISTS');
  });
});

describe('createErrorResponse', () => {
  it('should create a response with error and code', async () => {
    const response = createErrorResponse('Test error', ErrorCode.INTERNAL_ERROR, 500);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('Test error');
    expect(body.code).toBe('INTERNAL_ERROR');
    expect(body.details).toBeUndefined();
  });

  it('should include details when provided', async () => {
    const response = createErrorResponse(
      'Validation failed',
      ErrorCode.VALIDATION_ERROR,
      400,
      { field: 'email', value: 'invalid' }
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('Validation failed');
    expect(body.code).toBe('VALIDATION_ERROR');
    expect(body.details).toEqual({ field: 'email', value: 'invalid' });
  });

  it('should not include empty details object', async () => {
    const response = createErrorResponse('Error', ErrorCode.INTERNAL_ERROR, 500, {});
    const body = await response.json();

    expect(body.details).toBeUndefined();
  });
});

describe('ApiError', () => {
  describe('badRequest', () => {
    it('should return 400 status with default message', async () => {
      const response = ApiError.badRequest();
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe('Bad request');
      expect(body.code).toBe('INVALID_INPUT');
    });

    it('should accept custom message and details', async () => {
      const response = ApiError.badRequest('Custom error', { field: 'name' });
      const body = await response.json();

      expect(body.error).toBe('Custom error');
      expect(body.details).toEqual({ field: 'name' });
    });
  });

  describe('validationError', () => {
    it('should return 400 status with validation code', async () => {
      const response = ApiError.validationError('Field is required');
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe('Field is required');
      expect(body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('unauthorized', () => {
    it('should return 401 status', async () => {
      const response = ApiError.unauthorized();
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.error).toBe('Unauthorized');
      expect(body.code).toBe('UNAUTHORIZED');
    });

    it('should accept custom message', async () => {
      const response = ApiError.unauthorized('Token expired');
      const body = await response.json();

      expect(body.error).toBe('Token expired');
    });
  });

  describe('forbidden', () => {
    it('should return 403 status', async () => {
      const response = ApiError.forbidden();
      const body = await response.json();

      expect(response.status).toBe(403);
      expect(body.error).toBe('Forbidden');
      expect(body.code).toBe('FORBIDDEN');
    });
  });

  describe('notFound', () => {
    it('should return 404 status with resource name', async () => {
      const response = ApiError.notFound('User');
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.error).toBe('User not found');
      expect(body.code).toBe('NOT_FOUND');
    });

    it('should use default resource name', async () => {
      const response = ApiError.notFound();
      const body = await response.json();

      expect(body.error).toBe('Resource not found');
    });
  });

  describe('conflict', () => {
    it('should return 409 status', async () => {
      const response = ApiError.conflict('Resource already exists');
      const body = await response.json();

      expect(response.status).toBe(409);
      expect(body.error).toBe('Resource already exists');
      expect(body.code).toBe('CONFLICT');
    });
  });

  describe('alreadyExists', () => {
    it('should return 409 status with resource name', async () => {
      const response = ApiError.alreadyExists('Alias');
      const body = await response.json();

      expect(response.status).toBe(409);
      expect(body.error).toBe('Alias already exists');
      expect(body.code).toBe('ALREADY_EXISTS');
    });
  });

  describe('gone', () => {
    it('should return 410 status', async () => {
      const response = ApiError.gone('Resource has been deleted');
      const body = await response.json();

      expect(response.status).toBe(410);
      expect(body.error).toBe('Resource has been deleted');
      expect(body.code).toBe('GONE');
    });
  });

  describe('rateLimitExceeded', () => {
    it('should return 429 status with details', async () => {
      const response = ApiError.rateLimitExceeded('Too many requests', {
        limit: 100,
        remaining: 0,
        resetAt: 1234567890,
      });
      const body = await response.json();

      expect(response.status).toBe(429);
      expect(body.error).toBe('Too many requests');
      expect(body.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(body.details).toEqual({
        limit: 100,
        remaining: 0,
        resetAt: 1234567890,
      });
    });
  });

  describe('planLimitReached', () => {
    it('should return 429 status with plan details', async () => {
      const response = ApiError.planLimitReached('Link limit reached', {
        limit: 50,
        used: 50,
        remaining: 0,
      });
      const body = await response.json();

      expect(response.status).toBe(429);
      expect(body.error).toBe('Link limit reached');
      expect(body.code).toBe('PLAN_LIMIT_REACHED');
      expect(body.details).toEqual({
        limit: 50,
        used: 50,
        remaining: 0,
      });
    });
  });

  describe('internal', () => {
    it('should return 500 status with default message', async () => {
      const response = ApiError.internal();
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.error).toBe('Internal server error');
      expect(body.code).toBe('INTERNAL_ERROR');
    });

    it('should accept custom message', async () => {
      const response = ApiError.internal('Database connection failed');
      const body = await response.json();

      expect(body.error).toBe('Database connection failed');
    });
  });

  describe('serviceUnavailable', () => {
    it('should return 503 status', async () => {
      const response = ApiError.serviceUnavailable();
      const body = await response.json();

      expect(response.status).toBe(503);
      expect(body.error).toBe('Service temporarily unavailable');
      expect(body.code).toBe('SERVICE_UNAVAILABLE');
    });
  });

  describe('featureDisabled', () => {
    it('should return 403 status with feature code', async () => {
      const response = ApiError.featureDisabled();
      const body = await response.json();

      expect(response.status).toBe(403);
      expect(body.code).toBe('FEATURE_DISABLED');
    });
  });
});

describe('handleZodError', () => {
  it('should format Zod validation errors', async () => {
    const schema = z.object({
      email: z.string().email('Invalid email format'),
      age: z.number().min(18, 'Must be at least 18'),
    });

    let zodError: ZodError | null = null;
    try {
      schema.parse({ email: 'invalid', age: 10 });
    } catch (e) {
      zodError = e as ZodError;
    }

    expect(zodError).not.toBeNull();
    const response = handleZodError(zodError!);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.code).toBe('VALIDATION_ERROR');
    expect(body.details).toBeDefined();
    expect(body.details.issues).toBeInstanceOf(Array);
    expect(body.details.issues.length).toBeGreaterThan(0);
  });

  it('should include field path in details', async () => {
    const schema = z.object({
      user: z.object({
        name: z.string().min(1, 'Name is required'),
      }),
    });

    let zodError: ZodError | null = null;
    try {
      schema.parse({ user: { name: '' } });
    } catch (e) {
      zodError = e as ZodError;
    }

    const response = handleZodError(zodError!);
    const body = await response.json();

    expect(body.details.field).toBe('user.name');
  });
});

describe('handleApiError', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should handle ZodError', async () => {
    const schema = z.string().min(1);
    let error: ZodError | null = null;
    try {
      schema.parse('');
    } catch (e) {
      error = e as ZodError;
    }

    const response = handleApiError(error);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.code).toBe('VALIDATION_ERROR');
  });

  it('should handle unauthorized errors', async () => {
    const response = handleApiError(new Error('Unauthorized access'));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('should handle forbidden errors', async () => {
    const response = handleApiError(new Error('Permission denied'));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.code).toBe('FORBIDDEN');
  });

  it('should handle not found errors', async () => {
    const response = handleApiError(new Error('Resource not found'));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.code).toBe('NOT_FOUND');
  });

  it('should handle already exists errors', async () => {
    const response = handleApiError(new Error('Alias already taken'));
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.code).toBe('ALREADY_EXISTS');
  });

  it('should handle invalid URL errors', async () => {
    const response = handleApiError(new Error('Invalid URL format'));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.code).toBe('INVALID_URL');
  });

  it('should handle generic invalid errors', async () => {
    const response = handleApiError(new Error('Invalid input data'));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.code).toBe('INVALID_INPUT');
  });

  it('should handle limit errors', async () => {
    const response = handleApiError(new Error('Link limit exceeded'));
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body.code).toBe('PLAN_LIMIT_REACHED');
  });

  it('should handle unknown errors as internal errors', async () => {
    const response = handleApiError(new Error('Something unexpected happened'));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.code).toBe('INTERNAL_ERROR');
  });

  it('should handle non-Error objects', async () => {
    const response = handleApiError('string error');
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.code).toBe('INTERNAL_ERROR');
  });

  it('should log errors to console', () => {
    handleApiError(new Error('Test error'));
    expect(console.error).toHaveBeenCalled();
  });
});
