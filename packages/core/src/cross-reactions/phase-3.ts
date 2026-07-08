import type { CrossReaction } from './types';

/** Info-only syndrome notes (no scanner gating). EAACI / iFAAM reference patterns. */
export const CROSS_REACTIONS_PHASE_3: CrossReaction[] = [
  {
    fromId: 'milk',
    toId: 'soy',
    risk: 'low',
    syndrome: 'fpies',
    note: 'FPIES: отсроченная реакция на белок (часы), не IgE — требует наблюдения врача',
    clinicalFrequency: 'редко',
  },
  {
    fromId: 'soy',
    toId: 'milk',
    risk: 'low',
    syndrome: 'fpies',
    note: 'FPIES: отсроченная реакция на белок (часы), не IgE — требует наблюдения врача',
    clinicalFrequency: 'редко',
  },
  {
    fromId: 'latex',
    toId: 'tomato',
    risk: 'medium',
    syndrome: 'contact-dermatitis',
    note: 'Контактный дерматит: возможна кожная реакция на латекс и перекрёстные аллергены',
  },
  {
    fromId: 'wheat-gluten',
    toId: 'rye',
    risk: 'low',
    syndrome: 'contact-dermatitis',
    note: 'Контактный / атопический дерматит: злаки могут усиливать кожные проявления',
  },
];
