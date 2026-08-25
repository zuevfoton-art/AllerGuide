import { describe, expect, it } from 'vitest';
import { resolveMarketplaceWriteStatus } from './market-catalog-store';

describe('resolveMarketplaceWriteStatus', () => {
  it('keeps an already published row published on feed refresh', () => {
    expect(resolveMarketplaceWriteStatus('published', false)).toBe('published');
  });

  it('imports new feed rows as draft', () => {
    expect(resolveMarketplaceWriteStatus(undefined, false)).toBe('draft');
    expect(resolveMarketplaceWriteStatus('draft', false)).toBe('draft');
  });

  it('publishes bundled seed rows even when they were drafts', () => {
    expect(resolveMarketplaceWriteStatus(undefined, true)).toBe('published');
    expect(resolveMarketplaceWriteStatus('draft', true)).toBe('published');
  });
});
