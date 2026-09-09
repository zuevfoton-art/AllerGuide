import { describe, expect, it } from 'vitest';
import {
  applyLoginFieldCountry,
  applyLoginFieldInput,
  detectLoginFieldKind,
  validateLoginField,
} from './login-field';

describe('detectLoginFieldKind', () => {
  it('treats @ as email even when the local part looks like a phone', () => {
    expect(detectLoginFieldKind('user@mail.ru')).toBe('email');
    expect(detectLoginFieldKind('89991234567@mail.ru')).toBe('email');
  });

  it('detects phone from digits, spaces, parentheses, hyphen and plus', () => {
    expect(detectLoginFieldKind('8 999 123-45-67')).toBe('phone');
    expect(detectLoginFieldKind('+49 170 1234567')).toBe('phone');
    expect(detectLoginFieldKind('(999) 123')).toBe('phone');
  });

  it('stays unknown when empty and email for other text', () => {
    expect(detectLoginFieldKind('')).toBe('unknown');
    expect(detectLoginFieldKind('   ')).toBe('unknown');
    expect(detectLoginFieldKind('abc')).toBe('email');
    expect(detectLoginFieldKind('12')).toBe('email');
  });
});

describe('applyLoginFieldInput', () => {
  it('formats a Russian national number to E.164', () => {
    const next = applyLoginFieldInput('8 999 123-45-67');
    expect(next.kind).toBe('phone');
    expect(next.loginType).toBe('phone');
    expect(next.countryIso2).toBe('RU');
    expect(next.canonical).toBe('+79991234567');
    expect(next.display).toBe('(999) 123-45-67');
  });

  it('detects Germany from an international prefix', () => {
    const next = applyLoginFieldInput('+49 170 1234567');
    expect(next.kind).toBe('phone');
    expect(next.countryIso2).toBe('DE');
    expect(next.canonical).toBe('+491701234567');
  });

  it('keeps email text as typed', () => {
    const next = applyLoginFieldInput('user@mail.ru');
    expect(next.kind).toBe('email');
    expect(next.loginType).toBe('email');
    expect(next.display).toBe('user@mail.ru');
    expect(next.canonical).toBe('user@mail.ru');
  });
});

describe('applyLoginFieldCountry', () => {
  it('keeps national digits when the country changes', () => {
    const state = applyLoginFieldInput('8 999 123-45-67');
    const next = applyLoginFieldCountry(state, 'DE');
    expect(next.countryIso2).toBe('DE');
    expect(next.canonical).toBe('+499991234567');
    expect(next.display).toBe('(999) 123-4567');
  });
});

describe('validateLoginField', () => {
  it('requires a non-empty identifier', () => {
    expect(validateLoginField('')).toBe('Введите телефон или email.');
    expect(validateLoginField('  ')).toBe('Введите телефон или email.');
  });

  it('validates phone and email with the existing rules', () => {
    expect(validateLoginField('+79991234567')).toBeNull();
    expect(validateLoginField('user@mail.ru')).toBeNull();
    expect(validateLoginField('abc')).toMatch(/email/);
    expect(validateLoginField('123')).toMatch(/телефон/);
  });
});
