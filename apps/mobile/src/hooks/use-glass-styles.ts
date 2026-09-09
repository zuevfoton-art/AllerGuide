import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { density, radii, space } from '@/src/constants/layout';
import { fontSizes, lineHeights, textStyles, tracking } from '@/src/constants/typography';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTextScaleMultiplier } from '@/src/store/appearance-store';

export function useUiStyles() {
  const theme = useTheme();
  const scale = useTextScaleMultiplier();
  return useMemo(() => createUiStyles(theme, scale), [theme, scale]);
}

/** @deprecated Use useUiStyles */
export const useGlassStyles = useUiStyles;

function createUiStyles({ colors, shadows, fonts }: AppTheme, scale: number) {
  const fs = (key: keyof typeof fontSizes) => Math.round(fontSizes[key] * scale);
  const lh = (key: keyof typeof lineHeights) => Math.round(lineHeights[key] * scale);
  const ts = (key: keyof typeof textStyles) => ({
    ...textStyles[key],
    fontSize: Math.round(textStyles[key].fontSize * scale),
    lineHeight: Math.round(textStyles[key].lineHeight * scale),
  });

  return StyleSheet.create({
    sectionHead: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    sectionTitle: {
      ...ts('h3'),
      fontWeight: '600',
      color: colors.head,
    },
    sectionLink: {
      fontFamily: fonts.sansSemiBold,
      fontSize: fs('bodySm'),
      lineHeight: lh('bodySm'),
      fontWeight: '600',
      color: colors.accent,
    },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[2] - 2,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: radii.sm,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    pillText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: fs('bodySm'),
      lineHeight: lh('bodySm'),
      fontWeight: '600',
      color: colors.text,
    },
    pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
    feedRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[3],
      paddingHorizontal: space[4],
      paddingVertical: density.listRowPaddingV,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    feedIcon: {
      width: 36,
      height: 36,
      borderRadius: radii.sm,
      backgroundColor: colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    feedBody: { flex: 1, gap: 2 },
    feedTitle: {
      fontFamily: fonts.sansSemiBold,
      fontSize: fs('bodyMd'),
      lineHeight: lh('bodyMd'),
      fontWeight: '600',
      color: colors.text,
    },
    feedSub: {
      ...ts('label'),
      fontFamily: fonts.sans,
      letterSpacing: tracking.normal,
      color: colors.textMuted,
    },
    addBtn: {
      width: 36,
      height: 36,
      borderRadius: radii.sm,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.borderInput,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryBtn: {
      backgroundColor: colors.accent,
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: radii.full,
      alignItems: 'center',
      minHeight: density.tapMinHeight,
    },
    primaryBtnText: {
      fontFamily: fonts.sansSemiBold,
      color: colors.onAccent,
      fontWeight: '600',
      fontSize: fs('body'),
      lineHeight: lh('body'),
    },
    toggleRow: {
      flexDirection: 'row',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.full,
      overflow: 'hidden',
      backgroundColor: colors.card,
    },
    toggle: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 11,
      paddingHorizontal: 12,
      borderRightWidth: 1,
      borderRightColor: colors.border,
    },
    toggleActive: { backgroundColor: colors.accent },
    toggleText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: fs('bodySm'),
      lineHeight: lh('bodySm'),
      fontWeight: '600',
      color: colors.textMuted,
    },
    toggleTextActive: { color: colors.onAccent, fontWeight: '600' },
    disclaimer: {
      ...ts('caption'),
      color: colors.textMuted,
      textAlign: 'center',
    },
    sectionLabel: {
      fontFamily: fonts.sansSemiBold,
      fontSize: fs('caption'),
      lineHeight: lh('caption'),
      fontWeight: '600',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: tracking.label,
    },
    secondaryBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: space[2] - 2,
      backgroundColor: colors.card,
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: radii.full,
      borderWidth: 1,
      borderColor: colors.borderInput,
      minHeight: density.tapMinHeight,
    },
    secondaryBtnText: {
      fontFamily: fonts.sansSemiBold,
      color: colors.text,
      fontWeight: '600',
      fontSize: fs('bodyMd'),
      lineHeight: lh('bodyMd'),
    },
    cardHead: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    /** @deprecated Use microLabel — cardTitle is a 12px caption, not a card H2. */
    cardTitle: {
      fontFamily: fonts.sansSemiBold,
      fontSize: fs('label'),
      lineHeight: lh('label'),
      fontWeight: '600',
      color: colors.textSecondary,
    },
    microLabel: {
      fontFamily: fonts.sansSemiBold,
      fontSize: fs('label'),
      lineHeight: lh('label'),
      fontWeight: '600',
      color: colors.textSecondary,
    },
    docLabel: {
      fontFamily: fonts.sansSemiBold,
      fontSize: fs('caption'),
      lineHeight: lh('caption'),
      fontWeight: '600',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: tracking.label,
    },
    docTitle: {
      ...ts('h1'),
      fontWeight: '700',
      color: colors.head,
    },
    docMeta: {
      ...ts('bodySm'),
      color: colors.textSecondary,
    },
    kpiRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: density.kpiRowPaddingV,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    kpiLabel: {
      ...ts('bodySm'),
      color: colors.textSecondary,
      flex: 1,
    },
    kpiValue: {
      fontFamily: fonts.sansBold,
      fontSize: fs('bodySm'),
      lineHeight: lh('bodySm'),
      fontWeight: '700',
      color: colors.head,
      fontVariant: ['tabular-nums'],
    },
    heroKpi: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      paddingBottom: 10,
      marginBottom: 4,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    heroKpiNum: {
      ...ts('kpi'),
      fontWeight: '700',
      color: colors.head,
      fontVariant: ['tabular-nums'],
    },
    heroKpiSub: {
      ...ts('bodyMd'),
      fontFamily: fonts.sans,
      color: colors.textMuted,
    },
    badge: {
      paddingHorizontal: space[2],
      paddingVertical: 3,
      borderRadius: radii.sm,
      borderWidth: 1,
      overflow: 'hidden',
    },
    badgeText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: fs('caption'),
      lineHeight: lh('caption'),
      fontWeight: '600',
    },
  });
}

export function badgeStyle(
  kind: 'ok' | 'warn' | 'danger',
  { colors }: AppTheme,
): { container: object; text: object } {
  if (kind === 'ok') {
    return {
      container: { backgroundColor: colors.successLight, borderColor: colors.successBorder },
      text: { color: colors.success },
    };
  }
  if (kind === 'danger') {
    return {
      container: { backgroundColor: colors.dangerLight, borderColor: colors.dangerBorder },
      text: { color: colors.danger },
    };
  }
  return {
    container: { backgroundColor: colors.warningLight, borderColor: colors.warningBorder },
    text: { color: colors.warning },
  };
}
