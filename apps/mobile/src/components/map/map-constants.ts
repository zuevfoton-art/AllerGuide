import type { PollenTierLevel } from '@allerguide/core';

export type MapLayerMode = 'pollen' | 'air' | 'places';

export const MAP_LAYER_CHIPS = [
  ['pollen', 'map.layerPollen'],
  ['air', 'map.layerAir'],
  ['places', 'map.layerPlaces'],
] as const;

export const LEVEL_LABEL_KEYS: Record<PollenTierLevel, string> = {
  low: 'map.pollenLow',
  mid: 'map.pollenModerate',
  high: 'map.pollenHigh',
};

export const ADAIR_PIN_COLOR = '#7C3AED';
export const MAP_HERO_HEIGHT = 380;
/** How far (degrees) the map center must move before "search this area" shows. */
export const SEARCH_AREA_MIN_DELTA_DEG = 0.01;

export const WEEKDAY_KEYS = [
  'map.weekdaySun',
  'map.weekdayMon',
  'map.weekdayTue',
  'map.weekdayWed',
  'map.weekdayThu',
  'map.weekdayFri',
  'map.weekdaySat',
] as const;
