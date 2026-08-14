import { describe, expect, it } from 'vitest';
import {
  airQualityRiskFromUaqi,
  isGoogleAirQualityMapType,
  normalizeGoogleAirQuality,
} from './air-quality';

describe('air-quality', () => {
  it('normalizes a Google currentConditions payload', () => {
    const snapshot = normalizeGoogleAirQuality({
      dateTime: '2026-08-14T09:00:00Z',
      regionCode: 'ru',
      indexes: [
        { code: 'uaqi', displayName: 'Universal AQI', aqi: 74, category: 'Good air quality' },
        { code: 'rus_mecoenr', displayName: 'AQI (RU)', aqi: 22, dominantPollutant: 'pm25' },
      ],
      pollutants: [
        { code: 'pm25', concentration: { value: 11.4, units: 'MICROGRAMS_PER_CUBIC_METER' } },
        { code: 'o3', concentration: {} },
      ],
      healthRecommendations: {
        generalPopulation: 'Fine outside.',
        children: 'Limit outdoor time.',
      },
    });

    expect(snapshot.universal).toMatchObject({ code: 'uaqi', aqi: 74 });
    expect(snapshot.local).toMatchObject({ code: 'rus_mecoenr', aqi: 22 });
    expect(snapshot.pollutants).toEqual([
      expect.objectContaining({ code: 'pm25', value: 11.4 }),
      expect.objectContaining({ code: 'o3', value: null }),
    ]);
    expect(snapshot.healthRecommendations).toEqual({
      general: 'Fine outside.',
      sensitive: 'Limit outdoor time.',
    });
  });

  it('returns empty snapshot fields when the payload is sparse', () => {
    const snapshot = normalizeGoogleAirQuality({});
    expect(snapshot.universal).toBeNull();
    expect(snapshot.local).toBeNull();
    expect(snapshot.pollutants).toEqual([]);
    expect(snapshot.healthRecommendations).toBeNull();
  });

  it('maps UAQI (higher = cleaner) onto risk tiers', () => {
    expect(airQualityRiskFromUaqi(85)).toBe('low');
    expect(airQualityRiskFromUaqi(60)).toBe('low');
    expect(airQualityRiskFromUaqi(50)).toBe('mid');
    expect(airQualityRiskFromUaqi(20)).toBe('high');
    expect(airQualityRiskFromUaqi(null)).toBe('mid');
  });

  it('validates heatmap tile types', () => {
    expect(isGoogleAirQualityMapType('UAQI_INDIGO_PERSIAN')).toBe(true);
    expect(isGoogleAirQualityMapType('US_AQI')).toBe(true);
    expect(isGoogleAirQualityMapType('TREE_UPI')).toBe(false);
  });
});
