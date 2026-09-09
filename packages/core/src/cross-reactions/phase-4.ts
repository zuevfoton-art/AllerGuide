import type { CrossReaction } from './types';

/**
 * Phase 4: dedicated calendar-pollen catalog rows.
 * Kinship only where a protein homology is documented; maple has none.
 */
export const CROSS_REACTIONS_PHASE_4: CrossReaction[] = [
  {
    fromId: 'hazel-pollen',
    toId: 'birch-pollen',
    risk: 'high',
    protein: 'Cor a 1 / Bet v 1',
    note: 'Betulaceae, гомологичные PR-10',
  },
  {
    fromId: 'hazel-pollen',
    toId: 'hazelnut',
    risk: 'high',
    protein: 'Cor a 1',
    syndrome: 'oas',
    note: 'Пыльца лещины ↔ фундук, оральный аллергический синдром',
  },
  {
    fromId: 'oak-pollen',
    toId: 'birch-pollen',
    risk: 'medium',
    protein: 'PR-10 (Que a 1 / Bet v 1)',
    note: 'Fagales: гомология PR-10',
  },
  {
    fromId: 'ash-pollen',
    toId: 'olive-pollen',
    risk: 'high',
    protein: 'Fra e 1 / Ole e 1',
    note: 'Oleaceae: ясень ↔ олива',
  },
  {
    fromId: 'saltwort-pollen',
    toId: 'mugwort-pollen',
    risk: 'medium',
    protein: 'профилин',
    note: 'Сорные травы, паналлергены',
  },
  {
    fromId: 'saltwort-pollen',
    toId: 'ragweed-pollen',
    risk: 'low',
    note: 'Совместная сенсибилизация поздним летом',
  },
  {
    fromId: 'poplar-pollen',
    toId: 'willow-pollen',
    risk: 'low',
    note: 'Salicaceae; тополиный пух — переносчик пыльцы, а не аллерген',
  },
];
