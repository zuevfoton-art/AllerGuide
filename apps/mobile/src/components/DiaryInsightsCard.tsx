import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';
import { computeDiaryInsights } from '@allerguide/core';
import type { DiaryEntry, DiaryInsights } from '@allerguide/core';
import { GlassCard } from './GlassCard';
import { DiaryTrendChart, type DiaryTrendPoint } from './diary/DiaryTrendChart';
import { DiaryCalendarHeatmap, type DiaryHeatmapDay } from './diary/DiaryCalendarHeatmap';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';
import { localizeDiaryType } from '@/src/i18n/content';
import { fontSizes } from '@/src/constants/typography';
import { radii, space } from '@/src/constants/layout';

interface Props {
  entries: DiaryEntry[];
}

const CHART_H = 72;
const LABEL_H = 20;
const BAR_GAP = 5;
const PAD = 4;

function daySeverity(day: DiaryInsights['days'][number]): number {
  if (!day.hasSymptoms) return day.count > 0 ? 1 : 0;
  if (day.count >= 2 || (day.hasTrigger && day.hasFood)) return 3;
  if (day.hasTrigger || day.hasFood) return 2;
  return 1;
}

function buildTrendPoints(insights: DiaryInsights): DiaryTrendPoint[] {
  return insights.days.map((day) => ({
    date: day.iso,
    severity: daySeverity(day),
  }));
}

function buildHeatmapDays(insights: DiaryInsights): DiaryHeatmapDay[] {
  return insights.days.map((day) => ({
    date: day.iso,
    severity: daySeverity(day),
  }));
}

