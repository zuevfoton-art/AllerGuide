import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/src/services/error-reporting', () => ({
  logCaughtError: vi.fn(),
}));

beforeEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('wind-service', () => {
  it('parses Open-Meteo current wind', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          current: {
            wind_speed_10m: 4.2,
            wind_direction_10m: 270,
            time: '2026-08-04T12:00',
          },
        }),
      })),
    );

    const { fetchWindSnapshot } = await import('./wind-service');
    const wind = await fetchWindSnapshot(55.75, 37.62);
    expect(wind).toMatchObject({
      speedMps: 4.2,
      directionDeg: 270,
    });
  });

  it('returns null when the wind endpoint fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500 })));
    const { fetchWindSnapshot } = await import('./wind-service');
    expect(await fetchWindSnapshot(55.75, 37.62)).toBeNull();
  });
});
