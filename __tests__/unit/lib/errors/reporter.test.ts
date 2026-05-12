import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  captureException,
  captureMessage,
  getErrorReporter,
  setErrorReporter,
  type ErrorReporter,
} from '@/lib/errors/reporter';

describe('error reporter', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let defaultReporter: ErrorReporter;

  beforeEach(() => {
    defaultReporter = getErrorReporter();
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    setErrorReporter(defaultReporter);
    logSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  describe('default console reporter', () => {
    it('captureException serializes an Error with its stack', () => {
      const err = new Error('boom');
      captureException(err, { user_id: 'u1', route: '/api/x' });
      expect(errorSpy).toHaveBeenCalledTimes(1);
      const payload = JSON.parse(errorSpy.mock.calls[0][0] as string);
      expect(payload.level).toBe('error');
      expect(payload.message).toBe('boom');
      expect(payload.stack).toContain('Error: boom');
      expect(payload.context).toEqual({ user_id: 'u1', route: '/api/x' });
      expect(typeof payload.ts).toBe('string');
    });

    it('captureException handles a non-Error value', () => {
      captureException('plain string failure');
      const payload = JSON.parse(errorSpy.mock.calls[0][0] as string);
      expect(payload.message).toBe('plain string failure');
      expect(payload.stack).toBeUndefined();
    });

    it.each([
      ['info', 'log'],
      ['warning', 'warn'],
      ['error', 'error'],
    ] as const)('captureMessage routes %s level to console.%s', (level, consoleFn) => {
      captureMessage('hello', level, { tags: { source: 'unit' } });
      const target = { log: logSpy, warn: warnSpy, error: errorSpy }[consoleFn];
      expect(target).toHaveBeenCalledTimes(1);
      const payload = JSON.parse(target.mock.calls[0][0] as string);
      expect(payload.level).toBe(level);
      expect(payload.message).toBe('hello');
      expect(payload.context).toEqual({ tags: { source: 'unit' } });
    });

    it('captureMessage defaults to error level', () => {
      captureMessage('default level');
      expect(errorSpy).toHaveBeenCalledTimes(1);
      const payload = JSON.parse(errorSpy.mock.calls[0][0] as string);
      expect(payload.level).toBe('error');
    });
  });

  describe('custom reporter', () => {
    it('setErrorReporter swaps the implementation', () => {
      const captured: unknown[] = [];
      const custom: ErrorReporter = {
        captureException: (err, ctx) => captured.push({ type: 'exc', err, ctx }),
        captureMessage: (msg, level, ctx) =>
          captured.push({ type: 'msg', msg, level, ctx }),
      };
      setErrorReporter(custom);

      const error = new Error('boom');
      captureException(error, { user_id: 'u' });
      captureMessage('hi', 'info');

      expect(captured).toHaveLength(2);
      expect(captured[0]).toEqual({ type: 'exc', err: error, ctx: { user_id: 'u' } });
      expect(captured[1]).toEqual({
        type: 'msg',
        msg: 'hi',
        level: 'info',
        ctx: undefined,
      });
      // Console reporter must NOT have been called.
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it('getErrorReporter returns the currently active reporter', () => {
      const reporter: ErrorReporter = {
        captureException: vi.fn(),
        captureMessage: vi.fn(),
      };
      setErrorReporter(reporter);
      expect(getErrorReporter()).toBe(reporter);
    });
  });
});
