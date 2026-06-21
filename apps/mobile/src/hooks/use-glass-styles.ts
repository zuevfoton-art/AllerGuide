import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
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
      fontFamily: fonts.sansBold,
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
    },
    sectionLink: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 13,
      fontWeight: '600',
      color: colors.accent,
    },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 6,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    pillText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 13,
      fontWeight: '600',
      color: colors.text,
    },
    pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    feedRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    feedIcon: {
      width: 36,
      height: 36,
      borderRadius: 6,
      backgroundColor: colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    feedBody: { flex: 1, gap: 2 },
    feedTitle: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    feedSub: {
      fontFamily: fonts.sans,
      fontSize: 12,
      color: colors.textMuted,
    },
    addBtn: {
      width: 36,
      height: 36,
      borderRadius: 6,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.borderInput,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryBtn: {
      backgroundColor: colors.accent,
      padding: 14,
      borderRadius: 6,
      alignItems: 'center',
      minHeight: 44,
    },
    primaryBtnText: {
      fontFamily: fonts.sansSemiBold,
      color: colors.onAccent,
      fontWeight: '600',
      fontSize: 15,
    },
    toggleRow: {
      flexDirection: 'row',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 6,
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
      borderRightWidth: 1,
      borderRightColor: colors.border,
    },
    toggleActive: { backgroundColor: colors.accent },
    toggleText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 13,
      fontWeight: '600',
      color: colors.textMuted,
    },
    toggleTextActive: { color: colors.onAccent, fontWeight: '600' },
    disclaimer: {
      fontFamily: fonts.sans,
      fontSize: 11,
      color: colors.textMuted,
      textAlign: 'center',
      lineHeight: 16,
    },
    sectionLabel: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 11,
      fontWeight: '600',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.7,
    },
    secondaryBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: colors.card,
      padding: 13,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.borderInput,
      minHeight: 44,
    },
    secondaryBtnText: {
      fontFamily: fonts.sansSemiBold,
      color: colors.text,
      fontWeight: '600',
      fontSize: 14,
    },
    cardHead: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    cardTitle: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    docLabel: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 11,
      fontWeight: '600',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    docTitle: {
      fontFamily: fonts.serifBold,
      fontSize: 26,
      fontWeight: '700',
      color: colors.head,
      letterSpacing: -0.3,
    },
    docMeta: {
      fontFamily: fonts.sans,
      fontSize: 13,
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
      fontSize: 13,
      color: colors.textSecondary,
      flex: 1,
    },
    kpiValue: {
      fontFamily: fonts.sansBold,
      fontSize: 13,
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
      fontSize: 36,
      fontWeight: '700',
      color: colors.head,
      fontVariant: ['tabular-nums'],
      lineHeight: 40,
    },
    heroKpiSub: {
      fontFamily: fonts.sans,
      fontSize: 14,
      color: colors.textMuted,
    },
    badge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 4,
      borderWidth: 1,
      overflow: 'hidden',
    },
    badgeText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 11,
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
