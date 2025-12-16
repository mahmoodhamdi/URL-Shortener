import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary, WithErrorBoundary } from '@/components/ui/error-boundary';

// Component that throws an error
function ThrowError({ shouldThrow = false }: { shouldThrow?: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
}

// Suppress console.error for cleaner test output
const originalConsoleError = console.error;

describe('ErrorBoundary', () => {
  beforeEach(() => {
    console.error = vi.fn();
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  it('should render children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Test content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('should render error UI when child throws', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('An unexpected error occurred. Please try again.')).toBeInTheDocument();
  });

  it('should render custom translations', () => {
    const translations = {
      title: 'Custom Error Title',
      description: 'Custom error description',
      retry: 'Retry Button',
      goHome: 'Home Button',
    };

    render(
      <ErrorBoundary translations={translations}>
        <ThrowError shouldThrow />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom Error Title')).toBeInTheDocument();
    expect(screen.getByText('Custom error description')).toBeInTheDocument();
    expect(screen.getByText('Retry Button')).toBeInTheDocument();
    expect(screen.getByText('Home Button')).toBeInTheDocument();
  });

  it('should render custom fallback when provided', () => {
    render(
      <ErrorBoundary fallback={<div>Custom fallback</div>}>
        <ThrowError shouldThrow />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom fallback')).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });

  it('should call onError callback when error occurs', () => {
    const onError = vi.fn();

    render(
      <ErrorBoundary onError={onError}>
        <ThrowError shouldThrow />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Test error' }),
      expect.objectContaining({ componentStack: expect.any(String) })
    );
  });

  it('should reset error state when retry button is clicked', () => {
    const onReset = vi.fn();
    let shouldThrow = true;

    const { rerender } = render(
      <ErrorBoundary onReset={onReset}>
        <ThrowError shouldThrow={shouldThrow} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    // Set shouldThrow to false before clicking retry
    shouldThrow = false;

    // Click retry button
    fireEvent.click(screen.getByText('Try again'));

    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('should show error details in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    (process.env as Record<string, string | undefined>).NODE_ENV = 'development';

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow />
      </ErrorBoundary>
    );

    expect(screen.getByText('Error details')).toBeInTheDocument();

    (process.env as Record<string, string | undefined>).NODE_ENV = originalEnv;
  });

  it('should not show error details in production mode', () => {
    const originalEnv = process.env.NODE_ENV;
    (process.env as Record<string, string | undefined>).NODE_ENV = 'production';

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow />
      </ErrorBoundary>
    );

    expect(screen.queryByText('Error details')).not.toBeInTheDocument();

    (process.env as Record<string, string | undefined>).NODE_ENV = originalEnv;
  });
});

describe('WithErrorBoundary', () => {
  beforeEach(() => {
    console.error = vi.fn();
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  it('should render children when there is no error', () => {
    render(
      <WithErrorBoundary>
        <div>Test content</div>
      </WithErrorBoundary>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('should render error UI when child throws', () => {
    render(
      <WithErrorBoundary>
        <ThrowError shouldThrow />
      </WithErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('should pass translations to ErrorBoundary', () => {
    const translations = {
      title: 'Wrapper Error',
      description: 'Wrapper description',
      retry: 'Wrapper Retry',
      goHome: 'Wrapper Home',
    };

    render(
      <WithErrorBoundary translations={translations}>
        <ThrowError shouldThrow />
      </WithErrorBoundary>
    );

    expect(screen.getByText('Wrapper Error')).toBeInTheDocument();
    expect(screen.getByText('Wrapper description')).toBeInTheDocument();
  });
});
