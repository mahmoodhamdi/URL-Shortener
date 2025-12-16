import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

/**
 * Standard error codes for API responses
 */
export const ErrorCode = {
  // Authentication & Authorization
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  SESSION_EXPIRED: 'SESSION_EXPIRED',

  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  INVALID_URL: 'INVALID_URL',
  INVALID_ALIAS: 'INVALID_ALIAS',

  // Resource errors
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',
  GONE: 'GONE',

  // Rate limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  LIMIT_EXCEEDED: 'LIMIT_EXCEEDED',

  // Server errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR: 'DATABASE_ERROR',

  // Business logic
  SUBSCRIPTION_REQUIRED: 'SUBSCRIPTION_REQUIRED',
  PLAN_LIMIT_REACHED: 'PLAN_LIMIT_REACHED',
  FEATURE_DISABLED: 'FEATURE_DISABLED',
  INVALID_OPERATION: 'INVALID_OPERATION',
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];

/**
 * Standard API error response structure
 */
export interface ApiErrorResponse {
  error: string;
  code: ErrorCodeType;
  details?: Record<string, unknown>;
}

/**
 * Creates a standardized error response
 */
export function createErrorResponse(
  error: string,
  code: ErrorCodeType,
  status: number,
  details?: Record<string, unknown>
): NextResponse<ApiErrorResponse> {
  const body: ApiErrorResponse = { error, code };
  if (details && Object.keys(details).length > 0) {
    body.details = details;
  }
  return NextResponse.json(body, { status });
}

/**
 * Common error responses factory
 */
export const ApiError = {
  // 400 Bad Request
  badRequest: (message = 'Bad request', details?: Record<string, unknown>) =>
    createErrorResponse(message, ErrorCode.INVALID_INPUT, 400, details),

  validationError: (message: string, details?: Record<string, unknown>) =>
    createErrorResponse(message, ErrorCode.VALIDATION_ERROR, 400, details),

  invalidUrl: (message = 'Invalid URL') =>
    createErrorResponse(message, ErrorCode.INVALID_URL, 400),

  invalidAlias: (message = 'Invalid alias') =>
    createErrorResponse(message, ErrorCode.INVALID_ALIAS, 400),

  // 401 Unauthorized
  unauthorized: (message = 'Unauthorized') =>
    createErrorResponse(message, ErrorCode.UNAUTHORIZED, 401),

  invalidCredentials: (message = 'Invalid credentials') =>
    createErrorResponse(message, ErrorCode.INVALID_CREDENTIALS, 401),

  sessionExpired: (message = 'Session expired') =>
    createErrorResponse(message, ErrorCode.SESSION_EXPIRED, 401),

  // 403 Forbidden
  forbidden: (message = 'Forbidden') =>
    createErrorResponse(message, ErrorCode.FORBIDDEN, 403),

  featureDisabled: (message = 'This feature is not available on your plan') =>
    createErrorResponse(message, ErrorCode.FEATURE_DISABLED, 403),

  // 404 Not Found
  notFound: (resource = 'Resource') =>
    createErrorResponse(`${resource} not found`, ErrorCode.NOT_FOUND, 404),

  // 409 Conflict
  conflict: (message: string) =>
    createErrorResponse(message, ErrorCode.CONFLICT, 409),

  alreadyExists: (resource = 'Resource') =>
    createErrorResponse(`${resource} already exists`, ErrorCode.ALREADY_EXISTS, 409),

  // 410 Gone
  gone: (message: string) =>
    createErrorResponse(message, ErrorCode.GONE, 410),

  // 429 Too Many Requests
  rateLimitExceeded: (
    message = 'Too many requests. Please try again later.',
    details?: { limit?: number; remaining?: number; resetAt?: number }
  ) => createErrorResponse(message, ErrorCode.RATE_LIMIT_EXCEEDED, 429, details),

  planLimitReached: (
    message: string,
    details?: { limit?: number; used?: number; remaining?: number }
  ) => createErrorResponse(message, ErrorCode.PLAN_LIMIT_REACHED, 429, details),

  // 500 Internal Server Error
  internal: (message = 'Internal server error') =>
    createErrorResponse(message, ErrorCode.INTERNAL_ERROR, 500),

  databaseError: (message = 'Database error') =>
    createErrorResponse(message, ErrorCode.DATABASE_ERROR, 500),

  // 503 Service Unavailable
  serviceUnavailable: (message = 'Service temporarily unavailable') =>
    createErrorResponse(message, ErrorCode.SERVICE_UNAVAILABLE, 503),
};

/**
 * Handles Zod validation errors
 */
export function handleZodError(error: ZodError): NextResponse<ApiErrorResponse> {
  const firstError = error.errors[0];
  const details: Record<string, unknown> = {
    field: firstError.path.join('.'),
    issues: error.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
      code: e.code,
    })),
  };
  return ApiError.validationError(firstError.message, details);
}

/**
 * Generic error handler for API routes
 */
export function handleApiError(error: unknown): NextResponse<ApiErrorResponse> {
  console.error('API Error:', error);

  if (error instanceof ZodError) {
    return handleZodError(error);
  }

  if (error instanceof Error) {
    // Handle specific error messages
    const message = error.message.toLowerCase();

    if (message.includes('unauthorized') || message.includes('unauthenticated')) {
      return ApiError.unauthorized();
    }

    if (message.includes('forbidden') || message.includes('permission')) {
      return ApiError.forbidden();
    }

    if (message.includes('not found')) {
      return ApiError.notFound();
    }

    if (message.includes('already taken') || message.includes('already exists')) {
      return ApiError.alreadyExists();
    }

    if (message.includes('invalid url')) {
      return ApiError.invalidUrl(error.message);
    }

    if (message.includes('invalid')) {
      return ApiError.badRequest(error.message);
    }

    if (message.includes('limit')) {
      return ApiError.planLimitReached(error.message);
    }
  }

  return ApiError.internal();
}
