import type { CrossReaction } from './types';

/** Phase 1 cross-reactions: existing allergen ids only, enriched with risk metadata. */
export const CROSS_REACTIONS_PHASE_1: CrossReaction[] = [
  { fromId: 'birch-pollen', toId: 'apple', risk: 'high', protein: 'Mal d 1', syndrome: 'oas', note: 'Оральный аллергический синдром' },
  { fromId: 'birch-pollen', toId: 'hazelnut', risk: 'high', protein: 'Cor a 1', syndrome: 'oas', note: 'Оральный аллергический синдром' },
  { fromId: 'birch-pollen', toId: 'carrot', risk: 'high', protein: 'Dau c 1', syndrome: 'oas', note: 'Оральный аллергический синдром' },
  { fromId: 'birch-pollen', toId: 'tomato', risk: 'low', syndrome: 'oas', note: 'Реже, чем при аллергии на злаки' },
  { fromId: 'birch-pollen', toId: 'soy', risk: 'medium', protein: 'Gly m 4', syndrome: 'oas', note: 'PR-10 гомолог Bet v 1' },
  { fromId: 'birch-pollen', toId: 'peanut', risk: 'medium', protein: 'Ara h 8', syndrome: 'oas', note: 'Перекрёст с берёзой, не истинная PA' },
  { fromId: 'birch-pollen', toId: 'kiwi', risk: 'low', protein: 'Act d 8', syndrome: 'oas', note: 'PR-10 гомолог' },

  { fromId: 'latex', toId: 'banana', risk: 'high', protein: 'Mus a 1', syndrome: 'latex-fruit', note: 'Латекс-фруктовый синдром' },
  { fromId: 'latex', toId: 'kiwi', risk: 'high', syndrome: 'latex-fruit', note: 'Латекс-фруктовый синдром' },
  { fromId: 'latex', toId: 'avocado', risk: 'high', syndrome: 'latex-fruit', note: 'Латекс-фруктовый синдром' },
  { fromId: 'latex', toId: 'tomato', risk: 'medium', syndrome: 'latex-fruit', note: 'Перекрёст через хитиназы' },

  {
    fromId: 'dust-mites',
    toId: 'seafood',
    risk: 'high',
    protein: 'Der p 10',
    syndrome: 'tropomyosin',
    clinicalFrequency: '40-60%',
    note: 'Тропомиозин — термостабилен',
  },
  { fromId: 'dust-mites', toId: 'house-dust', risk: 'low', note: 'Связанные бытовые аллергены' },

  {
    fromId: 'cat-dander',
    toId: 'pork',
    risk: 'medium',
    protein: 'Fel d 2',
    syndrome: 'animal-protein',
    clinicalFrequency: '~3%',
    note: 'Альбумин кошки и свинины',
  },
  { fromId: 'cat-dander', toId: 'dog-dander', risk: 'low', note: 'Частичное перекрытие белков шерсти' },

  { fromId: 'ragweed-pollen', toId: 'banana', risk: 'medium', syndrome: 'pollen-food', note: 'Профилины' },
  { fromId: 'ragweed-pollen', toId: 'honey', risk: 'low', note: 'Возможна реакция на продукты пчеловодства' },

  {
    fromId: 'milk',
    toId: 'goat-milk',
    risk: 'high',
    clinicalFrequency: '>90%',
    note: 'Сходные молочные белки',
  },
  { fromId: 'milk', toId: 'beef', risk: 'medium', syndrome: 'animal-protein', note: 'Казеины и альбумин' },

  { fromId: 'eggs', toId: 'chicken', risk: 'medium', syndrome: 'animal-protein', note: 'Овомукоид / овальбумин' },

  {
    fromId: 'peanut',
    toId: 'soy',
    risk: 'medium',
    syndrome: 'legume',
    clinicalFrequency: '5-10%',
    note: 'Вицилины и легумины',
  },
  { fromId: 'peanut', toId: 'tree-nuts', risk: 'medium', note: 'Частичное перекрытие белков' },
  { fromId: 'peanut', toId: 'hazelnut', risk: 'medium', note: 'Возможна перекрёстная реакция' },
  { fromId: 'tree-nuts', toId: 'hazelnut', risk: 'high', note: 'Семейство древесных орехов' },

  { fromId: 'fish', toId: 'seafood', risk: 'low', note: 'Разные белки; основной перекрёст — между видами рыб' },
];
