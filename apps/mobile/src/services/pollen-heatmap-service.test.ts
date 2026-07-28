import { describe, expect, it } from 'vitest';
import {
  buildPollenHeatmapTileUrlTemplate,
  resolvePollenHeatmapTileUrl,
} from './pollen-heatmap-service';

describe('pollen-heatmap-service', () => {
  it('builds a proxy URL template without exposing the Google key', () => {
    expect(
      buildPollenHeatmapTileUrlTemplate('TREE_UPI', 'https://api.staging.aclearo.com/'),
    ).toBe(
      'https://api.staging.aclearo.com/api/pollen/heatmap/TREE_UPI/{z}/{x}/{y}',
    );
  });

  it('resolves and wraps web tile coordinates', () => {
    const template =
      'https://api.example/api/pollen/heatmap/WEED_UPI/{z}/{x}/{y}';

    expect(resolvePollenHeatmapTileUrl(template, 3, -1, 2)).toBe(
      'https://api.example/api/pollen/heatmap/WEED_UPI/3/7/2',
    );
  });

  it('rejects an empty API base URL', () => {
    expect(() => buildPollenHeatmapTileUrlTemplate('GRASS_UPI', '')).toThrow(
      'EXPO_PUBLIC_API_URL is not configured',
    );
  });
});
