import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/src/services/error-reporting', () => ({
  logCaughtError: vi.fn(),
}));

beforeEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('pollen-hourly-service', () => {
  it('parses hourly grains into UPI samples', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          hourly: {
            time: ['2026-08-04T10:00', '2026-08-04T11:00'],
            birch_pollen: [5, 40],
            grass_pollen: [1, 2],
          },
        }),
      })),
    );

    const { fetchPollenHourlySeries, resolveHourlyUpi } = await import(
      './pollen-hourly-service'
    );
    const series = await fetchPollenHourlySeries(55.75, 37.62);
    expect(series?.birch_pollen?.length).toBe(2);
    const upi = resolveHourlyUpi(series, 'birch_pollen', Date.parse('2026-08-04T10:30:00'));
    expect(upi).toBeGreaterThan(0);
  });
});
