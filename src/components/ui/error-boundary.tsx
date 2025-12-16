'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from './button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './card';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onReset?: () => void;
  translations?: {
    title: string;
    description: string;
    retry: string;
    goHome: string;
  };
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

const defaultTranslations = {
  title: 'Something went wrong',
  description: 'An unexpected error occurred. Please try again.',
  retry: 'Try again',
  goHome: 'Go to homepage',
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  handleGoHome = (): void => {
    window.location.href = '/';
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const t = this.props.translations || defaultTranslations;

      return (
        <Card className="w-full max-w-md mx-auto my-8">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle>{t.title}</CardTitle>
            <CardDescription>{t.description}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button onClick={this.handleReset} className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              {t.retry}
            </Button>
            <Button variant="outline" onClick={this.handleGoHome} className="w-full">
              <Home className="mr-2 h-4 w-4" />
              {t.goHome}
            </Button>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4 text-sm text-muted-foreground">
                <summary className="cursor-pointer">Error details</summary>
                <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-40">
                  {this.state.error.message}
                  {'\n\n'}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

// Hook-based wrapper for easy translation integration
interface WithErrorBoundaryProps {
  children: ReactNode;
  translations?: ErrorBoundaryProps['translations'];
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onReset?: () => void;
}

export function WithErrorBoundary({
  children,
  translations,
  fallback,
  onError,
  onReset,
}: WithErrorBoundaryProps) {
  return (
    <ErrorBoundary
      translations={translations}
      fallback={fallback}
      onError={onError}
      onReset={onReset}
    >
      {children}
    </ErrorBoundary>
  );
}
