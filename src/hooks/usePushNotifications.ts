'use client';

/**
 * Push Notifications Hook
 *
 * Provides push notification functionality for React components.
 * Handles FCM token registration and foreground message handling.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  initializePushNotifications,
  onForegroundMessage,
  isFirebaseClientConfigured,
} from '@/lib/firebase/client';

interface PushNotificationState {
  isSupported: boolean;
  isEnabled: boolean;
  isLoading: boolean;
  token: string | null;
  error: string | null;
}

interface NotificationMessage {
  title?: string;
  body?: string;
  data?: Record<string, string>;
}

interface UsePushNotificationsOptions {
  onMessage?: (message: NotificationMessage) => void;
  autoInitialize?: boolean;
}

/**
 * Hook for push notifications
 */
export function usePushNotifications(options: UsePushNotificationsOptions = {}) {
  const { onMessage, autoInitialize = false } = options;

  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    isEnabled: false,
    isLoading: false,
    token: null,
    error: null,
  });

  // Check support on mount
  useEffect(() => {
    const checkSupport = () => {
      const supported =
        typeof window !== 'undefined' &&
        'Notification' in window &&
        'serviceWorker' in navigator &&
        isFirebaseClientConfigured();

      setState((s) => ({
        ...s,
        isSupported: supported,
        isEnabled: supported && Notification.permission === 'granted',
      }));
    };

    checkSupport();
  }, []);

  // Set up foreground message handler
  useEffect(() => {
    if (!state.isEnabled || !onMessage) return;

    const unsubscribe = onForegroundMessage((payload) => {
      onMessage(payload);
    });

    return () => {
      unsubscribe?.();
    };
  }, [state.isEnabled, onMessage]);

  // Auto-initialize if enabled and permission already granted
  useEffect(() => {
    if (autoInitialize && state.isSupported && Notification.permission === 'granted') {
      enableNotifications();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoInitialize, state.isSupported]);

  /**
   * Enable push notifications
   * Requests permission and registers FCM token
   */
  const enableNotifications = useCallback(async (): Promise<{
    success: boolean;
    error?: string;
  }> => {
    if (!state.isSupported) {
      return { success: false, error: 'Push notifications not supported' };
    }

    setState((s) => ({ ...s, isLoading: true, error: null }));

    try {
      const result = await initializePushNotifications();

      if (result.success && result.token) {
        setState((s) => ({
          ...s,
          isEnabled: true,
          isLoading: false,
          token: result.token!,
          error: null,
        }));
        return { success: true };
      } else {
        setState((s) => ({
          ...s,
          isEnabled: false,
          isLoading: false,
          error: result.error || 'Failed to enable notifications',
        }));
        return { success: false, error: result.error };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState((s) => ({
        ...s,
        isLoading: false,
        error: errorMessage,
      }));
      return { success: false, error: errorMessage };
    }
  }, [state.isSupported]);

  /**
   * Check current notification permission status
   */
  const checkPermission = useCallback((): NotificationPermission | 'unsupported' => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }
    return Notification.permission;
  }, []);

  return {
    isSupported: state.isSupported,
    isEnabled: state.isEnabled,
    isLoading: state.isLoading,
    token: state.token,
    error: state.error,
    enableNotifications,
    checkPermission,
    clearError: () => setState((s) => ({ ...s, error: null })),
  };
}
