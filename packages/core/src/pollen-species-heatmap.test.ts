import { describe, expect, it } from 'vitest';
import {
  buildSpeciesSampleGrid,
  estimateSpeciesHeatmapQuota,
  evaluateSpeciesHeatmapGoNoGo,
  POLLEN_SPECIES_HEATMAP_PRODUCT_DECISION,
  POLLEN_SPECIES_SAMPLE_MAX_POINTS,
  speciesSampleFromPlantUpi,
} from './pollen-species-heatmap';

describe('pollen-species-heatmap spike', () => {
  const moscowCityViewport = {
    north: 55.85,
    south: 55.65,
    east: 37.75,
    west: 37.45,
  };

  it('builds a 1 km grid and clips a city viewport to the hard cap', () => {
    const grid = buildSpeciesSampleGrid(moscowCityViewport);
    expect(grid.unclippedCount).toBeGreaterThan(100);
    expect(grid.points.length).toBeLessThanOrEqual(POLLEN_SPECIES_SAMPLE_MAX_POINTS);
    expect(grid.clipped).toBe(true);
    expect(grid.resolutionKm).toBe(1);
  });

  it('estimates quota that exceeds a staging session budget', () => {
    const grid = buildSpeciesSampleGrid(moscowCityViewport);
    const unclipped = estimateSpeciesHeatmapQuota(grid.unclippedCount, 8);
    expect(unclipped.forecastCalls).toBeGreaterThan(800);
    expect(unclipped.exceedsStageBudget).toBe(true);

    const clipped = estimateSpeciesHeatmapQuota(grid.points.length, 8);
    expect(clipped.forecastCalls).toBe(grid.points.length * 8);
    expect(clipped.estimatedUsd).toBeGreaterThan(1);
  });

  it('never invents a species UPI from a missing plant index', () => {
    const empty = speciesSampleFromPlantUpi({ lat: 55.75, lon: 37.62 });
    expect(empty.hasData).toBe(false);
    expect(empty.upi).toBeNull();
    expect(empty.color).toBeNull();
  });

  it('records a no-go product decision for the derived species layer', () => {
    const grid = buildSpeciesSampleGrid(moscowCityViewport);
    const verdict = evaluateSpeciesHeatmapGoNoGo({
      unclippedCitySamples: grid.unclippedCount,
      clippedSamples: grid.points.length,
      coverageRatio: 0.4,
      usesOfficialPlantTiles: false,
    });
    expect(verdict.decision).toBe('no-go');
    expect(POLLEN_SPECIES_HEATMAP_PRODUCT_DECISION).toBe('no-go');
    expect(verdict.reasons.some((reason) => reason.includes('TREE_UPI'))).toBe(true);
  });
});
