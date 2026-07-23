import { describe, expect, it } from 'vitest';
import {
  appendTranscript,
  applyVoiceParseToAnswers,
  parseVoiceDiaryUtterance,
  resolveSpeechLocale,
} from './voice-diary';

describe('voice-diary', () => {
  it('appends transcript with a line break', () => {
    expect(appendTranscript('', 'зуд')).toBe('зуд');
    expect(appendTranscript('кашель', 'зуд')).toBe('кашель\nзуд');
  });

  it('maps locales to BCP-47 speech tags', () => {
    expect(resolveSpeechLocale('ru')).toBe('ru-RU');
    expect(resolveSpeechLocale('en-US')).toBe('en-US');
    expect(resolveSpeechLocale('de')).toBe('de-DE');
  });

  it('parses symptom severity onset and area from utterance', () => {
    const parsed = parseVoiceDiaryUtterance(
      'Сегодня утром сильный зуд кожи и крапивница',
    );
    expect(parsed.symptoms).toContain('зуд');
    expect(parsed.symptomCode).toBeTruthy();
    expect(parsed.severity0_3).toBe('3 — сильная');
    expect(parsed.onset).toBe('сегодня утром');
    expect(parsed.symptomAreas).toBe('Кожа');
  });

  it('detects mild cough and breath area', () => {
    const parsed = parseVoiceDiaryUtterance('Лёгкий кашель, начался час назад');
    expect(parsed.severity0_3).toBe('1 — лёгкая');
    expect(parsed.onset).toBe('около часа назад');
    expect(parsed.symptomAreas).toBe('Дыхание');
    expect(parsed.symptomCode).toMatch(/Кашель|Одышка/);
  });

  it('applies parse into empty structured symptom answers', () => {
    const parsed = parseVoiceDiaryUtterance('Умеренный насморк и чихание с вечера вчера');
    const next = applyVoiceParseToAnswers({}, parsed, {
      sectionType: 'Симптомы',
      targetStepId: 'symptoms',
    });
    expect(next.symptoms).toContain('насморк');
    expect(next.severity0_3).toBe('2 — умеренная');
    expect(next.symptomCode).toBeTruthy();
    expect(next.onset).toBeTruthy();
  });

  it('does not overwrite existing structured fields', () => {
    const parsed = parseVoiceDiaryUtterance('Сильный зуд');
    const next = applyVoiceParseToAnswers(
      { severity0_3: '1 — лёгкая', symptomCode: 'Кашель' },
      parsed,
      { sectionType: 'Симптомы', targetStepId: 'symptoms' },
    );
    expect(next.severity0_3).toBe('1 — лёгкая');
    expect(next.symptomCode).toBe('Кашель');
    expect(next.symptoms).toContain('зуд');
  });
});
