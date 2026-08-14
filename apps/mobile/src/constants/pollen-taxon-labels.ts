import type { PollenMapTaxonId, PollenTypeGroup } from '@allerguide/core';

/** i18n message keys for every pollen taxon shown on the map. */
export const TAXON_LABEL_KEYS: Record<PollenMapTaxonId, string> = {
  birch_pollen: 'map.pollenBirch',
  grass_pollen: 'map.pollenGrass',
  ragweed_pollen: 'map.pollenRagweed',
  alder_pollen: 'map.pollenAlder',
  mugwort_pollen: 'map.pollenMugwort',
  olive_pollen: 'map.pollenOlive',
  oak_pollen: 'map.pollenOak',
  hazel_pollen: 'map.pollenHazel',
  maple_pollen: 'map.pollenMaple',
  ash_pollen: 'map.pollenAsh',
  poplar_pollen: 'map.pollenPoplar',
  elm_pollen: 'map.pollenElm',
  juniper_pollen: 'map.pollenJuniper',
  pine_pollen: 'map.pollenPine',
  cypress_pine_pollen: 'map.pollenCypressPine',
  japanese_cedar_pollen: 'map.pollenJapaneseCedar',
  japanese_cypress_pollen: 'map.pollenJapaneseCypress',
};

/** i18n message keys for the Google pollen type groups (TREE/GRASS/WEED). */
export const POLLEN_TYPE_LABEL_KEYS: Record<PollenTypeGroup, string> = {
  TREE: 'map.pollenTypeTree',
  GRASS: 'map.pollenTypeGrass',
  WEED: 'map.pollenTypeWeed',
};
