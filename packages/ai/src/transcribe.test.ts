import { describe, expect, it } from 'vitest';
import { appendTranscript, resolveSpeechLocale, resolveWhisperLanguage } from './transcribe';

describe('appendTranscript', () => {
  it('returns transcript when existing is empty', () => {
    expect(appendTranscript('', '  Привет ')).toBe('Привет');
  });

  it('appends with newline when both present', () => {
    expect(appendTranscript('Утро', 'Вечер')).toBe('Утро\nВечер');
  });

  it('ignores empty transcript', () => {
    expect(appendTranscript('Текст', '   ')).toBe('Текст');
  });
});

describe('resolveSpeechLocale', () => {
  it('maps ru to ru-RU', () => {
    expect(resolveSpeechLocale('ru')).toBe('ru-RU');
  });
});

describe('resolveWhisperLanguage', () => {
  it('maps en to en', () => {
    expect(resolveWhisperLanguage('en')).toBe('en');
  });
});