export function DiaryInsightsCard({ entries }: Props) {
  const theme = useTheme();
  const { colors } = theme;
  const { t, locale, content } = useTranslation();
  const localeContent = content();
  const [chartWidth, setChartWidth] = useState(300);

  const insights = useMemo(() => computeDiaryInsights(entries), [entries]);

  const dayLabels = useMemo(() => {
    return insights.days.map((day) => {
      const d = new Date(day.iso + 'T12:00:00');
      try {
        return new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(d).slice(0, 2);
      } catch {
        return day.iso.slice(8, 10);
      }
    });
  }, [insights.days, locale]);

  const maxCount = Math.max(...insights.days.map((d) => d.count), 1);
  const barWidth = Math.floor((chartWidth - 2 * PAD - BAR_GAP * 6) / 7);
  const trendPoints = useMemo(() => buildTrendPoints(insights), [insights]);
  const heatmapDays = useMemo(() => buildHeatmapDays(insights), [insights]);

  const correlationText = useMemo(() => {
    const kind = insights.temporalCorrelationKind ?? insights.correlationKind;
    const count = insights.temporalCorrelationKind
      ? insights.temporalCorrelationCount
      : insights.correlationCount;
    const of = insights.temporalCorrelationKind
      ? insights.temporalCorrelationOf
      : insights.correlationOf;
    if (!kind || of < 2) return null;
    const n = String(count);
    const total = String(of);
    const temporal = Boolean(insights.temporalCorrelationKind);
    if (kind === 'symptom-food') {
      return temporal
        ? t('diary.insightsTemporalCorSymFood', { n, of: total })
        : t('diary.insightsCorSymFood', { n, of: total });
    }
    if (kind === 'symptom-trigger') {
      return temporal
        ? t('diary.insightsTemporalCorSymTrig', { n, of: total })
        : t('diary.insightsCorSymTrig', { n, of: total });
    }
    if (kind === 'symptom-meds') {
      return temporal
        ? t('diary.insightsTemporalCorSymMeds', { n, of: total })
        : t('diary.insightsCorSymMeds', { n, of: total });
    }
    return null;
  }, [insights, t]);

  const anomalyText = useMemo(() => {
    if (insights.anomalyKind !== 'symptoms-without-trigger') return null;
    return t('diary.insightsAnomalySymptomsNoTrigger', { days: String(insights.anomalyDays) });
  }, [insights, t]);

  const styles = useMemo(() => createStyles(theme), [theme]);

  if (entries.length === 0) return null;

  return (
    <GlassCard variant="calm" style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('diary.insights')}</Text>
        {insights.streak > 1 && (
          <View style={styles.streakBadge}>
            <Text style={styles.streakText}>
              {'🔥 ' + t('diary.insightsStreak', { n: String(insights.streak) })}
            </Text>
          </View>
        )}
      </View>

      <View
        style={styles.chartWrap}
        onLayout={(e) => setChartWidth(e.nativeEvent.layout.width)}
      >
        <Svg width={chartWidth} height={CHART_H + LABEL_H}>
          {insights.days.map((day, i) => {
            const x = PAD + i * (barWidth + BAR_GAP);
            const barH =
              day.count === 0 ? 4 : Math.max(8, Math.round((day.count / maxCount) * CHART_H));
            const y = CHART_H - barH;
            const fill = day.count === 0 ? colors.border : day.hasSymptoms ? colors.danger : colors.accent;

            return (
              <React.Fragment key={day.iso}>
                <Rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barH}
                  rx={3}
                  fill={fill}
                  opacity={day.count === 0 ? 0.4 : 0.9}
                />
                <SvgText
                  x={x + barWidth / 2}
                  y={CHART_H + LABEL_H - 3}
                  fontSize={10}
                  fill={colors.textSecondary}
                  textAnchor="middle"
                  fontFamily="System"
                >
                  {dayLabels[i] ?? ''}
                </SvgText>
              </React.Fragment>
            );
          })}
        </Svg>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('diary.trendsTitle')}</Text>
        <DiaryTrendChart points={trendPoints} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('diary.insightsCalendar')}</Text>
        <DiaryCalendarHeatmap days={heatmapDays} />
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.accent }]} />
          <Text style={styles.legendLabel}>{t('diary.insightsLegendNormal')}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.danger }]} />
          <Text style={styles.legendLabel}>{t('diary.insightsLegendSym')}</Text>
        </View>
      </View>

      {insights.topTypes.length > 0 && (
        <View style={styles.topSection}>
          <Text style={styles.topTitle}>{t('diary.insightsTop')}</Text>
          <View style={styles.chips}>
            {insights.topTypes.map(({ type, count }) => (
              <View key={type} style={styles.chip}>
                <Text style={styles.chipText}>
                  {localizeDiaryType(type, localeContent)} · {count}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {anomalyText ? (
        <View style={[styles.hintRow, styles.anomalyRow]}>
          <Text style={styles.hintText}>{'⚠️ ' + anomalyText}</Text>
        </View>
      ) : null}

      {correlationText ? (
        <View style={styles.hintRow}>
          <Text style={styles.hintText}>{'💡 ' + correlationText}</Text>
        </View>
      ) : null}
    </GlassCard>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    card: {
      gap: space[3],
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    title: {
      fontFamily: fonts.sansSemiBold,
      fontSize: fontSizes.bodySm,
      fontWeight: '600',
      color: colors.head,
      letterSpacing: 0.3,
      textTransform: 'uppercase',
    },
    streakBadge: {
      backgroundColor: colors.warningLight,
      borderRadius: radii.sm,
      paddingHorizontal: space[2],
      paddingVertical: 2,
    },
    streakText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: fontSizes.caption,
      color: colors.warningText,
      fontWeight: '600',
    },
    chartWrap: {
      height: CHART_H + LABEL_H,
    },
    section: {
      gap: space[2],
    },
    sectionTitle: {
      fontFamily: fonts.sansSemiBold,
      fontSize: fontSizes.caption,
      fontWeight: '600',
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },
    legend: {
      flexDirection: 'row',
      gap: space[4],
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[1],
    },
    legendDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    legendLabel: {
      fontFamily: fonts.sans,
      fontSize: fontSizes.caption,
      color: colors.textSecondary,
    },
    topSection: {
      gap: space[2],
    },
    topTitle: {
      fontFamily: fonts.sansSemiBold,
      fontSize: fontSizes.caption,
      fontWeight: '600',
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },
    chips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: space[2],
    },
    chip: {
      backgroundColor: colors.accentLight,
      borderRadius: radii.sm,
      paddingHorizontal: space[2] + 2,
      paddingVertical: space[1],
    },
    chipText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: fontSizes.label,
      color: colors.accent,
      fontWeight: '600',
    },
    hintRow: {
      backgroundColor: colors.accentLight,
      borderRadius: radii.sm,
      padding: space[3],
    },
    anomalyRow: {
      backgroundColor: colors.warningLight,
    },
    hintText: {
      fontFamily: fonts.sans,
      fontSize: fontSizes.bodySm,
      color: colors.head,
      lineHeight: 18,
    },
  });
}
