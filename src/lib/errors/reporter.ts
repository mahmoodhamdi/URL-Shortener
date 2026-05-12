/**
 * Abstract error reporter. Plug in Sentry, Datadog, Honeybadger, or anything
 * else by setting a custom reporter via `setErrorReporter()` at app boot. The
 * default reporter logs to the server console and is safe in every runtime.
 */

export type ErrorContext = {
  user_id?: string;
  request_id?: string;
  route?: string;
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
};

export interface ErrorReporter {
  captureException(error: unknown, context?: ErrorContext): void | Promise<void>;
  captureMessage(
    message: string,
    level: 'info' | 'warning' | 'error',
    context?: ErrorContext
  ): void | Promise<void>;
}

const consoleReporter: ErrorReporter = {
  captureException(error, context) {
    const payload = {
      level: 'error',
      ts: new Date().toISOString(),
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      context,
    };
    console.error(JSON.stringify(payload));
  },
  captureMessage(message, level, context) {
    const payload = {
      level,
      ts: new Date().toISOString(),
      message,
      context,
    };
    const fn = level === 'error' ? console.error : level === 'warning' ? console.warn : console.log;
    fn(JSON.stringify(payload));
  },
};

let current: ErrorReporter = consoleReporter;

export function setErrorReporter(reporter: ErrorReporter): void {
  current = reporter;
}

export function getErrorReporter(): ErrorReporter {
  return current;
}

export function captureException(error: unknown, context?: ErrorContext) {
  return current.captureException(error, context);
}

export function captureMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'error',
  context?: ErrorContext
) {
  return current.captureMessage(message, level, context);
}
