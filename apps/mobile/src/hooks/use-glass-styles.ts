import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { density, radii, space } from '@/src/constants/layout';
import { fontSizes } from '@/src/constants/typography';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';

export function useUiStyles() {
  const theme = useTheme();
  return useMemo(() => createUiStyles(theme), [theme]);
}

/** @deprecated Use useUiStyles */
export const useGlassStyles = useUiStyles;

function createUiStyles({ colors, shadows, fonts }: AppTheme) {
  return StyleSheet.create({
    sectionHead: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    sectionTitle: {
      fontFamily: fonts.serif,
      fontSize: fontSizes.h3,
      fontWeight: '600',
      color: colors.head,
    },
    sectionLink: {
      fontFamily: fonts.sansSemiBold,
      fontSize: fontSizes.bodySm,
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
      fontSize: fontSizes.bodySm,
      fontWeight: '600',
      color: colors.text,
    },
    pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
    feedRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[3],
      paddingHorizontal: space[4],
      paddingVertical: 14,
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
      fontSize: fontSizes.bodySm + 1,
      fontWeight: '600',
      color: colors.text,
    },
    feedSub: {
      fontFamily: fonts.sans,
      fontSize: fontSizes.label,
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
      fontSize: fontSizes.body,
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
      fontSize: fontSizes.bodySm,
      fontWeight: '600',
      color: colors.textMuted,
    },
    toggleTextActive: { color: colors.onAccent, fontWeight: '600' },
    disclaimer: {
      fontFamily: fonts.sans,
      fontSize: fontSizes.caption,
      color: colors.textMuted,
      textAlign: 'center',
      lineHeight: 16,
    },
    sectionLabel: {
      fontFamily: fonts.sansSemiBold,
      fontSize: fontSizes.caption,
      fontWeight: '600',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.12,
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
      fontSize: fontSizes.bodySm + 1,
    },
    cardHead: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    cardTitle: {
      fontFamily: fonts.sansSemiBold,
      fontSize: fontSizes.label,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    docLabel: {
      fontFamily: fonts.sansSemiBold,
      fontSize: fontSizes.caption,
      fontWeight: '600',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.08,
    },
    docTitle: {
      fontFamily: fonts.serifBold,
      fontSize: fontSizes.h1,
      fontWeight: '700',
      color: colors.head,
      letterSpacing: -0.3,
    },
    docMeta: {
      fontFamily: fonts.sans,
      fontSize: fontSizes.bodySm,
      color: colors.textSecondary,
    },
    kpiRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    kpiLabel: {
      fontFamily: fonts.sans,
      fontSize: fontSizes.bodySm,
      color: colors.textSecondary,
      flex: 1,
    },
    kpiValue: {
      fontFamily: fonts.sansBold,
      fontSize: fontSizes.bodySm,
      fontWeight: '700',
      color: colors.head,
      fontVariant: ['tabular-nums'],
    },
    heroKpi: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      paddingBottom: 12,
      marginBottom: 4,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    heroKpiNum: {
      fontFamily: fonts.sansBold,
      fontSize: fontSizes.kpi,
      fontWeight: '700',
      color: colors.head,
      fontVariant: ['tabular-nums'],
      lineHeight: 40,
    },
    heroKpiSub: {
      fontFamily: fonts.sans,
      fontSize: fontSizes.bodySm + 1,
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
      fontSize: fontSizes.caption,
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
