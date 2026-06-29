import { Platform, StyleSheet, View } from 'react-native';
import { useMemo } from 'react';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';

type YandexMapProps = {
  url: string;
  height?: number;
};

export function YandexMap({ url, height = 220 }: YandexMapProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme, height), [theme, height]);

  if (Platform.OS === 'web') {
    return (
      <View style={styles.wrap}>
        <iframe
          src={url}
          title="Yandex Map"
          style={styles.iframe as object}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
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
      borderWidth: 0,
    } as object,
  });
}
