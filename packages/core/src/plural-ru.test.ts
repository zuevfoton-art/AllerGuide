import { describe, expect, it } from 'vitest';
import { pluralRu } from './plural-ru';

describe('pluralRu', () => {
  it('picks one / few / many by the Russian remainder rule', () => {
    expect(pluralRu(1, 'год', 'года', 'лет')).toBe('год');
    expect(pluralRu(21, 'год', 'года', 'лет')).toBe('год');
    expect(pluralRu(2, 'год', 'года', 'лет')).toBe('года');
    expect(pluralRu(3, 'год', 'года', 'лет')).toBe('года');
    expect(pluralRu(4, 'год', 'года', 'лет')).toBe('года');
    expect(pluralRu(22, 'год', 'года', 'лет')).toBe('года');
    expect(pluralRu(5, 'год', 'года', 'лет')).toBe('лет');
    expect(pluralRu(11, 'год', 'года', 'лет')).toBe('лет');
    expect(pluralRu(12, 'год', 'года', 'лет')).toBe('лет');
    expect(pluralRu(14, 'год', 'года', 'лет')).toBe('лет');
    expect(pluralRu(0, 'год', 'года', 'лет')).toBe('лет');
    expect(pluralRu(34, 'год', 'года', 'лет')).toBe('года');
  });
});
