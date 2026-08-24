import { Platform, StyleSheet, View } from 'react-native';
import { useMemo, type ReactNode } from 'react';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';

type YandexMapProps = {
  url: string;
  height?: number;
  overlay?: ReactNode;
  interactive?: boolean;
};

export function YandexMap({ url, height = 220, overlay, interactive = true }: YandexMapProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme, height), [theme, height]);

  if (Platform.OS === 'web') {
    return (
      <View style={styles.wrap}>
        <iframe
          src={url}
          title="Yandex Map"
          style={StyleSheet.flatten([
            styles.iframe,
            !interactive && styles.nonInteractive,
          ]) as object}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
        {overlay ? (
          <View pointerEvents="none" style={styles.overlay}>
            {overlay}
          </View>
        ) : null}
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
        pointerEvents={interactive ? 'auto' : 'none'}
        scrollEnabled={interactive}
        originWhitelist={['https://*']}
        javaScriptEnabled
        domStorageEnabled
      />
      {overlay ? (
        <View pointerEvents="none" style={styles.overlay}>
          {overlay}
        </View>
      ) : null}
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
      borderColor: colors.mapRoad,
      backgroundColor: colors.mapLand,
    },
    webview: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    iframe: {
      width: '100%',
      height: '100%',
      borderWidth: 0,
    } as object,
    nonInteractive: {
      pointerEvents: 'none',
    } as object,
    overlay: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 2,
    },
  });
}
