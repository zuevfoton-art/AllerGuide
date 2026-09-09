import type { TextInputProps } from 'react-native';

type AuthInputProps = Pick<
  TextInputProps,
  'autoCapitalize' | 'autoComplete' | 'autoCorrect' | 'keyboardType' | 'textContentType'
>;

export function authEmailInputProps(): AuthInputProps {
  return {
    keyboardType: 'email-address',
    autoCapitalize: 'none',
    autoCorrect: false,
    textContentType: 'emailAddress',
    autoComplete: 'email',
  };
}

export function authPasswordInputProps(mode: 'current' | 'new'): AuthInputProps {
  if (mode === 'new') {
    return {
      autoCapitalize: 'none',
      autoCorrect: false,
      textContentType: 'newPassword',
      autoComplete: 'new-password',
    };
  }
  return {
    autoCapitalize: 'none',
    autoCorrect: false,
    textContentType: 'password',
    autoComplete: 'password',
  };
}

export function authLoginInputProps(kind: 'phone' | 'email' | 'unknown'): AuthInputProps {
  return {
    keyboardType: kind === 'phone' ? 'phone-pad' : 'email-address',
    autoCapitalize: 'none',
    autoCorrect: false,
    textContentType: 'username',
    autoComplete: 'username',
  };
}
