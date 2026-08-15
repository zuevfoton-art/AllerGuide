# Species-level pollen heatmap spike

Google Pollen `heatmapTiles` accept only `TREE_UPI`, `GRASS_UPI`, and `WEED_UPI`. There is no `BIRCH_UPI` / `OAK_UPI` tile type. A derived species layer would call `forecast:lookup` on a 1 km grid after map idle.

## Measurements (core unit tests)

| Viewport | Unclipped 1 km samples | Clipped cap | Calls / 8 idles | Est. USD @ $0.01 |
|----------|------------------------|-------------|-----------------|------------------|
| Moscow city (~20×20 km) | >100 (typically ~400) | 25 | 200+ | > $2 / session |

Coverage is seasonal: Google returns at most 15 plants per point and omits many of the 17 codes. Filling empty cells from TREE/GRASS/WEED would make birch and oak look identical.

## Product decision: **no-go**

`POLLEN_SPECIES_HEATMAP_PRODUCT_DECISION = 'no-go'` in `@allerguide/core`.

Reasons:

1. Official tiles cannot take a plant code.
2. A city idle would burn hundreds of forecast calls (or still 25× per pan when clipped).
3. Species coverage is too sparse for a continuous layer.
4. Interpolation would overstate 1 km precision.
5. Pollen API visualization is Google-Maps-only; a custom layer still needs attribution `Includes data from Google Maps`.

The experimental route `GET /api/pollen/species-samples` stays behind `POLLEN_SPECIES_HEATMAP_ENABLED=false`. The map UI shows the official group heatmap plus species UPI on the card/sheet.

Health exposes `features.pollenSpeciesHeatmap` only when the experimental flag and pollen key are both set.
