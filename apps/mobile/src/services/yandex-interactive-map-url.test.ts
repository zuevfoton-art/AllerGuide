import { describe, expect, it, vi } from 'vitest';
import { buildYandexInteractiveEmbedUrl } from './yandex-interactive-map-url';

vi.mock('@/src/services/api-client', () => ({
  getApiBaseUrl: () => 'https://api.test',
}));

describe('buildYandexInteractiveEmbedUrl', () => {
  it('builds embed URL with markers JSON', () => {
    const url = buildYandexInteractiveEmbedUrl({
      latitude: 55.75,
      longitude: 37.62,
      zoom: 11,
      markers: [{ id: 'm1', latitude: 55.76, longitude: 37.63, title: 'Clinic' }],
      selectedMarkerId: 'm1',
    });
    expect(url).toContain('https://api.test/api/maps/yandex-interactive?');
    expect(url).toContain('lat=55.75');
    expect(url).toContain('selectedId=m1');
    expect(decodeURIComponent(url!)).toContain('Clinic');
  });
});
