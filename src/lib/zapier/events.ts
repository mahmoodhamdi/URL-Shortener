/**
 * Zapier Integration - Event Types and Payloads
 */

// Zapier event types matching the Prisma enum
export const ZAPIER_EVENTS = {
  LINK_CREATED: 'LINK_CREATED',
  LINK_CLICKED: 'LINK_CLICKED',
  LINK_EXPIRED: 'LINK_EXPIRED',
  LINK_DELETED: 'LINK_DELETED',
  BIO_PAGE_CREATED: 'BIO_PAGE_CREATED',
  BIO_PAGE_UPDATED: 'BIO_PAGE_UPDATED',
} as const;

export type ZapierEventType = keyof typeof ZAPIER_EVENTS;

// Event payload types
export interface LinkCreatedPayload {
  id: string;
  shortCode: string;
  shortUrl: string;
  originalUrl: string;
  title: string | null;
  customAlias: string | null;
  createdAt: string;
  userId: string;
}

export interface LinkClickedPayload {
  linkId: string;
  shortCode: string;
  shortUrl: string;
  clickedAt: string;
  country: string | null;
  city: string | null;
  device: string | null;
  browser: string | null;
  os: string | null;
  referrer: string | null;
}

export interface LinkExpiredPayload {
  id: string;
  shortCode: string;
  shortUrl: string;
  originalUrl: string;
  expiredAt: string;
  userId: string;
}

export interface LinkDeletedPayload {
  id: string;
  shortCode: string;
  originalUrl: string;
  deletedAt: string;
  userId: string;
}

export interface BioPageCreatedPayload {
  id: string;
  slug: string;
  title: string;
  bio: string | null;
  url: string;
  createdAt: string;
  userId: string;
}

export interface BioPageUpdatedPayload {
  id: string;
  slug: string;
  title: string;
  bio: string | null;
  url: string;
  updatedAt: string;
  userId: string;
}

// Union type for all payloads
export type ZapierEventPayload =
  | LinkCreatedPayload
  | LinkClickedPayload
  | LinkExpiredPayload
  | LinkDeletedPayload
  | BioPageCreatedPayload
  | BioPageUpdatedPayload;

// Map event types to payload types
export interface ZapierEventPayloadMap {
  LINK_CREATED: LinkCreatedPayload;
  LINK_CLICKED: LinkClickedPayload;
  LINK_EXPIRED: LinkExpiredPayload;
  LINK_DELETED: LinkDeletedPayload;
  BIO_PAGE_CREATED: BioPageCreatedPayload;
  BIO_PAGE_UPDATED: BioPageUpdatedPayload;
}

/**
 * Get a human-readable event name
 */
export function getEventName(event: ZapierEventType): string {
  const names: Record<ZapierEventType, string> = {
    LINK_CREATED: 'Link Created',
    LINK_CLICKED: 'Link Clicked',
    LINK_EXPIRED: 'Link Expired',
    LINK_DELETED: 'Link Deleted',
    BIO_PAGE_CREATED: 'Bio Page Created',
    BIO_PAGE_UPDATED: 'Bio Page Updated',
  };
  return names[event];
}

/**
 * Get the event description
 */
export function getEventDescription(event: ZapierEventType): string {
  const descriptions: Record<ZapierEventType, string> = {
    LINK_CREATED: 'Triggers when a new short link is created',
    LINK_CLICKED: 'Triggers when a link receives a click',
    LINK_EXPIRED: 'Triggers when a link expires',
    LINK_DELETED: 'Triggers when a link is deleted',
    BIO_PAGE_CREATED: 'Triggers when a new bio page is created',
    BIO_PAGE_UPDATED: 'Triggers when a bio page is updated',
  };
  return descriptions[event];
}

/**
 * Get all available events with metadata
 */
export function getAllEvents(): Array<{
  key: ZapierEventType;
  name: string;
  description: string;
}> {
  return Object.keys(ZAPIER_EVENTS).map((key) => ({
    key: key as ZapierEventType,
    name: getEventName(key as ZapierEventType),
    description: getEventDescription(key as ZapierEventType),
  }));
}
