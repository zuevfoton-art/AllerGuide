import { describe, expect, it, vi } from 'vitest';
import { authEmailInputProps, authLoginInputProps, authPasswordInputProps } from './auth-input-props';

vi.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

describe('auth input autofill props', () => {
  it('marks email fields for managers and disables autocorrect', () => {
    expect(authEmailInputProps()).toMatchObject({
      keyboardType: 'email-address',
      autoCorrect: false,
      textContentType: 'emailAddress',
      autoComplete: 'email',
    });
  });

  it('uses current vs new password tokens', () => {
    expect(authPasswordInputProps('current').textContentType).toBe('password');
    expect(authPasswordInputProps('current').autoComplete).toBe('password');
    expect(authPasswordInputProps('new').textContentType).toBe('newPassword');
    expect(authPasswordInputProps('new').autoComplete).toBe('new-password');
  });

  it('marks the unified login field as a username for password managers', () => {
    expect(authLoginInputProps('unknown')).toMatchObject({
      keyboardType: 'email-address',
      textContentType: 'username',
      autoComplete: 'username',
    });
    expect(authLoginInputProps('phone')).toMatchObject({
      keyboardType: 'phone-pad',
      textContentType: 'username',
      autoComplete: 'username',
    });
  });
});
