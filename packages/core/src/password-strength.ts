import { isCommonPassword } from './common-passwords';

/** Minimum length for a newly chosen password (register / reset). */
export const MIN_NEW_PASSWORD_LENGTH = 8;

/** New passwords must include at least this many distinct character classes. */
export const REQUIRED_CHARACTER_CLASS_COUNT = 3;

const GOOD_PASSWORD_MIN_LENGTH = 12;
const STRONG_PASSWORD_MIN_LENGTH = 16;
const MIN_LOGIN_SUBSTRING_LENGTH = 4;
const ALL_CHARACTER_CLASS_COUNT = 4;

const LOWERCASE_RE = /\p{Ll}/u;
const UPPERCASE_RE = /\p{Lu}/u;
const DIGIT_RE = /\p{Nd}/u;
const SYMBOL_RE = /[^\p{L}\p{N}\s]/u;

export type PasswordCharacterClass = 'lowercase' | 'uppercase' | 'digit' | 'symbol';
export type PasswordRuleId = 'minLength' | 'characterClasses' | 'notCommon' | 'notLikeLogin';
export type PasswordStrengthLevel = 'weak' | 'fair' | 'good' | 'strong';

export interface PasswordStrength {
  level: PasswordStrengthLevel;
  satisfiedClasses: PasswordCharacterClass[];
  failedRules: PasswordRuleId[];
  meetsPolicy: boolean;
}

export interface PasswordStrengthOptions {
  login?: string;
}

const CHARACTER_CLASS_CHECKS: ReadonlyArray<{
  id: PasswordCharacterClass;
  pattern: RegExp;
}> = [
  { id: 'lowercase', pattern: LOWERCASE_RE },
  { id: 'uppercase', pattern: UPPERCASE_RE },
  { id: 'digit', pattern: DIGIT_RE },
  { id: 'symbol', pattern: SYMBOL_RE },
];

export function collectCharacterClasses(password: string): PasswordCharacterClass[] {
  return CHARACTER_CLASS_CHECKS.filter(({ pattern }) => pattern.test(password)).map(
    ({ id }) => id,
  );
}

function extractLoginNeedle(login: string): string {
  const trimmed = login.trim().toLowerCase();
  if (!trimmed) return '';
  if (!trimmed.includes('@')) return trimmed;
  return trimmed.slice(0, trimmed.indexOf('@'));
}

export function isPasswordLikeLogin(password: string, login?: string): boolean {
  if (!login) return false;
  const passwordLower = password.toLowerCase();
  const loginLower = login.trim().toLowerCase();
  if (!loginLower) return false;
  if (passwordLower === loginLower) return true;

  const needle = extractLoginNeedle(loginLower);
  return needle.length >= MIN_LOGIN_SUBSTRING_LENGTH && passwordLower.includes(needle);
}

function resolveStrengthLevel(
  password: string,
  satisfiedClassCount: number,
  meetsPolicy: boolean,
): PasswordStrengthLevel {
  if (!meetsPolicy) return 'weak';

  const hasAllClasses = satisfiedClassCount === ALL_CHARACTER_CLASS_COUNT;
  const isLongEnoughForGood = password.length >= GOOD_PASSWORD_MIN_LENGTH;
  const isLongEnoughForStrong = password.length >= STRONG_PASSWORD_MIN_LENGTH;

  if ((hasAllClasses && isLongEnoughForGood) || isLongEnoughForStrong) {
    return 'strong';
  }
  if (hasAllClasses || isLongEnoughForGood) {
    return 'good';
  }
  return 'fair';
}

export function evaluatePasswordStrength(
  password: string,
  options?: PasswordStrengthOptions,
): PasswordStrength {
  const satisfiedClasses = collectCharacterClasses(password);
  const failedRules: PasswordRuleId[] = [];

  if (password.length < MIN_NEW_PASSWORD_LENGTH) {
    failedRules.push('minLength');
  }
  if (satisfiedClasses.length < REQUIRED_CHARACTER_CLASS_COUNT) {
    failedRules.push('characterClasses');
  }
  if (isCommonPassword(password)) {
    failedRules.push('notCommon');
  }
  if (isPasswordLikeLogin(password, options?.login)) {
    failedRules.push('notLikeLogin');
  }

  const meetsPolicy = failedRules.length === 0;
  return {
    level: resolveStrengthLevel(password, satisfiedClasses.length, meetsPolicy),
    satisfiedClasses,
    failedRules,
    meetsPolicy,
  };
}
