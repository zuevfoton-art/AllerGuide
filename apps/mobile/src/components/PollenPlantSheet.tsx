import { useMemo } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import {
  OPEN_METEO_POLLEN_MAP_TAXON_IDS,
  POLLEN_TYPE_GROUP_BY_TAXON,
  type PollenPlantDetail,
} from '@allerguide/core';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';
import { POLLEN_TYPE_LABEL_KEYS } from '@/src/constants/pollen-taxon-labels';

interface PollenPlantSheetProps {
  detail: PollenPlantDetail | null;
}

export function PollenPlantSheet({ detail }: PollenPlantSheetProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();

  if (!detail) {
    return (
      <View style={styles.card}>
        <Text style={styles.empty}>{t('map.plantEmpty')}</Text>
      </View>
    );
  }

  const typeGroup = POLLEN_TYPE_GROUP_BY_TAXON[detail.taxonId];
  const isGoogleOnlyTaxon = !(OPEN_METEO_POLLEN_MAP_TAXON_IDS as readonly string[]).includes(
    detail.taxonId,
  );

  return (
    <View style={styles.card}>
      {detail.pictureUrl ? (
        <Image
          source={{ uri: detail.pictureUrl }}
          style={styles.image}
          accessibilityIgnoresInvertColors
        />
      ) : null}
      <View style={styles.titleRow}>
        <Text style={styles.title}>{detail.displayName}</Text>
        {typeGroup ? (
          <Text style={styles.typeBadge} testID="plant-type-badge">
            {t(POLLEN_TYPE_LABEL_KEYS[typeGroup] as 'map.pollenTypeTree')}
          </Text>
        ) : null}
      </View>
      {isGoogleOnlyTaxon ? (
        <Text style={styles.meta}>{t('map.pollenGoogleOnlyHint')}</Text>
      ) : null}
      {detail.family ? (
        <Text style={styles.meta}>
          {t('map.plantFamily')}: {detail.family}
        </Text>
      ) : null}
      {detail.season ? (
        <Text style={styles.meta}>
          {t('map.plantSeason')}: {detail.season}
        </Text>
      ) : null}
      {detail.specialColors ? (
        <Text style={styles.body}>{detail.specialColors}</Text>
      ) : null}
      {detail.specialShapes ? (
        <Text style={styles.body}>{detail.specialShapes}</Text>
      ) : null}
      {detail.crossReactionNote || detail.crossReactionLabels.length > 0 ? (
        <View style={styles.crossBlock}>
          <Text style={styles.crossTitle}>{t('map.plantCrossReactions')}</Text>
          {detail.crossReactionNote ? (
            <Text style={styles.body}>{detail.crossReactionNote}</Text>
          ) : null}
          {detail.crossReactionLabels.length > 0 ? (
            <Text style={styles.body}>{detail.crossReactionLabels.join(' · ')}</Text>
          ) : null}
        </View>
      ) : (
        <Text style={styles.meta}>{t('map.plantNoCross')}</Text>
      )}
    </View>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    card: {
      gap: 8,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      padding: 14,
    },
    image: {
      width: '100%',
      height: 120,
      borderRadius: 6,
      backgroundColor: colors.surfaceMuted,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    title: {
      flexShrink: 1,
      fontFamily: fonts.sansSemiBold,
      fontSize: 16,
      color: colors.head,
    },
    typeBadge: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 11,
      color: colors.accent,
      backgroundColor: colors.accentLight,
      borderRadius: 4,
      paddingHorizontal: 8,
      paddingVertical: 3,
      overflow: 'hidden',
    },
    meta: {
      fontFamily: fonts.sans,
      fontSize: 12,
      color: colors.textSecondary,
    },
    body: {
      fontFamily: fonts.sans,
      fontSize: 13,
      color: colors.text,
      lineHeight: 18,
    },
    crossBlock: { gap: 4, marginTop: 4 },
    crossTitle: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 13,
      color: colors.accent,
    },
    empty: {
      fontFamily: fonts.sans,
      fontSize: 12,
      color: colors.textMuted,
    },
  });
}
