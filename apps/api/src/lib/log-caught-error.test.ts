import { describe, expect, it, vi } from 'vitest';
import { logCaughtError, toError } from './log-caught-error';

describe('log-caught-error', () => {
  it('normalizes unknown values to Error', () => {
    expect(toError('offline').message).toBe('offline');
    expect(toError(new Error('boom')).message).toBe('boom');
  });

  it('logs to console.error with context', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const error = new Error('redis down');

    logCaughtError('redis.connect', error, { url: 'redis://test' });

    expect(spy).toHaveBeenCalledWith('[api] redis.connect', error, { url: 'redis://test' });
    spy.mockRestore();
  });
});
