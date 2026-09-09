import { describe, expect, it } from 'vitest';
import { ASK_ANSWER_MAX_LENGTH, buildAskChatPrompt, parseAskChatAnswer } from './ask-chat';

describe('buildAskChatPrompt', () => {
  it('carries the locale, the state lines and the question', () => {
    const prompt = buildAskChatPrompt({
      question: 'Можно гулять?',
      locale: 'ru',
      context: ['Пыльца: много', 'Воздух: умеренно'],
    });

    expect(prompt).toContain('Язык ответа: ru.');
    expect(prompt).toContain('Состояние сегодня: Пыльца: много; Воздух: умеренно');
    expect(prompt).toContain('Вопрос: Можно гулять?');
    expect(prompt).toContain('{"answer":"текст"}');
  });

  it('keeps history in order and omits the state line when there is none', () => {
    const prompt = buildAskChatPrompt({
      question: 'А сегодня?',
      locale: 'en',
      history: [
        { role: 'user', text: 'Was yesterday bad?' },
        { role: 'assistant', text: 'Pollen was high.' },
      ],
    });

    expect(prompt).not.toContain('Состояние сегодня');
    expect(prompt.indexOf('Was yesterday bad?')).toBeLessThan(prompt.indexOf('Pollen was high.'));
    expect(prompt.indexOf('Pollen was high.')).toBeLessThan(prompt.indexOf('Вопрос: А сегодня?'));
  });
});

describe('parseAskChatAnswer', () => {
  it('unwraps the JSON envelope, including fenced output', () => {
    expect(parseAskChatAnswer('{"answer":"Сегодня спокойно."}')).toBe('Сегодня спокойно.');
    expect(parseAskChatAnswer('```json\n{"answer":"Ок."}\n```')).toBe('Ок.');
  });

  it('accepts plain prose from a provider that ignored the envelope', () => {
    expect(parseAskChatAnswer('Пыльца высокая, лучше сократить прогулку.')).toBe(
      'Пыльца высокая, лучше сократить прогулку.',
    );
  });

  it('returns null for empty, blank and unusable JSON output', () => {
    expect(parseAskChatAnswer(null)).toBeNull();
    expect(parseAskChatAnswer('   ')).toBeNull();
    expect(parseAskChatAnswer('{"answer":""}')).toBeNull();
    expect(parseAskChatAnswer('{"unexpected":1}')).toBeNull();
  });

  it('caps the answer length', () => {
    const long = JSON.stringify({ answer: 'a'.repeat(ASK_ANSWER_MAX_LENGTH + 50) });
    expect(parseAskChatAnswer(long)).toHaveLength(ASK_ANSWER_MAX_LENGTH);
  });
});
