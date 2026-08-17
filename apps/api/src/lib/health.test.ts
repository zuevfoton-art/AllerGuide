import { afterEach, describe, expect, it, vi } from 'vitest';

const ORIGINAL_ENV = { ...process.env };

vi.mock('postgres', () => {
  const sql = vi.fn(async () => [{ '?column?': 1 }]);
  const factory = vi.fn(() => {
    const client = Object.assign(sql, {
      end: vi.fn(async () => undefined),
    });
    return client;
  });
  return { default: factory };
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.clearAllMocks();
});

describe('buildHealthPayload', () => {
  it('requires JWT when DATABASE_URL is configured', async () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
    delete process.env.JWT_SECRET;

    const { buildHealthPayload } = await import('./health');
    const payload = await buildHealthPayload();
    expect(payload.ok).toBe(false);
    expect(payload.authDatabase).toBe(false);
  });

  it('exposes staging feature flags in health payload', async () => {
    process.env.SYNC_ENABLED = 'true';
    process.env.AI_SCAN_ENABLED = 'true';
    process.env.AI_PROVIDER = 'yandex';
    delete process.env.DATABASE_URL;

    const { buildHealthPayload } = await import('./health');
    const payload = await buildHealthPayload();
    expect(payload.features).toEqual({
      sync: true,
      aiScan: true,
      aiScanProvider: 'yandex',
      pollenHeatmap: false,
      pollenSpeciesHeatmap: false,
      airQuality: false,
      mapPlaces: false,
      yandexMapsInteractive: false,
    });
    expect(payload.scan?.enabled).toBe(true);
    expect(payload.scan?.dailyBudget).toBe(100);
  });

  it('exposes Places and Air Quality when flags and keys are set', async () => {
    process.env.MAP_PLACES_ENABLED = 'true';
    process.env.GOOGLE_PLACES_API_KEY = 'places-test-key';
    process.env.AIR_QUALITY_ENABLED = 'true';
    process.env.GOOGLE_AIR_QUALITY_API_KEY = 'aq-test-key';
    delete process.env.DATABASE_URL;

    const { buildHealthPayload } = await import('./health');
    const payload = await buildHealthPayload();
    expect(payload.features?.mapPlaces).toBe(true);
    expect(payload.features?.airQuality).toBe(true);
  });

  it('does not treat the Pollen-only key as a Places or Air Quality credential', async () => {
    process.env.POLLEN_HEATMAP_ENABLED = 'true';
    process.env.MAP_PLACES_ENABLED = 'true';
    process.env.AIR_QUALITY_ENABLED = 'true';
    process.env.GOOGLE_POLLEN_API_KEY = 'pollen-only-key';
    delete process.env.GOOGLE_PLACES_API_KEY;
    delete process.env.GOOGLE_AIR_QUALITY_API_KEY;
    delete process.env.GOOGLE_MAPS_SERVER_API_KEY;
    delete process.env.DATABASE_URL;

    const { buildHealthPayload } = await import('./health');
    const payload = await buildHealthPayload();
    expect(payload.features?.pollenHeatmap).toBe(true);
    expect(payload.features?.mapPlaces).toBe(false);
    expect(payload.features?.airQuality).toBe(false);
  });
});
