import { afterEach, describe, expect, it, vi } from 'vitest';

describe('useKeyboardBottomInset module', () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock('react-native');
  });

  it('exports the keyboard inset hook', async () => {
    vi.doMock('react-native', () => ({
      Platform: { OS: 'android' },
      Keyboard: { addListener: vi.fn(() => ({ remove: vi.fn() })) },
    }));
    const mod = await import('./use-keyboard-bottom-inset');
    expect(typeof mod.useKeyboardBottomInset).toBe('function');
  });
});
