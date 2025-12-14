/**
 * Webhook Event Definitions
 */

export type WebhookEvent =
  | 'link.created'
  | 'link.updated'
  | 'link.deleted'
  | 'link.clicked'
  | 'link.expired';

export const WEBHOOK_EVENTS: { event: WebhookEvent; description: string }[] = [
  { event: 'link.created', description: 'Triggered when a new link is created' },
  { event: 'link.updated', description: 'Triggered when a link is updated' },
  { event: 'link.deleted', description: 'Triggered when a link is deleted' },
  { event: 'link.clicked', description: 'Triggered when a link is clicked' },
  { event: 'link.expired', description: 'Triggered when a link expires' },
];

export const ALL_WEBHOOK_EVENTS: WebhookEvent[] = WEBHOOK_EVENTS.map(e => e.event);

export function isValidWebhookEvent(event: string): event is WebhookEvent {
  return ALL_WEBHOOK_EVENTS.includes(event as WebhookEvent);
}

export function getEventDescription(event: WebhookEvent): string {
  const found = WEBHOOK_EVENTS.find(e => e.event === event);
  return found?.description || '';
}

export interface WebhookPayload<T = unknown> {
  id: string;
  event: WebhookEvent;
  timestamp: string;
  data: T;
}

export interface LinkCreatedPayload {
  link: {
    id: string;
    shortCode: string;
    originalUrl: string;
    customAlias: string | null;
    createdAt: string;
  };
}

export interface LinkUpdatedPayload {
  link: {
    id: string;
    shortCode: string;
    originalUrl: string;
    customAlias: string | null;
    updatedAt: string;
  };
  changes: Record<string, { old: unknown; new: unknown }>;
}

export interface LinkDeletedPayload {
  linkId: string;
  shortCode: string;
  deletedAt: string;
}

export interface LinkClickedPayload {
  link: {
    id: string;
    shortCode: string;
    originalUrl: string;
  };
  click: {
    id: string;
    ip: string | null;
    country: string | null;
    device: string | null;
    browser: string | null;
    referrer: string | null;
    clickedAt: string;
  };
}

export interface LinkExpiredPayload {
  link: {
    id: string;
    shortCode: string;
    originalUrl: string;
    expiresAt: string;
  };
}
