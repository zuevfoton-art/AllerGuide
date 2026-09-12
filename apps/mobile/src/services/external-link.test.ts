import { beforeEach, describe, expect, it, vi } from 'vitest';

const openURL = vi.fn((_url: string) => Promise.resolve(true));

vi.mock('react-native', () => ({
  Linking: {
    openURL: (url: string) => openURL(url),
  },
}));

vi.mock('@/src/services/error-reporting', () => ({
  logCaughtError: vi.fn(),
}));

// eslint-disable-next-line import/first
import { isAllowedExternalUrl, openExternalUrl } from './external-link';

beforeEach(() => {
  openURL.mockClear();
});

describe('openExternalUrl', () => {
  it('opens ordinary web pages', async () => {
    await expect(openExternalUrl('https://market.example/offer/1')).resolves.toBe(true);
    expect(openURL).toHaveBeenCalledWith('https://market.example/offer/1');
  });

  it.each([
    'javascript:alert(1)',
    'JavaScript:alert(1)',
    'vbscript:msgbox(1)',
    'data:text/html,<script>alert(1)</script>',
    'intent://scan/#Intent;scheme=zxing;end',
    'market://details?id=com.evil.app',
    'file:///etc/passwd',
    'not a url',
    '',
  ])('refuses %s without calling the OS handler', async (url) => {
    await expect(openExternalUrl(url)).resolves.toBe(false);
    expect(openURL).not.toHaveBeenCalled();
  });

  it('ignores surrounding whitespace when validating and opening', async () => {
    await expect(openExternalUrl('  https://market.example/offer/1  ')).resolves.toBe(true);
    expect(openURL).toHaveBeenCalledWith('https://market.example/offer/1');
  });

  it('reports false when the platform rejects the URL', async () => {
    openURL.mockRejectedValueOnce(new Error('no activity found'));
    await expect(openExternalUrl('https://market.example/offer/1')).resolves.toBe(false);
  });

  it('classifies schemes independently of opening', () => {
    expect(isAllowedExternalUrl('http://partner.example')).toBe(true);
    expect(isAllowedExternalUrl('tel:+79990000000')).toBe(false);
  });
});
