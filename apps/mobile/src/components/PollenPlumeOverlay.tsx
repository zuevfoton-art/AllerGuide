import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';

type PollenPlumeOverlayProps = {
  groupHint: string;
};

/** Caption-only overlay; geo plume is drawn as map Circles/Polylines. */
export function PollenPlumeOverlay({ groupHint }: PollenPlumeOverlayProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();

  return (
    <View style={styles.root} pointerEvents="none" testID="map-pollen-plume">
      <View style={styles.caption}>
        <Text style={styles.captionText}>{t('map.plumeHint', { group: groupHint })}</Text>
      </View>
    </View>
  );
}

function createStyles({ fonts }: AppTheme) {
  return StyleSheet.create({
    root: {
      ...StyleSheet.absoluteFillObject,
    },
    caption: {
      position: 'absolute',
      left: 8,
      bottom: 8,
      maxWidth: '70%',
      borderRadius: 6,
      backgroundColor: 'rgba(0,0,0,0.45)',
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    captionText: {
      fontFamily: fonts.sans,
      fontSize: 10,
      color: '#fff',
      lineHeight: 13,
    },
  });
}
