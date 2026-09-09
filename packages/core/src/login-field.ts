import { validateLogin, type LoginType } from './auth';
import {
  DEFAULT_PHONE_COUNTRY_ISO2,
  digitsOnly,
  formatNationalNumber,
  getPhoneCountry,
  parsePhone,
  toE164,
  validatePhone,
} from './phone';

export type LoginFieldKind = 'phone' | 'email' | 'unknown';

export interface LoginFieldState {
  kind: LoginFieldKind;
  display: string;
  canonical: string;
  loginType: LoginType;
  countryIso2: string;
}

const MIN_PHONE_DIGIT_COUNT = 3;
const PHONE_LIKE_RE = /^[\d\s()+-]+$/;

export function detectLoginFieldKind(raw: string): LoginFieldKind {
  const trimmed = raw.trim();
  if (trimmed.includes('@')) return 'email';
  if (!trimmed) return 'unknown';
  if (PHONE_LIKE_RE.test(trimmed) && digitsOnly(trimmed).length >= MIN_PHONE_DIGIT_COUNT) {
    return 'phone';
  }
  return 'email';
}

export function applyLoginFieldInput(
  raw: string,
  countryIso2: string = DEFAULT_PHONE_COUNTRY_ISO2,
): LoginFieldState {
  const kind = detectLoginFieldKind(raw);

  if (kind === 'phone') {
    const parsed = parsePhone(raw, countryIso2);
    return {
      kind,
      display: formatNationalNumber(parsed.nationalDigits, parsed.countryIso2),
      canonical: parsed.e164,
      loginType: 'phone',
      countryIso2: parsed.countryIso2,
    };
  }

  const canonical = raw.trim();
  return {
    kind,
    display: raw,
    canonical,
    loginType: 'email',
    countryIso2,
  };
}

export function applyLoginFieldCountry(state: LoginFieldState, nextIso2: string): LoginFieldState {
  const country = getPhoneCountry(nextIso2);
  const parsed = parsePhone(state.canonical || state.display, state.countryIso2);
  const nationalDigits = parsed.nationalDigits.slice(0, country.nationalMax);

  return {
    kind: 'phone',
    display: formatNationalNumber(nationalDigits, country.iso2),
    canonical: toE164(country.dialCode, nationalDigits),
    loginType: 'phone',
    countryIso2: country.iso2,
  };
}

export function validateLoginField(raw: string): string | null {
  if (!raw.trim()) return 'Введите телефон или email.';
  const kind = detectLoginFieldKind(raw);
  if (kind === 'phone') return validatePhone(raw);
  return validateLogin('email', raw);
}
