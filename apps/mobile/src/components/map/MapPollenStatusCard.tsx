import { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { GlassCard } from '@/src/components/GlassCard';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import type { Zone } from '@/src/hooks/use-zone-colors';
import { useTranslation } from '@/src/store/locale-store';

interface MapPollenStatusCardProps {
  loading: boolean;
  hasSnapshot: boolean;
  zone: Zone | null;
  headlineColor?: string;
  levelColor: string;
  statusHeadline: string;
  profileName?: string;
  profileRelevant: boolean;
  locationLabel: string;
  sourceLabel: string;
  updatedLabel: string | null;
  isCalendarFallback: boolean;
  isCacheSource: boolean;
}

export function MapPollenStatusCard({
  loading,
  hasSnapshot,
  zone,
  headlineColor,
  levelColor,
  statusHeadline,
  profileName,
  profileRelevant,
  locationLabel,
  sourceLabel,
  updatedLabel,
  isCalendarFallback,
  isCacheSource,
}: MapPollenStatusCardProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();

  return (
    <GlassCard testID="map-status" zone={zone} style={styles.statusCard}>
      <View style={styles.statusTop}>
        {loading && !hasSnapshot ? (
          <ActivityIndicator color={theme.colors.accent} />
        ) : (
          <View style={[styles.statusDot, { backgroundColor: levelColor }]} />
        )}
        <Text
          style={[
            styles.statusHeadline,
            headlineColor ? { color: headlineColor } : null,
          ]}>
          {statusHeadline}
        </Text>
      </View>
      {profileRelevant && profileName ? (
        <Text style={styles.statusMeta}>
          {t('map.statusForProfile', { name: profileName })} · {t('map.pollenYou')}
        </Text>
      ) : null}
      <Text style={styles.statusMeta}>
        {[locationLabel, sourceLabel, updatedLabel].filter(Boolean).join(' · ')}
      </Text>
      {isCalendarFallback ? (
        <Text style={styles.statusBadge}>{t('map.pollenCalendarFallback')}</Text>
      ) : null}
      {isCacheSource ? (
        <Text style={styles.statusBadge}>{t('map.pollenSourceCache')}</Text>
      ) : null}
    </GlassCard>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    statusCard: {
      gap: 6,
    },
    statusTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    statusDot: { width: 12, height: 12, borderRadius: 6 },
    statusHeadline: {
      flex: 1,
      fontFamily: fonts.sansBold,
      fontSize: 17,
      fontWeight: '700',
      color: colors.text,
    },
    statusMeta: {
      fontFamily: fonts.sans,
      fontSize: 12,
      color: colors.textSecondary,
      lineHeight: 16,
    },
    statusBadge: {
      alignSelf: 'flex-start',
      fontFamily: fonts.sansSemiBold,
      fontSize: 11,
      fontWeight: '600',
      color: colors.warningText,
      backgroundColor: colors.warningLight,
      borderRadius: 4,
      paddingHorizontal: 8,
      paddingVertical: 3,
      overflow: 'hidden',
    },
  });
}
