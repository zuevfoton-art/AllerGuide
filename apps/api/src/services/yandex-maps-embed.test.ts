import { describe, expect, it } from 'vitest';
import {
  buildYandexInteractiveMapHtml,
  isYandexMapsInteractiveConfigured,
} from './yandex-maps-embed';

describe('yandex-maps-embed', () => {
  it('requires flag and key', () => {
    delete process.env.YANDEX_MAPS_INTERACTIVE_ENABLED;
    delete process.env.YANDEX_MAPS_JS_API_KEY;
    expect(isYandexMapsInteractiveConfigured()).toBe(false);
    process.env.YANDEX_MAPS_INTERACTIVE_ENABLED = 'true';
    process.env.YANDEX_MAPS_JS_API_KEY = 'test-key';
    expect(isYandexMapsInteractiveConfigured()).toBe(true);
  });

  it('embeds coordinates and markers without exposing a client bundle secret pattern', () => {
    const html = buildYandexInteractiveMapHtml({
      apiKey: 'server-key',
      latitude: 55.75,
      longitude: 37.62,
      zoom: 11,
      markers: [{ id: 'p1', latitude: 55.76, longitude: 37.63, title: 'Clinic' }],
      selectedId: 'p1',
    });
    expect(html).toContain('api-maps.yandex.ru/2.1/');
    expect(html).toContain('apikey=server-key');
    expect(html).toContain('55.75');
    expect(html).toContain('Clinic');
    expect(html).toContain('marker_press');
  });

  it('uses a violet preset for ADAIR clinic pins', () => {
    const html = buildYandexInteractiveMapHtml({
      apiKey: 'server-key',
      latitude: 55.75,
      longitude: 37.62,
      zoom: 11,
      markers: [
        {
          id: 'adair:nkcc',
          latitude: 55.64,
          longitude: 37.49,
          title: 'НККЦ',
          kind: 'adair-clinic',
        },
      ],
    });
    expect(html).toContain('islands#violetDotIcon');
  });
});
