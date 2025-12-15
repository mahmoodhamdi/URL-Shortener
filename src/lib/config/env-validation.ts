/**
 * Environment Variable Validation
 *
 * Validates required and optional environment variables on application startup.
 * Throws descriptive errors if required variables are missing.
 */

export interface EnvValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// Required environment variables - app won't function without these
const REQUIRED_ENV_VARS = [
  {
    name: 'DATABASE_URL',
    description: 'PostgreSQL connection string',
  },
  {
    name: 'AUTH_SECRET',
    description: 'NextAuth.js secret for session encryption',
  },
] as const;

// Optional environment variables with defaults or optional functionality
const OPTIONAL_ENV_VARS = [
  {
    name: 'NEXT_PUBLIC_APP_URL',
    description: 'Public application URL',
    default: 'http://localhost:3000',
  },
  {
    name: 'GOOGLE_CLIENT_ID',
    description: 'Google OAuth client ID (optional)',
  },
  {
    name: 'GOOGLE_CLIENT_SECRET',
    description: 'Google OAuth client secret (optional)',
  },
  {
    name: 'GITHUB_CLIENT_ID',
    description: 'GitHub OAuth client ID (optional)',
  },
  {
    name: 'GITHUB_CLIENT_SECRET',
    description: 'GitHub OAuth client secret (optional)',
  },
  {
    name: 'STRIPE_SECRET_KEY',
    description: 'Stripe secret key for payments (optional)',
  },
  {
    name: 'STRIPE_WEBHOOK_SECRET',
    description: 'Stripe webhook signing secret (optional)',
  },
  {
    name: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    description: 'Stripe publishable key (optional)',
  },
] as const;

/**
 * Validate all required environment variables
 */
export function validateEnv(): EnvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required variables
  for (const envVar of REQUIRED_ENV_VARS) {
    const value = process.env[envVar.name];
    if (!value || value.trim() === '') {
      errors.push(`Missing required environment variable: ${envVar.name} - ${envVar.description}`);
    }
  }

  // Check optional variables and warn if some are partially configured
  const oauthProviders: Record<string, { id?: string; secret?: string }> = {};

  for (const envVar of OPTIONAL_ENV_VARS) {
    const value = process.env[envVar.name];

    // Track OAuth provider configuration
    if (envVar.name === 'GOOGLE_CLIENT_ID') {
      oauthProviders.google = { ...oauthProviders.google, id: value };
    } else if (envVar.name === 'GOOGLE_CLIENT_SECRET') {
      oauthProviders.google = { ...oauthProviders.google, secret: value };
    } else if (envVar.name === 'GITHUB_CLIENT_ID') {
      oauthProviders.github = { ...oauthProviders.github, id: value };
    } else if (envVar.name === 'GITHUB_CLIENT_SECRET') {
      oauthProviders.github = { ...oauthProviders.github, secret: value };
    }

    // Track Stripe configuration
    if (envVar.name === 'STRIPE_SECRET_KEY' && !value) {
      warnings.push('Stripe payments are disabled (STRIPE_SECRET_KEY not set)');
    }
  }

  // Warn about incomplete OAuth configurations
  for (const [provider, config] of Object.entries(oauthProviders)) {
    if ((config.id && !config.secret) || (!config.id && config.secret)) {
      warnings.push(
        `${provider.charAt(0).toUpperCase() + provider.slice(1)} OAuth is partially configured. ` +
        `Both CLIENT_ID and CLIENT_SECRET are required for OAuth to work.`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate environment variables and throw if invalid
 */
export function requireValidEnv(): void {
  const result = validateEnv();

  if (!result.valid) {
    const errorMessage = [
      '\n❌ Environment validation failed!\n',
      'Missing required environment variables:',
      ...result.errors.map(e => `  - ${e}`),
      '\nPlease check your .env file or environment configuration.',
      'See .env.example for required variables.\n',
    ].join('\n');

    throw new Error(errorMessage);
  }

  // Log warnings in development
  if (process.env.NODE_ENV === 'development' && result.warnings.length > 0) {
    console.warn('\n⚠️  Environment warnings:');
    result.warnings.forEach(w => console.warn(`  - ${w}`));
    console.warn('');
  }
}

/**
 * Get environment variable with type safety
 */
export function getEnvVar(name: string, defaultValue?: string): string {
  const value = process.env[name];
  if (!value && defaultValue === undefined) {
    throw new Error(`Environment variable ${name} is not set and no default provided`);
  }
  return value || defaultValue || '';
}

/**
 * Get required environment variable (throws if missing)
 */
export function getRequiredEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Required environment variable ${name} is not set`);
  }
  return value;
}

/**
 * Check if an environment variable is set
 */
export function hasEnvVar(name: string): boolean {
  const value = process.env[name];
  return value !== undefined && value.trim() !== '';
}

/**
 * Get environment info for debugging
 */
export function getEnvInfo(): {
  nodeEnv: string;
  hasDatabase: boolean;
  hasAuth: boolean;
  hasStripe: boolean;
  hasGoogleOAuth: boolean;
  hasGitHubOAuth: boolean;
} {
  return {
    nodeEnv: process.env.NODE_ENV || 'development',
    hasDatabase: hasEnvVar('DATABASE_URL'),
    hasAuth: hasEnvVar('AUTH_SECRET'),
    hasStripe: hasEnvVar('STRIPE_SECRET_KEY'),
    hasGoogleOAuth: hasEnvVar('GOOGLE_CLIENT_ID') && hasEnvVar('GOOGLE_CLIENT_SECRET'),
    hasGitHubOAuth: hasEnvVar('GITHUB_CLIENT_ID') && hasEnvVar('GITHUB_CLIENT_SECRET'),
  };
}
