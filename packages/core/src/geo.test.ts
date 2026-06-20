import { describe, expect, it } from 'vitest';
import { formatDistanceKm, haversineDistanceKm, sortPlacesByDistance } from './geo';
import type { CatalogPlace } from './catalog';

const places: CatalogPlace[] = [
  {
    id: 'a',
    title: 'Near',
    note: '',
    level: 'high',
    icon: 'leaf',
    lat: 55.756,
    lng: 37.618,
    tags: [],
  },
  {
    id: 'b',
    title: 'Far',
    note: '',
    level: 'high',
    icon: 'leaf',
    lat: 55.9,
    lng: 37.9,
    tags: [],
  },
];

describe('geo helpers', () => {
  it('computes distance between coordinates', () => {
    const distance = haversineDistanceKm(
      { latitude: 55.7558, longitude: 37.6173 },
      { latitude: 55.756, longitude: 37.618 },
    );
    expect(distance).toBeGreaterThan(0);
    expect(distance).toBeLessThan(1);
  });

  it('sorts places by distance from origin', () => {
    const sorted = sortPlacesByDistance(places, { latitude: 55.7558, longitude: 37.6173 });
    expect(sorted[0]?.id).toBe('a');
    expect(sorted[0]?.distanceKm).toBeLessThan(sorted[1]?.distanceKm ?? 0);
  });

  it('formats distance labels', () => {
    expect(formatDistanceKm(0.4)).toBe('400 м');
    expect(formatDistanceKm(2.3)).toBe('2.3 км');
  });
});
