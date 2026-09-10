import { describe, expect, it } from 'vitest';
import {
  ASK_MAX_QUESTION_LENGTH,
  askLengthBucket,
  detectAskDistress,
  parseAskQuestion,
  trimAskHistory,
  type AskMessage,
} from './ask-chat';

describe('detectAskDistress', () => {
  it('flags anaphylaxis wording in every shipped locale', () => {
    const distress = [
      'Я задыхаюсь, что делать',
      'ощущение, что отёк горла',
      'I cannot breathe properly',
      'looks like anaphylaxis',
      'Ich kann nicht atmen',
      "j'ai du mal à respirer",
      'no puedo respirar bien',
      'non riesco a respirare',
    ];

    for (const text of distress) {
      expect(detectAskDistress(text), text).toBe(true);
    }
  });

  it('leaves ordinary questions to the model', () => {
    const calm = [
      'Можно ли мне сегодня гулять',
      'Что значит «может содержать следы молока»',
      'When does birch pollen season end?',
      '',
    ];

    for (const text of calm) {
      expect(detectAskDistress(text), text).toBe(false);
    }
  });

  it('ignores case and diacritics', () => {
    expect(detectAskDistress('АНАФИЛАКСИЯ?')).toBe(true);
    expect(detectAskDistress('otek gorla')).toBe(false);
  });
});

describe('parseAskQuestion', () => {
  it('rejects empty and oversized input', () => {
    expect(parseAskQuestion('   ')).toEqual({ ok: false, reason: 'empty' });
    expect(parseAskQuestion('x'.repeat(ASK_MAX_QUESTION_LENGTH + 1))).toEqual({
      ok: false,
      reason: 'too-long',
    });
  });

  it('reports distress alongside the trimmed text', () => {
    expect(parseAskQuestion('  Я задыхаюсь ')).toEqual({
      ok: true,
      text: 'Я задыхаюсь',
      distress: true,
    });
    expect(parseAskQuestion('Почему воздух хуже')).toEqual({
      ok: true,
      text: 'Почему воздух хуже',
      distress: false,
    });
  });
});

describe('askLengthBucket', () => {
  it('buckets by size and never returns the text', () => {
    expect(askLengthBucket('коротко')).toBe('short');
    expect(askLengthBucket('a'.repeat(100))).toBe('medium');
    expect(askLengthBucket('a'.repeat(200))).toBe('long');
  });
});

describe('trimAskHistory', () => {
  it('keeps the newest turns within the limit', () => {
    const messages: AskMessage[] = Array.from({ length: 5 }, (_, index) => ({
      id: String(index),
      role: 'user',
      text: `q${index}`,
      at: new Date(2026, 8, 9, 12, index).toISOString(),
    }));

    expect(trimAskHistory(messages, 3).map((m) => m.id)).toEqual(['2', '3', '4']);
    expect(trimAskHistory(messages, 10)).toHaveLength(5);
  });
});
