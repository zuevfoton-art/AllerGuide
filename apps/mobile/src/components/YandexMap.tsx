import { Platform, StyleSheet, View } from 'react-native';
import { useMemo } from 'react';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';

type YandexMapProps = {
  url: string;
  height?: number;
};

/**
 * Converts a Yandex map-widget URL into a Yandex Static Maps API URL.
 * Both share the same `ll`, `z`, and `pt` parameter formats — we just swap
 * the host and add `size`. No API key required for the static endpoint.
 *
 * Static Maps docs: https://yandex.ru/dev/staticapi/doc/ru/
 */
function widgetUrlToStaticUrl(widgetUrl: string, width = 650, height = 440): string {
  try {
    const src = new URL(widgetUrl);
    // searchParams.get() returns decoded values (commas, tildes as-is)
    const ll = src.searchParams.get('ll') ?? '37.5,55.75';
    const z = src.searchParams.get('z') ?? '9';
    const pt = src.searchParams.get('pt') ?? '';

    // Build URL manually — URLSearchParams encodes commas as %2C and tildes as %7E,
    // but Yandex Static Maps API requires literal commas in ll/size and tildes in pt.
    let url = `https://static-maps.yandex.ru/1.x/?ll=${ll}&z=${z}&l=map&size=${width},${height}&lang=ru_RU`;
    if (pt) url += `&pt=${pt}`;
    return url;
  } catch {
    return '';
  }
}

export function YandexMap({ url, height = 220 }: YandexMapProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme, height), [theme, height]);

  if (Platform.OS === 'web') {
    const staticUrl = widgetUrlToStaticUrl(url, 650, 440);
    return (
      <View style={styles.wrap}>
        {staticUrl ? (
          <img
            src={staticUrl}
            alt="Яндекс Карты"
            style={
              {
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
                border: 'none',
              } as React.CSSProperties
            }
          />
        ) : (
          <iframe
            src={url}
            title="Yandex Map"
            style={styles.iframe as object}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        )}
      </View>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { WebView } = require('react-native-webview') as typeof import('react-native-webview');

  return (
    <View style={styles.wrap}>
      <WebView
        source={{ uri: url }}
        style={styles.webview}
        scrollEnabled={false}
        originWhitelist={['https://*']}
        javaScriptEnabled
        domStorageEnabled
      />
    </View>
  );
}

function createStyles({ colors }: AppTheme, height: number) {
  return StyleSheet.create({
    wrap: {
      height,
      borderRadius: 8,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceMuted,
    },
    webview: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    iframe: {
      width: '100%',
      height: '100%',
      border: 'none',
    } as object,
  });
}
