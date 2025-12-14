import { describe, it, expect } from 'vitest';
import {
  ZAPIER_EVENTS,
  ZapierEventType,
  getEventName,
  getEventDescription,
  getAllEvents,
} from '@/lib/zapier/events';

describe('Zapier Events', () => {
  describe('ZAPIER_EVENTS', () => {
    it('should have all expected event types', () => {
      expect(ZAPIER_EVENTS.LINK_CREATED).toBe('LINK_CREATED');
      expect(ZAPIER_EVENTS.LINK_CLICKED).toBe('LINK_CLICKED');
      expect(ZAPIER_EVENTS.LINK_EXPIRED).toBe('LINK_EXPIRED');
      expect(ZAPIER_EVENTS.LINK_DELETED).toBe('LINK_DELETED');
      expect(ZAPIER_EVENTS.BIO_PAGE_CREATED).toBe('BIO_PAGE_CREATED');
      expect(ZAPIER_EVENTS.BIO_PAGE_UPDATED).toBe('BIO_PAGE_UPDATED');
    });

    it('should have 6 event types', () => {
      expect(Object.keys(ZAPIER_EVENTS)).toHaveLength(6);
    });
  });

  describe('getEventName', () => {
    it('should return correct names for all events', () => {
      expect(getEventName('LINK_CREATED')).toBe('Link Created');
      expect(getEventName('LINK_CLICKED')).toBe('Link Clicked');
      expect(getEventName('LINK_EXPIRED')).toBe('Link Expired');
      expect(getEventName('LINK_DELETED')).toBe('Link Deleted');
      expect(getEventName('BIO_PAGE_CREATED')).toBe('Bio Page Created');
      expect(getEventName('BIO_PAGE_UPDATED')).toBe('Bio Page Updated');
    });
  });

  describe('getEventDescription', () => {
    it('should return descriptions for all events', () => {
      expect(getEventDescription('LINK_CREATED')).toContain('new short link');
      expect(getEventDescription('LINK_CLICKED')).toContain('click');
      expect(getEventDescription('LINK_EXPIRED')).toContain('expires');
      expect(getEventDescription('LINK_DELETED')).toContain('deleted');
      expect(getEventDescription('BIO_PAGE_CREATED')).toContain('bio page');
      expect(getEventDescription('BIO_PAGE_UPDATED')).toContain('updated');
    });

    it('should return trigger descriptions', () => {
      const events: ZapierEventType[] = [
        'LINK_CREATED',
        'LINK_CLICKED',
        'LINK_EXPIRED',
        'LINK_DELETED',
        'BIO_PAGE_CREATED',
        'BIO_PAGE_UPDATED',
      ];

      events.forEach((event) => {
        expect(getEventDescription(event)).toContain('Trigger');
      });
    });
  });

  describe('getAllEvents', () => {
    it('should return all events with metadata', () => {
      const events = getAllEvents();

      expect(events).toHaveLength(6);

      events.forEach((event) => {
        expect(event).toHaveProperty('key');
        expect(event).toHaveProperty('name');
        expect(event).toHaveProperty('description');
        expect(typeof event.key).toBe('string');
        expect(typeof event.name).toBe('string');
        expect(typeof event.description).toBe('string');
      });
    });

    it('should include all event keys', () => {
      const events = getAllEvents();
      const keys = events.map((e) => e.key);

      expect(keys).toContain('LINK_CREATED');
      expect(keys).toContain('LINK_CLICKED');
      expect(keys).toContain('LINK_EXPIRED');
      expect(keys).toContain('LINK_DELETED');
      expect(keys).toContain('BIO_PAGE_CREATED');
      expect(keys).toContain('BIO_PAGE_UPDATED');
    });
  });
});
