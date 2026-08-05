import { describe, expect, it } from 'vitest';
import { resolveModalKeyboardAvoidance } from './modal-keyboard-metrics';

describe('resolveModalKeyboardAvoidance', () => {
  it('exposes Android lift/inset styles when the keyboard is open', () => {
    const result = resolveModalKeyboardAvoidance('android', 320);
    expect(result.behavior).toBeUndefined();
    expect(result.liftStyle).toEqual({ marginBottom: 320 });
    expect(result.insetStyle).toEqual({ paddingBottom: 320 });
  });

  it('uses iOS KeyboardAvoidingView padding without Android lift styles', () => {
    const result = resolveModalKeyboardAvoidance('ios', 280);
    expect(result.behavior).toBe('padding');
    expect(result.liftStyle).toBeUndefined();
    expect(result.insetStyle).toBeUndefined();
  });

  it('stays inert on web', () => {
    const result = resolveModalKeyboardAvoidance('web', 200);
    expect(result.behavior).toBeUndefined();
    expect(result.liftStyle).toBeUndefined();
    expect(result.insetStyle).toBeUndefined();
  });
});
