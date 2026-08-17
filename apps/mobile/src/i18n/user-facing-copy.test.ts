import { describe, expect, it } from 'vitest';
import { LOCALE_MESSAGES } from './locales';

const BLOCKED_PATTERNS: { id: string; pattern: RegExp }[] = [
  { id: 'ACT', pattern: /\bACT\b/ },
  { id: 'ARIA', pattern: /\bARIA\b/ },
  { id: 'GINA', pattern: /\bGINA\b/ },
  { id: 'SCORAD', pattern: /\bSCORAD\b/ },
  { id: 'UAS7', pattern: /\bUAS7\b/ },
  { id: 'шкал', pattern: /шкал/i },
];

const ALLOWED_PATHS = new Set(['asthma.ginaLink']);

function flattenMessages(
  value: unknown,
  prefix = '',
): { path: string; text: string }[] {
  if (typeof value === 'string') {
    return [{ path: prefix, text: value }];
  }
  if (!value || typeof value !== 'object') {
    return [];
  }
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    flattenMessages(child, prefix ? `${prefix}.${key}` : key),
  );
}

describe('user-facing locale copy', () => {
  it('labels a high-risk scanner verdict as risk, not STOP', () => {
    expect(LOCALE_MESSAGES.ru.scanner.verdictStop).toBe('Высокий риск');
    expect(LOCALE_MESSAGES.en.scanner.verdictStop).toBe('High risk');
  });

  it('keeps clinical acronyms and «шкал» out of user strings', () => {
    const violations: string[] = [];

    for (const [locale, messages] of Object.entries(LOCALE_MESSAGES)) {
      for (const { path, text } of flattenMessages(messages)) {
        if (ALLOWED_PATHS.has(path)) continue;
        for (const { id, pattern } of BLOCKED_PATTERNS) {
          if (pattern.test(text)) {
            violations.push(`${locale}:${path} contains ${id}`);
          }
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it('keeps first-layer wellness copy free of numeric units', () => {
    const unitPattern = /\d|µg|м³|зёрен|grains|µg\/m/i;
    const firstLayerKeys = [
      'wellness.index',
      'wellness.pollen',
      'wellness.air',
      'wellness.diaryState',
      'wellness.forecast',
      'wellness.statusPhrase',
      'wellness.primaryFactorSentence',
    ];

    const violations: string[] = [];
    for (const [locale, messages] of Object.entries(LOCALE_MESSAGES)) {
      for (const { path, text } of flattenMessages(messages)) {
        if (!firstLayerKeys.some((key) => path === key || path.startsWith(`${key}.`))) {
          continue;
        }
        if (unitPattern.test(text)) {
          violations.push(`${locale}:${path} = ${text}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
