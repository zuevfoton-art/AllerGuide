import { describe, expect, it } from 'vitest';
import { lastListItemQuery, replaceLastListItem, splitListInput } from './list-input';

describe('list-input', () => {
  it('splits a mixed comma list', () => {
    expect(splitListInput('аспирин, ибупрофен; цетиризин\n')).toEqual([
      'аспирин',
      'ибупрофен',
      'цетиризин',
    ]);
  });

  it('reads the token currently being typed', () => {
    expect(lastListItemQuery('аспирин, нур')).toBe('нур');
    expect(lastListItemQuery('аспирин, ')).toBe('');
    expect(lastListItemQuery('зиртек')).toBe('зиртек');
  });

  it('replaces the last token with a catalog name', () => {
    expect(replaceLastListItem('аспирин, нур', 'Нурофен')).toBe('аспирин, Нурофен');
    expect(replaceLastListItem('нур', 'Нурофен')).toBe('Нурофен');
    expect(replaceLastListItem('аспирин,', 'Нурофен')).toBe('аспирин, Нурофен');
  });
});
