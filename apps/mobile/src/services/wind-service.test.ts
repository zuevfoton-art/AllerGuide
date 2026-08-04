import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/src/services/error-reporting', () => ({
  logCaughtError: vi.fn(),
}));

beforeEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('wind-service', () => {
  it('parses current + hourly wind and interpolates', async () => {
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
          hourly: {
            time: ['2026-08-04T11:00', '2026-08-04T13:00'],
            wind_speed_10m: [2, 6],
            wind_direction_10m: [270, 270],
          },
        }),
      })),
    );

    const { fetchWindSnapshot } = await import('./wind-service');
    const wind = await fetchWindSnapshot(55.75, 37.62);
    expect(wind?.hourly?.length).toBe(2);
    expect(wind?.directionDeg).toBe(270);
    expect(wind?.speedMps).toBeGreaterThan(0);
  });

  it('returns null when the wind endpoint fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500 })));
    const { fetchWindSnapshot } = await import('./wind-service');
    expect(await fetchWindSnapshot(55.75, 37.62)).toBeNull();
  });
});
