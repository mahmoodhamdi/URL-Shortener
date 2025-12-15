/**
 * Firebase Cloud Messaging Service Worker
 *
 * Handles background push notifications when the app is not in focus.
 * This file must be in the public directory to be served at the root.
 */

/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Firebase configuration - will be populated from environment
// In production, you may want to inline these values or fetch from an endpoint
const firebaseConfig = {
  apiKey: self.FIREBASE_API_KEY || '',
  authDomain: self.FIREBASE_AUTH_DOMAIN || '',
  projectId: self.FIREBASE_PROJECT_ID || '',
  storageBucket: self.FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: self.FIREBASE_MESSAGING_SENDER_ID || '',
  appId: self.FIREBASE_APP_ID || '',
};

// Initialize Firebase only if configured
if (firebaseConfig.apiKey && firebaseConfig.projectId) {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  // Handle background messages
  messaging.onBackgroundMessage((payload) => {
    console.log('[Firebase SW] Received background message:', payload);

    const notificationTitle = payload.notification?.title || 'New Notification';
    const notificationOptions = {
      body: payload.notification?.body || '',
      icon: payload.notification?.icon || '/icon-192x192.png',
      badge: '/badge-72x72.png',
      tag: payload.data?.type || 'default',
      data: payload.data || {},
      actions: getNotificationActions(payload.data?.type),
      requireInteraction: shouldRequireInteraction(payload.data?.type),
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
}

/**
 * Get notification actions based on type
 */
function getNotificationActions(type) {
  switch (type) {
    case 'link_milestone':
    case 'link_click':
      return [
        { action: 'view_stats', title: 'View Stats' },
        { action: 'dismiss', title: 'Dismiss' },
      ];
    case 'workspace_invitation':
      return [
        { action: 'accept', title: 'Accept' },
        { action: 'decline', title: 'Decline' },
      ];
    case 'subscription_alert':
      return [
        { action: 'view_billing', title: 'View Billing' },
        { action: 'dismiss', title: 'Dismiss' },
      ];
    case 'ab_test_complete':
      return [
        { action: 'view_results', title: 'View Results' },
        { action: 'dismiss', title: 'Dismiss' },
      ];
    default:
      return [];
  }
}

/**
 * Determine if notification should require interaction
 */
function shouldRequireInteraction(type) {
  const importantTypes = ['subscription_alert', 'workspace_invitation'];
  return importantTypes.includes(type);
}

/**
 * Handle notification click
 */
self.addEventListener('notificationclick', (event) => {
  console.log('[Firebase SW] Notification clicked:', event);

  event.notification.close();

  const data = event.notification.data || {};
  let url = '/dashboard';

  // Determine URL based on notification type and action
  if (event.action === 'view_stats' && data.shortCode) {
    url = `/dashboard/links/${data.shortCode}/stats`;
  } else if (event.action === 'view_billing') {
    url = '/settings/billing';
  } else if (event.action === 'view_results') {
    url = '/dashboard/ab-tests';
  } else if (event.action === 'accept' && data.invitationToken) {
    url = `/invitations/${data.invitationToken}`;
  } else if (data.type === 'link_milestone' || data.type === 'link_click') {
    url = `/dashboard/links/${data.shortCode}/stats`;
  } else if (data.type === 'workspace_invitation' && data.invitationToken) {
    url = `/invitations/${data.invitationToken}`;
  } else if (data.type === 'subscription_alert') {
    url = '/settings/billing';
  } else if (data.type === 'ab_test_complete') {
    url = '/dashboard/ab-tests';
  }

  // Open or focus the window
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Try to focus an existing window
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // Open a new window if none exists
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

/**
 * Handle service worker installation
 */
self.addEventListener('install', (event) => {
  console.log('[Firebase SW] Installing...');
  self.skipWaiting();
});

/**
 * Handle service worker activation
 */
self.addEventListener('activate', (event) => {
  console.log('[Firebase SW] Activating...');
  event.waitUntil(clients.claim());
});
