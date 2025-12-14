import { describe, it, expect } from 'vitest';
import {
  WEBHOOK_EVENTS,
  ALL_WEBHOOK_EVENTS,
  isValidWebhookEvent,
  getEventDescription,
} from '@/lib/webhooks/events';

describe('Webhook Events', () => {
  describe('WEBHOOK_EVENTS', () => {
    it('should contain all required events', () => {
      const events = WEBHOOK_EVENTS.map(e => e.event);

      expect(events).toContain('link.created');
      expect(events).toContain('link.updated');
      expect(events).toContain('link.deleted');
      expect(events).toContain('link.clicked');
      expect(events).toContain('link.expired');
    });

    it('should have descriptions for all events', () => {
      WEBHOOK_EVENTS.forEach(e => {
        expect(e.description).toBeTruthy();
        expect(typeof e.description).toBe('string');
      });
    });
  });

  describe('ALL_WEBHOOK_EVENTS', () => {
    it('should be an array of event names', () => {
      expect(Array.isArray(ALL_WEBHOOK_EVENTS)).toBe(true);
      expect(ALL_WEBHOOK_EVENTS.length).toBe(WEBHOOK_EVENTS.length);

      ALL_WEBHOOK_EVENTS.forEach(event => {
        expect(typeof event).toBe('string');
      });
    });
  });

  describe('isValidWebhookEvent', () => {
    it('should return true for valid events', () => {
      expect(isValidWebhookEvent('link.created')).toBe(true);
      expect(isValidWebhookEvent('link.updated')).toBe(true);
      expect(isValidWebhookEvent('link.deleted')).toBe(true);
      expect(isValidWebhookEvent('link.clicked')).toBe(true);
      expect(isValidWebhookEvent('link.expired')).toBe(true);
    });

    it('should return false for invalid events', () => {
      expect(isValidWebhookEvent('invalid')).toBe(false);
      expect(isValidWebhookEvent('link.invalid')).toBe(false);
      expect(isValidWebhookEvent('')).toBe(false);
      expect(isValidWebhookEvent('LINK.CREATED')).toBe(false); // case sensitive
    });
  });

  describe('getEventDescription', () => {
    it('should return description for valid events', () => {
      const desc = getEventDescription('link.created');
      expect(desc).toContain('created');
    });

    it('should return empty string for invalid event', () => {
      // @ts-expect-error Testing invalid input
      const desc = getEventDescription('invalid');
      expect(desc).toBe('');
    });
  });
});
