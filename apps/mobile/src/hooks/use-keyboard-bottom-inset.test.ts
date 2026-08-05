import { afterEach, describe, expect, it, vi } from 'vitest';

describe('resolveKeyboardAvoidingBehavior', () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock('react-native');
  });

  it('uses padding on Android so Modal/Screen inputs clear the IME', async () => {
    vi.doMock('react-native', () => ({
      Platform: { OS: 'android' },
      Keyboard: { addListener: vi.fn() },
    }));
    const { resolveKeyboardAvoidingBehavior } = await import('./use-keyboard-bottom-inset');
    expect(resolveKeyboardAvoidingBehavior()).toBe('padding');
  });

  it('uses padding on iOS', async () => {
    vi.doMock('react-native', () => ({
      Platform: { OS: 'ios' },
      Keyboard: { addListener: vi.fn() },
    }));
    const { resolveKeyboardAvoidingBehavior } = await import('./use-keyboard-bottom-inset');
    expect(resolveKeyboardAvoidingBehavior()).toBe('padding');
  });

  it('disables KeyboardAvoidingView on web', async () => {
    vi.doMock('react-native', () => ({
      Platform: { OS: 'web' },
      Keyboard: { addListener: vi.fn() },
    }));
    const { resolveKeyboardAvoidingBehavior } = await import('./use-keyboard-bottom-inset');
    expect(resolveKeyboardAvoidingBehavior()).toBeUndefined();
  });
});
