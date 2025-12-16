'use client';

import { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import type { ErrorInfo } from 'react';

interface ErrorBoundaryWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onReset?: () => void;
}

export function ErrorBoundaryWrapper({
  children,
  fallback,
  onError,
  onReset,
}: ErrorBoundaryWrapperProps) {
  const t = useTranslations('errors.boundary');

  const translations = {
    title: t('title'),
    description: t('description'),
    retry: t('retry'),
    goHome: t('goHome'),
  };

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
